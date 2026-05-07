// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title APPENEscrow
 * @author APPEN Protocol
 * @notice Non-custodial P2P fiat-to-stablecoin escrow with AI-assisted proof-of-payment
 *         and structured dispute resolution.
 *
 * @dev State machine:
 *   Created  → (skipped; seller creates AND funds in one tx)
 *   Funded   → MarkedPaid  (buyer calls markPaid)
 *   Funded   → Cancelled   (seller cancels before buyer marks paid)
 *   Funded   → Refunded    (seller triggers 24h timeout via refundExpired)
 *   MarkedPaid → Disputed  (seller disputes within challenge window)
 *   MarkedPaid → Released  (challenge window expires, or resolver releases)
 *   MarkedPaid → UnderReview (platform routes low-confidence OCR)
 *   UnderReview → Released (resolver decision)
 *   UnderReview → Refunded (resolver decision)
 *   Disputed → Released    (resolver decision)
 *   Disputed → Refunded    (resolver decision)
 */
contract APPENEscrow is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Role that can call release() and refund() as a human resolver.
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    // ─── Enums ────────────────────────────────────────────────────────────────

    /**
     * @notice Full lifecycle states for an escrow trade.
     * @dev Created is reserved for future use; createEscrow() sets state to Funded directly.
     */
    enum TradeState {
        Created,
        Funded,
        MarkedPaid,
        UnderReview,
        Disputed,
        Released,
        Refunded,
        Cancelled
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    /**
     * @notice All data associated with a single escrow trade.
     * @param seller              Address that created and funded the escrow.
     * @param buyer               Address that will receive funds upon release.
     * @param resolver            Address of the assigned human resolver (set off-chain).
     * @param stablecoin          ERC-20 token address locked in escrow.
     * @param amount              Token amount locked (in token's native decimals).
     * @param state               Current lifecycle state.
     * @param createdAt           Block timestamp when the escrow was created.
     * @param markedPaidAt        Block timestamp when buyer called markPaid (0 if not yet).
     * @param challengeWindowSeconds  Duration (seconds) the seller has to dispute after markPaid.
     * @param challengeExpiresAt  Absolute timestamp when the challenge window closes.
     */
    struct EscrowTrade {
        address seller;
        address buyer;
        address resolver;
        address stablecoin;
        uint256 amount;
        TradeState state;
        uint256 createdAt;
        uint256 markedPaidAt;
        uint256 challengeWindowSeconds;
        uint256 challengeExpiresAt;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Lookup a trade by its unique ID.
    mapping(bytes32 => EscrowTrade) public trades;

    /// @notice Tokens approved for use in escrow.
    mapping(address => bool) public whitelistedTokens;

    /// @notice Ordered list of all trade IDs ever created.
    bytes32[] public tradeIds;

    /// @dev 24-hour funded timeout constant.
    uint256 private constant FUNDED_TIMEOUT = 24 hours;

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new escrow is created and funded.
     * @param tradeId  Unique identifier for the trade.
     * @param seller   Address that locked the tokens.
     * @param buyer    Address that will receive tokens on release.
     * @param amount   Token amount locked.
     */
    event EscrowCreated(
        bytes32 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );

    /**
     * @notice Emitted on every state transition.
     * @param tradeId  Trade that transitioned.
     * @param from     Previous state.
     * @param to       New state.
     * @param actor    Address that triggered the transition.
     */
    event StateMachineTransition(
        bytes32 indexed tradeId,
        TradeState from,
        TradeState to,
        address actor
    );

    /**
     * @notice Emitted when locked funds are released to the buyer.
     * @param tradeId    Trade whose funds were released.
     * @param recipient  Buyer address that received the tokens.
     * @param amount     Token amount transferred.
     */
    event FundsReleased(
        bytes32 indexed tradeId,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @notice Emitted when locked funds are returned to the seller.
     * @param tradeId    Trade whose funds were refunded.
     * @param recipient  Seller address that received the tokens back.
     * @param amount     Token amount transferred.
     */
    event FundsRefunded(
        bytes32 indexed tradeId,
        address indexed recipient,
        uint256 amount
    );

    // NOTE: Paused / Unpaused events are inherited from OpenZeppelin Pausable.

    // ─── Custom Errors ────────────────────────────────────────────────────────

    /// @notice Called function is not valid for the trade's current state.
    error InvalidState(bytes32 tradeId, TradeState current, TradeState required);

    /// @notice Caller is not authorised to perform this action.
    error Unauthorized(address caller);

    /// @notice The stablecoin address is not on the whitelist.
    error TokenNotWhitelisted(address token);

    /// @notice Action requires the challenge window to have expired, but it is still active.
    error ChallengeWindowActive(bytes32 tradeId, uint256 expiresAt);

    /// @notice Action requires the challenge window to be active, but it has already expired.
    error ChallengeWindowExpired(bytes32 tradeId, uint256 expiredAt);

    /// @notice The 24-hour funded timeout has not yet elapsed.
    error FundedTimeoutNotReached(bytes32 tradeId, uint256 unlocksAt);

    /// @notice Amount must be greater than zero.
    error ZeroAmount();

    /// @notice Resolver is a party to the trade and cannot adjudicate it.
    error ConflictOfInterest(address resolver, bytes32 tradeId);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Deploy the escrow contract and grant the deployer admin rights.
     * @param admin  Address to receive DEFAULT_ADMIN_ROLE (can pause, whitelist tokens, grant roles).
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Pause all state-changing operations.
     * @dev Only DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Resume all state-changing operations.
     * @dev Only DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Add a stablecoin to the whitelist.
     * @dev Only DEFAULT_ADMIN_ROLE.
     * @param token  ERC-20 token address to whitelist.
     */
    function addWhitelistedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistedTokens[token] = true;
    }

    // ─── Core Lifecycle ───────────────────────────────────────────────────────

    /**
     * @notice Create and fund an escrow in a single transaction.
     * @dev Seller must have approved this contract for `amount` of `stablecoin` beforehand.
     *      The trade is immediately set to Funded (Created state is skipped).
     *
     * @param stablecoin              Whitelisted ERC-20 token to lock.
     * @param amount                  Token amount to lock (must be > 0).
     * @param buyer                   Counterparty who will receive funds on release.
     * @param challengeWindowSeconds  Seconds the seller has to dispute after buyer marks paid.
     * @return tradeId                Unique keccak256 identifier for this trade.
     */
    function createEscrow(
        address stablecoin,
        uint256 amount,
        address buyer,
        uint256 challengeWindowSeconds
    ) external nonReentrant whenNotPaused returns (bytes32 tradeId) {
        if (!whitelistedTokens[stablecoin]) revert TokenNotWhitelisted(stablecoin);
        if (amount == 0) revert ZeroAmount();

        tradeId = keccak256(
            abi.encodePacked(msg.sender, buyer, block.timestamp, amount)
        );

        trades[tradeId] = EscrowTrade({
            seller: msg.sender,
            buyer: buyer,
            resolver: address(0),
            stablecoin: stablecoin,
            amount: amount,
            state: TradeState.Funded,
            createdAt: block.timestamp,
            markedPaidAt: 0,
            challengeWindowSeconds: challengeWindowSeconds,
            challengeExpiresAt: 0
        });

        tradeIds.push(tradeId);

        // Pull tokens from seller into this contract.
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(tradeId, msg.sender, buyer, amount);
        emit StateMachineTransition(tradeId, TradeState.Created, TradeState.Funded, msg.sender);
    }

    /**
     * @notice Buyer signals that fiat payment has been sent.
     * @dev Starts the challenge window during which the seller may dispute.
     * @param tradeId  Target trade (must be in Funded state).
     */
    function markPaid(bytes32 tradeId) external whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        if (msg.sender != trade.buyer) revert Unauthorized(msg.sender);
        if (trade.state != TradeState.Funded)
            revert InvalidState(tradeId, trade.state, TradeState.Funded);

        trade.markedPaidAt = block.timestamp;
        trade.challengeExpiresAt = block.timestamp + trade.challengeWindowSeconds;

        TradeState prev = trade.state;
        trade.state = TradeState.MarkedPaid;

        emit StateMachineTransition(tradeId, prev, TradeState.MarkedPaid, msg.sender);
    }

    /**
     * @notice Seller raises a dispute while the challenge window is still open.
     * @dev Reverts if the challenge window has already expired.
     * @param tradeId  Target trade (must be in MarkedPaid state).
     */
    function dispute(bytes32 tradeId) external whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        if (msg.sender != trade.seller) revert Unauthorized(msg.sender);
        if (trade.state != TradeState.MarkedPaid)
            revert InvalidState(tradeId, trade.state, TradeState.MarkedPaid);
        if (block.timestamp >= trade.challengeExpiresAt)
            revert ChallengeWindowExpired(tradeId, trade.challengeExpiresAt);

        TradeState prev = trade.state;
        trade.state = TradeState.Disputed;

        emit StateMachineTransition(tradeId, prev, TradeState.Disputed, msg.sender);
    }

    /**
     * @notice Release locked funds to the buyer.
     * @dev Two valid callers:
     *      1. A RESOLVER_ROLE address (for Disputed, UnderReview, or MarkedPaid states).
     *      2. Anyone, when state is MarkedPaid AND the challenge window has expired
     *         (permissionless auto-release path).
     *
     * @param tradeId  Target trade.
     */
    function release(bytes32 tradeId) external nonReentrant whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        bool isResolver = hasRole(RESOLVER_ROLE, msg.sender);
        bool isChallengeExpired =
            trade.state == TradeState.MarkedPaid &&
            block.timestamp >= trade.challengeExpiresAt;

        if (!isResolver && !isChallengeExpired) revert Unauthorized(msg.sender);

        // Resolver conflict-of-interest check.
        if (isResolver) {
            if (msg.sender == trade.seller || msg.sender == trade.buyer)
                revert ConflictOfInterest(msg.sender, tradeId);
        }

        if (
            trade.state != TradeState.MarkedPaid &&
            trade.state != TradeState.UnderReview &&
            trade.state != TradeState.Disputed
        ) {
            revert InvalidState(tradeId, trade.state, TradeState.MarkedPaid);
        }

        // If resolver is releasing a MarkedPaid trade, challenge window must have expired.
        if (isResolver && trade.state == TradeState.MarkedPaid) {
            if (block.timestamp < trade.challengeExpiresAt)
                revert ChallengeWindowActive(tradeId, trade.challengeExpiresAt);
        }

        address buyer = trade.buyer;
        address stablecoin = trade.stablecoin;
        uint256 amount = trade.amount;
        TradeState prev = trade.state;

        trade.state = TradeState.Released;

        IERC20(stablecoin).safeTransfer(buyer, amount);

        emit FundsReleased(tradeId, buyer, amount);
        emit StateMachineTransition(tradeId, prev, TradeState.Released, msg.sender);
    }

    /**
     * @notice Refund locked funds to the seller (resolver decision).
     * @dev Only callable by RESOLVER_ROLE. Valid for Disputed or UnderReview states.
     * @param tradeId  Target trade.
     */
    function refund(bytes32 tradeId) external nonReentrant whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        if (!hasRole(RESOLVER_ROLE, msg.sender)) revert Unauthorized(msg.sender);

        // Conflict-of-interest check.
        if (msg.sender == trade.seller || msg.sender == trade.buyer)
            revert ConflictOfInterest(msg.sender, tradeId);

        if (
            trade.state != TradeState.Disputed &&
            trade.state != TradeState.UnderReview
        ) {
            revert InvalidState(tradeId, trade.state, TradeState.Disputed);
        }

        address seller = trade.seller;
        address stablecoin = trade.stablecoin;
        uint256 amount = trade.amount;
        TradeState prev = trade.state;

        trade.state = TradeState.Refunded;

        IERC20(stablecoin).safeTransfer(seller, amount);

        emit FundsRefunded(tradeId, seller, amount);
        emit StateMachineTransition(tradeId, prev, TradeState.Refunded, msg.sender);
    }

    /**
     * @notice Seller cancels the escrow before the buyer has marked paid.
     * @dev Returns locked tokens to the seller. Only valid in Funded state.
     * @param tradeId  Target trade.
     */
    function cancel(bytes32 tradeId) external nonReentrant whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        if (msg.sender != trade.seller) revert Unauthorized(msg.sender);
        if (trade.state != TradeState.Funded)
            revert InvalidState(tradeId, trade.state, TradeState.Funded);

        address seller = trade.seller;
        address stablecoin = trade.stablecoin;
        uint256 amount = trade.amount;

        trade.state = TradeState.Cancelled;

        IERC20(stablecoin).safeTransfer(seller, amount);

        emit StateMachineTransition(tradeId, TradeState.Funded, TradeState.Cancelled, msg.sender);
    }

    /**
     * @notice Seller reclaims funds after the 24-hour funded timeout.
     * @dev Only callable by the seller once 24 hours have elapsed since `createdAt`.
     *      Trade must still be in Funded state (buyer has not yet marked paid).
     * @param tradeId  Target trade.
     */
    function refundExpired(bytes32 tradeId) external nonReentrant whenNotPaused {
        EscrowTrade storage trade = trades[tradeId];

        if (msg.sender != trade.seller) revert Unauthorized(msg.sender);
        if (trade.state != TradeState.Funded)
            revert InvalidState(tradeId, trade.state, TradeState.Funded);

        uint256 unlocksAt = trade.createdAt + FUNDED_TIMEOUT;
        if (block.timestamp < unlocksAt)
            revert FundedTimeoutNotReached(tradeId, unlocksAt);

        address seller = trade.seller;
        address stablecoin = trade.stablecoin;
        uint256 amount = trade.amount;

        trade.state = TradeState.Refunded;

        IERC20(stablecoin).safeTransfer(seller, amount);

        emit FundsRefunded(tradeId, seller, amount);
        emit StateMachineTransition(tradeId, TradeState.Funded, TradeState.Refunded, msg.sender);
    }

    // ─── ETH Rejection ────────────────────────────────────────────────────────

    /// @notice Reject any accidental ETH transfers.
    receive() external payable {
        revert("ETH not accepted");
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Returns the total number of trades ever created.
     */
    function tradeCount() external view returns (uint256) {
        return tradeIds.length;
    }

    /**
     * @notice Returns the current state of a trade.
     * @param tradeId  Trade to query.
     */
    function getTradeState(bytes32 tradeId) external view returns (TradeState) {
        return trades[tradeId].state;
    }
}
