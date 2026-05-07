import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("APPENEscrow", function () {
  // ─── Fixture ────────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [admin, seller, buyer, resolver, stranger] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, admin.address);

    // Deploy APPENEscrow
    const APPENEscrow = await ethers.getContractFactory("APPENEscrow");
    const escrow = await APPENEscrow.deploy(admin.address);

    // Setup roles and whitelist
    const RESOLVER_ROLE = await escrow.RESOLVER_ROLE();
    const DEFAULT_ADMIN_ROLE = await escrow.DEFAULT_ADMIN_ROLE();
    await escrow.connect(admin).addWhitelistedToken(await usdc.getAddress());
    await escrow.connect(admin).grantRole(RESOLVER_ROLE, resolver.address);

    // Mint and approve tokens for seller
    const amount = ethers.parseUnits("100", 6);
    await usdc.connect(admin).mint(seller.address, amount * 10n);
    await usdc.connect(seller).approve(await escrow.getAddress(), amount * 10n);

    const challengeWindow = 1800; // 30 min

    return {
      escrow,
      usdc,
      admin,
      seller,
      buyer,
      resolver,
      stranger,
      amount,
      challengeWindow,
      RESOLVER_ROLE,
      DEFAULT_ADMIN_ROLE,
    };
  }

  // ─── Helper: create a funded escrow and return tradeId ──────────────────────

  async function createTrade(fixture: Awaited<ReturnType<typeof deployFixture>>) {
    const { escrow, usdc, seller, buyer, amount, challengeWindow } = fixture;
    const tx = await escrow
      .connect(seller)
      .createEscrow(await usdc.getAddress(), amount, buyer.address, challengeWindow);
    const receipt = await tx.wait();
    const event = receipt?.logs.find((l: any) => {
      try {
        return escrow.interface.parseLog(l)?.name === "EscrowCreated";
      } catch {
        return false;
      }
    });
    const parsed = escrow.interface.parseLog(event!);
    return parsed!.args[0] as string; // tradeId
  }

  // ─── 7.1 Happy paths ────────────────────────────────────────────────────────

  describe("7.1 Happy paths", function () {
    it("createEscrow: locks tokens and emits EscrowCreated + StateMachineTransition", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, seller, buyer, amount, challengeWindow } = fixture;

      const escrowAddr = await escrow.getAddress();
      const usdcAddr = await usdc.getAddress();
      const sellerBalBefore = await usdc.balanceOf(seller.address);

      await expect(
        escrow.connect(seller).createEscrow(usdcAddr, amount, buyer.address, challengeWindow)
      )
        .to.emit(escrow, "EscrowCreated")
        .and.to.emit(escrow, "StateMachineTransition");

      // Tokens moved from seller to contract
      expect(await usdc.balanceOf(escrowAddr)).to.equal(amount);
      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalBefore - amount);

      // Trade count incremented
      expect(await escrow.tradeCount()).to.equal(1);
    });

    it("createEscrow: trade is immediately in Funded state", async function () {
      const fixture = await loadFixture(deployFixture);
      const tradeId = await createTrade(fixture);
      // TradeState.Funded == 1
      expect(await fixture.escrow.getTradeState(tradeId)).to.equal(1);
    });

    it("markPaid: transitions Funded → MarkedPaid and emits event", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(buyer).markPaid(tradeId))
        .to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 1 /* Funded */, 2 /* MarkedPaid */, buyer.address);

      // TradeState.MarkedPaid == 2
      expect(await escrow.getTradeState(tradeId)).to.equal(2);
    });

    it("release: challenge window expired → permissionless auto-release to buyer", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, buyer, stranger, challengeWindow, amount } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Advance past challenge window
      await time.increase(challengeWindow + 1);

      const buyerBalBefore = await usdc.balanceOf(buyer.address);

      await expect(escrow.connect(stranger).release(tradeId))
        .to.emit(escrow, "FundsReleased")
        .withArgs(tradeId, buyer.address, amount)
        .and.to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 2 /* MarkedPaid */, 5 /* Released */, stranger.address);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalBefore + amount);
      // TradeState.Released == 5
      expect(await escrow.getTradeState(tradeId)).to.equal(5);
    });

    it("dispute path: MarkedPaid → Disputed → Released by resolver", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, buyer, seller, resolver, amount } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);

      // TradeState.Disputed == 4
      expect(await escrow.getTradeState(tradeId)).to.equal(4);

      const buyerBalBefore = await usdc.balanceOf(buyer.address);

      await expect(escrow.connect(resolver).release(tradeId))
        .to.emit(escrow, "FundsReleased")
        .withArgs(tradeId, buyer.address, amount);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalBefore + amount);
      expect(await escrow.getTradeState(tradeId)).to.equal(5 /* Released */);
    });

    it("refund path: Disputed → Refunded by resolver, tokens returned to seller", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, buyer, seller, resolver, amount } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);

      const sellerBalBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(resolver).refund(tradeId))
        .to.emit(escrow, "FundsRefunded")
        .withArgs(tradeId, seller.address, amount)
        .and.to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 4 /* Disputed */, 6 /* Refunded */, resolver.address);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalBefore + amount);
      // TradeState.Refunded == 6
      expect(await escrow.getTradeState(tradeId)).to.equal(6);
    });

    it("cancel path: Funded → Cancelled, tokens returned to seller", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, seller, amount } = fixture;
      const tradeId = await createTrade(fixture);

      const sellerBalBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(seller).cancel(tradeId))
        .to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 1 /* Funded */, 7 /* Cancelled */, seller.address);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalBefore + amount);
      // TradeState.Cancelled == 7
      expect(await escrow.getTradeState(tradeId)).to.equal(7);
    });
  });

  // ─── 7.2 Invalid state transitions ──────────────────────────────────────────

  describe("7.2 Invalid state transitions", function () {
    it("markPaid reverts with InvalidState if not Funded (e.g. already MarkedPaid)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Second markPaid should revert — state is now MarkedPaid, not Funded
      await expect(escrow.connect(buyer).markPaid(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState")
        .withArgs(tradeId, 2 /* MarkedPaid */, 1 /* Funded */);
    });

    it("dispute reverts with InvalidState if not MarkedPaid (e.g. Funded)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(seller).dispute(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState")
        .withArgs(tradeId, 1 /* Funded */, 2 /* MarkedPaid */);
    });

    it("release reverts with InvalidState if not MarkedPaid/UnderReview/Disputed (e.g. Funded)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, resolver } = fixture;
      const tradeId = await createTrade(fixture);

      // Funded state — resolver cannot release
      await expect(escrow.connect(resolver).release(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("release reverts with InvalidState after already Released", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, seller, resolver, challengeWindow } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);
      await escrow.connect(resolver).release(tradeId);

      // Already Released — cannot release again
      await expect(escrow.connect(resolver).release(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("cancel reverts with InvalidState if not Funded (e.g. MarkedPaid)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      await expect(escrow.connect(seller).cancel(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState")
        .withArgs(tradeId, 2 /* MarkedPaid */, 1 /* Funded */);
    });

    it("refund reverts with InvalidState if not Disputed/UnderReview (e.g. Funded)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, resolver } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(resolver).refund(tradeId))
        .to.be.revertedWithCustomError(escrow, "InvalidState");
    });
  });

  // ─── 7.3 Role restrictions ───────────────────────────────────────────────────

  describe("7.3 Role restrictions", function () {
    it("addWhitelistedToken reverts for non-admin", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, stranger } = fixture;

      await expect(
        escrow.connect(stranger).addWhitelistedToken(ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("pause reverts for non-admin", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, stranger } = fixture;

      await expect(escrow.connect(stranger).pause()).to.be.reverted;
    });

    it("unpause reverts for non-admin", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, stranger } = fixture;

      await escrow.connect(admin).pause();
      await expect(escrow.connect(stranger).unpause()).to.be.reverted;
    });

    it("release reverts for non-resolver when challenge window is still active", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, stranger } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Window still active — stranger is not a resolver
      await expect(escrow.connect(stranger).release(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(stranger.address);
    });

    it("refund reverts for non-resolver", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, seller, stranger } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);

      await expect(escrow.connect(stranger).refund(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(stranger.address);
    });

    it("markPaid reverts for non-buyer (seller tries)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(seller).markPaid(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(seller.address);
    });

    it("markPaid reverts for non-buyer (stranger tries)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, stranger } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(stranger).markPaid(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(stranger.address);
    });

    it("dispute reverts for non-seller (buyer tries)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      await expect(escrow.connect(buyer).dispute(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(buyer.address);
    });

    it("cancel reverts for non-seller (buyer tries)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await expect(escrow.connect(buyer).cancel(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(buyer.address);
    });

    it("refundExpired reverts for non-seller", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await time.increase(24 * 3600 + 1);

      await expect(escrow.connect(buyer).refundExpired(tradeId))
        .to.be.revertedWithCustomError(escrow, "Unauthorized")
        .withArgs(buyer.address);
    });

    it("resolver with ConflictOfInterest cannot release their own trade", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer, seller, RESOLVER_ROLE, challengeWindow } = fixture;

      // Grant seller the resolver role — creates a conflict
      await escrow.connect(admin).grantRole(RESOLVER_ROLE, seller.address);

      const tradeId = await createTrade(fixture);
      await escrow.connect(buyer).markPaid(tradeId);
      await time.increase(challengeWindow + 1);

      await expect(escrow.connect(seller).release(tradeId))
        .to.be.revertedWithCustomError(escrow, "ConflictOfInterest");
    });
  });

  // ─── 7.4 Timeouts ───────────────────────────────────────────────────────────

  describe("7.4 Timeouts", function () {
    it("refundExpired: reverts before 24h with FundedTimeoutNotReached", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, seller } = fixture;
      const tradeId = await createTrade(fixture);

      // Only 12 hours have passed
      await time.increase(12 * 3600);

      await expect(escrow.connect(seller).refundExpired(tradeId))
        .to.be.revertedWithCustomError(escrow, "FundedTimeoutNotReached");
    });

    it("refundExpired: succeeds after 24h, returns tokens to seller", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, seller, amount } = fixture;
      const tradeId = await createTrade(fixture);

      await time.increase(24 * 3600 + 1);

      const sellerBalBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(seller).refundExpired(tradeId))
        .to.emit(escrow, "FundsRefunded")
        .withArgs(tradeId, seller.address, amount)
        .and.to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 1 /* Funded */, 6 /* Refunded */, seller.address);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBalBefore + amount);
      expect(await escrow.getTradeState(tradeId)).to.equal(6 /* Refunded */);
    });

    it("dispute: reverts with ChallengeWindowExpired after challenge window has passed", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, seller, challengeWindow } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Advance past the challenge window
      await time.increase(challengeWindow + 1);

      await expect(escrow.connect(seller).dispute(tradeId))
        .to.be.revertedWithCustomError(escrow, "ChallengeWindowExpired");
    });

    it("dispute: succeeds within challenge window", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, seller, challengeWindow } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Advance to just before expiry
      await time.increase(challengeWindow - 10);

      await expect(escrow.connect(seller).dispute(tradeId))
        .to.emit(escrow, "StateMachineTransition")
        .withArgs(tradeId, 2 /* MarkedPaid */, 4 /* Disputed */, seller.address);
    });

    it("release: succeeds after challenge window expired (permissionless)", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, buyer, stranger, challengeWindow, amount } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await time.increase(challengeWindow + 1);

      const buyerBalBefore = await usdc.balanceOf(buyer.address);
      await escrow.connect(stranger).release(tradeId);
      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBalBefore + amount);
    });

    it("resolver release of MarkedPaid reverts with ChallengeWindowActive if window still open", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, buyer, resolver } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);

      // Window still active
      await expect(escrow.connect(resolver).release(tradeId))
        .to.be.revertedWithCustomError(escrow, "ChallengeWindowActive");
    });
  });

  // ─── 7.5 Paused contract ────────────────────────────────────────────────────

  describe("7.5 Paused contract", function () {
    it("createEscrow reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, admin, seller, buyer, amount, challengeWindow } = fixture;

      await escrow.connect(admin).pause();

      await expect(
        escrow
          .connect(seller)
          .createEscrow(await usdc.getAddress(), amount, buyer.address, challengeWindow)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("markPaid reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(admin).pause();

      await expect(escrow.connect(buyer).markPaid(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("dispute reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(admin).pause();

      await expect(escrow.connect(seller).dispute(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("release reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer, seller, resolver } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);
      await escrow.connect(admin).pause();

      await expect(escrow.connect(resolver).release(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("refund reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer, seller, resolver } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(buyer).markPaid(tradeId);
      await escrow.connect(seller).dispute(tradeId);
      await escrow.connect(admin).pause();

      await expect(escrow.connect(resolver).refund(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("cancel reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(admin).pause();

      await expect(escrow.connect(seller).cancel(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("refundExpired reverts when paused", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, seller } = fixture;
      const tradeId = await createTrade(fixture);

      await time.increase(24 * 3600 + 1);
      await escrow.connect(admin).pause();

      await expect(escrow.connect(seller).refundExpired(tradeId)).to.be.revertedWithCustomError(
        escrow,
        "EnforcedPause"
      );
    });

    it("unpause restores functionality", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, buyer } = fixture;
      const tradeId = await createTrade(fixture);

      await escrow.connect(admin).pause();
      await escrow.connect(admin).unpause();

      // Should succeed after unpause
      await expect(escrow.connect(buyer).markPaid(tradeId)).to.emit(
        escrow,
        "StateMachineTransition"
      );
    });
  });

  // ─── 7.6 Token whitelist + ETH rejection ────────────────────────────────────

  describe("7.6 Token whitelist + ETH rejection", function () {
    it("createEscrow reverts for non-whitelisted token with TokenNotWhitelisted", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin, seller, buyer, amount, challengeWindow } = fixture;

      // Deploy a second token but do NOT whitelist it
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const usdt = await MockERC20.deploy("Tether", "USDT", 6, admin.address);
      const usdtAddr = await usdt.getAddress();

      await usdt.connect(admin).mint(seller.address, amount);
      await usdt.connect(seller).approve(await escrow.getAddress(), amount);

      await expect(
        escrow.connect(seller).createEscrow(usdtAddr, amount, buyer.address, challengeWindow)
      )
        .to.be.revertedWithCustomError(escrow, "TokenNotWhitelisted")
        .withArgs(usdtAddr);
    });

    it("createEscrow reverts for zero amount with ZeroAmount", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc, seller, buyer, challengeWindow } = fixture;

      await expect(
        escrow.connect(seller).createEscrow(await usdc.getAddress(), 0, buyer.address, challengeWindow)
      ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });

    it("whitelistedTokens mapping returns true for whitelisted token", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, usdc } = fixture;

      expect(await escrow.whitelistedTokens(await usdc.getAddress())).to.be.true;
    });

    it("whitelistedTokens mapping returns false for non-whitelisted token", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow } = fixture;

      expect(await escrow.whitelistedTokens(ethers.ZeroAddress)).to.be.false;
    });

    it("receive() reverts ETH transfers", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, stranger } = fixture;

      await expect(
        stranger.sendTransaction({
          to: await escrow.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("addWhitelistedToken: admin can whitelist a new token", async function () {
      const fixture = await loadFixture(deployFixture);
      const { escrow, admin } = fixture;

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("New Token", "NTK", 18, admin.address);
      const newTokenAddr = await newToken.getAddress();

      await escrow.connect(admin).addWhitelistedToken(newTokenAddr);
      expect(await escrow.whitelistedTokens(newTokenAddr)).to.be.true;
    });
  });
});
