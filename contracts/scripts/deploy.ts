import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Network:", network.name);

  // 1. Deploy MockERC20 USDC
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("USDC deployed to:", usdcAddress);

  // 2. Deploy MockERC20 USDT
  const usdt = await MockERC20.deploy("Tether USD", "USDT", 6, deployer.address);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("USDT deployed to:", usdtAddress);

  // 3. Deploy APPENEscrow with deployer as admin
  const APPENEscrow = await ethers.getContractFactory("APPENEscrow");
  const escrow = await APPENEscrow.deploy(deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("APPENEscrow deployed to:", escrowAddress);

  // 4. Whitelist USDC and USDT
  await (escrow as any).whitelistToken(usdcAddress, true);
  console.log("USDC whitelisted");
  await (escrow as any).whitelistToken(usdtAddress, true);
  console.log("USDT whitelisted");

  // 5. Mint 1,000,000 of each to deployer (6 decimals)
  const mintAmount = ethers.parseUnits("1000000", 6);
  await (usdc as any).mint(deployer.address, mintAmount);
  console.log("Minted 1,000,000 USDC to deployer");
  await (usdt as any).mint(deployer.address, mintAmount);
  console.log("Minted 1,000,000 USDT to deployer");

  // 6. Save addresses to deployments/{network}.json
  const deployments = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      USDC: usdcAddress,
      USDT: usdtAddress,
      APPENEscrow: escrowAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\nDeployment addresses saved to deployments/${network.name}.json`);

  console.log("\n=== Deployment Summary ===");
  console.log("USDC:        ", usdcAddress);
  console.log("USDT:        ", usdtAddress);
  console.log("APPENEscrow: ", escrowAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
