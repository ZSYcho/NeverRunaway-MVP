// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title StoreDepositContract
/// @notice One prepaid-credit vault per store.
/// Accounting model:
///  - Principal: USDC the user paid in. Always refundable once the store is closed or expired.
///  - Bonus:     promotional credit, backed 1:1 by USDC the merchant pre-funded into `bonusPool`.
///  - Spending credit requires the user's EIP-712 signature; the merchant only relays it.
/// Solvency invariant: usdc.balanceOf(this) >= totalLocked + bonusPool + merchantWithdrawable.
contract StoreDepositContract is EIP712, Nonces, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CONSUME_TYPEHASH =
        keccak256("Consume(address user,uint256 amount,uint256 nonce,uint256 deadline)");

    address public immutable merchant;
    IERC20 public immutable usdcToken;
    uint256 public immutable expireTime;

    /// @notice A deposit rule defined by the merchant.
    /// Rules are append-only: once added, a tier's terms never change. To "edit" a rule the
    /// merchant disables it and adds a new one, so a pending user deposit can't be front-run
    /// into worse terms.
    struct Tier {
        uint256 depositAmount; // USDC the user pays
        uint256 creditAmount; // credit granted (principal + bonus), >= depositAmount
        uint64 validUntil; // last valid timestamp; 0 = no deadline
        uint8 requiredLevel; // member level needed to use this tier
        uint8 grantsLevel; // member level granted; never lowers an existing level
        bool active;
    }

    Tier[] internal _tiers;
    /// @notice Highest member level a user has reached. Permanent.
    mapping(address => uint8) public memberLevel;
    mapping(address => uint256) public userPrincipal;
    mapping(address => uint256) public userBonus;

    /// @notice Earned by the merchant through user-signed consumption; withdrawable any time.
    uint256 public merchantWithdrawable;
    /// @notice Credit owed to users (principal + allocated bonus).
    uint256 public totalLocked;
    /// @notice Merchant-funded bonus not yet allocated to any user.
    uint256 public bonusPool;
    /// @notice Once closed, no new deposits or consumption; users can refund immediately.
    bool public closed;

    event Deposit(address indexed user, uint256 indexed tierId, uint256 depositAmount, uint256 creditAmount);
    event TierAdded(
        uint256 indexed tierId,
        uint256 depositAmount,
        uint256 creditAmount,
        uint64 validUntil,
        uint8 requiredLevel,
        uint8 grantsLevel
    );
    event TierDisabled(uint256 indexed tierId);
    event MemberLevelUpgraded(address indexed user, uint8 newLevel);
    event Consume(
        address indexed user,
        address indexed merchant,
        uint256 consumeAmount,
        uint256 principalPart,
        uint256 bonusPart,
        uint256 nonce
    );
    event Withdraw(address indexed merchant, uint256 withdrawAmount);
    event Refund(address indexed user, uint256 principalRefunded, uint256 bonusReturned);
    event BonusFunded(address indexed from, uint256 amount);
    event BonusWithdrawn(address indexed merchant, uint256 amount);
    event StoreClosed(uint256 timestamp);

    error OnlyMerchant();
    error TierLengthMismatch();
    error InvalidTier(uint256 depositAmount, uint256 creditAmount);
    error InvalidTierId(uint256 tierId);
    error TierInactive(uint256 tierId);
    error TierExpired(uint256 tierId, uint64 validUntil);
    error InvalidValidUntil(uint64 validUntil);
    error MemberLevelTooLow(uint8 required, uint8 actual);
    error StoreNotActive();
    error StoreStillActive();
    error InsufficientBonusPool(uint256 needed, uint256 available);
    error InsufficientCredit(uint256 requested, uint256 available);
    error ZeroAmount();
    error SignatureExpired(uint256 deadline);
    error InvalidSignature();
    error NothingToRefund();
    error NothingToWithdraw();
    error AlreadyClosed();
    error ZeroAddress();

    modifier onlyMerchant() {
        if (msg.sender != merchant) revert OnlyMerchant();
        _;
    }

    constructor(
        address _merchant,
        address _usdcToken,
        uint256 _expireDays,
        uint256[] memory _depositAmounts,
        uint256[] memory _creditAmounts
    ) EIP712("NeverRunaway Store", "1") {
        if (_merchant == address(0) || _usdcToken == address(0)) revert ZeroAddress();
        merchant = _merchant;
        usdcToken = IERC20(_usdcToken);
        expireTime = block.timestamp + _expireDays * 1 days;

        if (_depositAmounts.length != _creditAmounts.length) revert TierLengthMismatch();
        // Initial tiers: open to everyone, no deadline, no membership effect.
        for (uint256 i = 0; i < _depositAmounts.length; i++) {
            _addTier(_depositAmounts[i], _creditAmounts[i], 0, 0, 0);
        }
    }

    function isActive() public view returns (bool) {
        return !closed && block.timestamp < expireTime;
    }

    // ---------------------------------------------------------------------
    // Merchant: deposit rules
    // ---------------------------------------------------------------------

    /// @notice Add a deposit rule. Examples:
    ///  - Internet cafe opening promo: 100 -> 200 credit, validUntil = promo end.
    ///  - Barber membership: 200 -> 240 credit, grantsLevel = 1 (30-credit cut costs 25 USDC).
    ///  - Barber member top-up: 100 -> 120 credit, requiredLevel = 1.
    function addTier(
        uint256 _depositAmount,
        uint256 _creditAmount,
        uint64 _validUntil,
        uint8 _requiredLevel,
        uint8 _grantsLevel
    ) external onlyMerchant returns (uint256 tierId) {
        if (_validUntil != 0 && _validUntil < block.timestamp) {
            revert InvalidValidUntil(_validUntil);
        }
        return _addTier(_depositAmount, _creditAmount, _validUntil, _requiredLevel, _grantsLevel);
    }

    /// @notice Stop accepting deposits on a tier. Existing balances are unaffected.
    function disableTier(uint256 _tierId) external onlyMerchant {
        if (_tierId >= _tiers.length) revert InvalidTierId(_tierId);
        if (!_tiers[_tierId].active) revert TierInactive(_tierId);
        _tiers[_tierId].active = false;
        emit TierDisabled(_tierId);
    }

    function _addTier(
        uint256 _depositAmount,
        uint256 _creditAmount,
        uint64 _validUntil,
        uint8 _requiredLevel,
        uint8 _grantsLevel
    ) internal returns (uint256 tierId) {
        // Credit below principal would let the merchant keep part of the deposit unspent.
        if (_depositAmount == 0 || _creditAmount < _depositAmount) {
            revert InvalidTier(_depositAmount, _creditAmount);
        }
        tierId = _tiers.length;
        _tiers.push(Tier(_depositAmount, _creditAmount, _validUntil, _requiredLevel, _grantsLevel, true));
        emit TierAdded(tierId, _depositAmount, _creditAmount, _validUntil, _requiredLevel, _grantsLevel);
    }

    // ---------------------------------------------------------------------
    // Merchant: bonus pool
    // ---------------------------------------------------------------------

    /// @notice Pre-fund promotional bonus. Anyone may fund (e.g. a platform sponsor).
    function fundBonus(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert ZeroAmount();
        bonusPool += _amount;
        emit BonusFunded(msg.sender, _amount);
        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    /// @notice Reclaim bonus that has not been promised to any user yet.
    function withdrawBonusPool(uint256 _amount) external nonReentrant onlyMerchant {
        if (_amount == 0) revert ZeroAmount();
        bonusPool -= _amount; // reverts on underflow
        emit BonusWithdrawn(merchant, _amount);
        usdcToken.safeTransfer(merchant, _amount);
    }

    // ---------------------------------------------------------------------
    // User: deposit
    // ---------------------------------------------------------------------

    function userDeposit(uint256 _tierId) external nonReentrant {
        if (_tierId >= _tiers.length) revert InvalidTierId(_tierId);
        Tier memory tier = _tiers[_tierId];
        if (!tier.active) revert TierInactive(_tierId);
        if (tier.validUntil != 0 && block.timestamp > tier.validUntil) revert TierExpired(_tierId, tier.validUntil);
        if (!isActive()) revert StoreNotActive();

        uint8 level = memberLevel[msg.sender];
        if (level < tier.requiredLevel) revert MemberLevelTooLow(tier.requiredLevel, level);

        uint256 bonus = tier.creditAmount - tier.depositAmount;
        if (bonusPool < bonus) revert InsufficientBonusPool(bonus, bonusPool);

        bonusPool -= bonus;
        userPrincipal[msg.sender] += tier.depositAmount;
        userBonus[msg.sender] += bonus;
        totalLocked += tier.creditAmount;

        if (tier.grantsLevel > level) {
            memberLevel[msg.sender] = tier.grantsLevel;
            emit MemberLevelUpgraded(msg.sender, tier.grantsLevel);
        }

        emit Deposit(msg.sender, _tierId, tier.depositAmount, tier.creditAmount);
        usdcToken.safeTransferFrom(msg.sender, address(this), tier.depositAmount);
    }

    // ---------------------------------------------------------------------
    // Consume: user signs off-chain, merchant submits on-chain
    // ---------------------------------------------------------------------

    /// @notice Spend `_amount` of `_user`'s credit, authorized by the user's EIP-712 signature.
    /// @dev Signature is checked with SignatureChecker, so ERC-1271 smart accounts work too.
    ///      Nonces are sequential per user: each signature can be used once, in order.
    function userConsume(address _user, uint256 _amount, uint256 _deadline, bytes calldata _signature)
        external
        nonReentrant
        onlyMerchant
    {
        if (_amount == 0) revert ZeroAmount();
        if (block.timestamp > _deadline) revert SignatureExpired(_deadline);
        if (!isActive()) revert StoreNotActive();

        uint256 principal = userPrincipal[_user];
        uint256 bonus = userBonus[_user];
        uint256 credit = principal + bonus;
        if (_amount > credit) revert InsufficientCredit(_amount, credit);

        uint256 nonce = _useNonce(_user);
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CONSUME_TYPEHASH, _user, _amount, nonce, _deadline)));
        if (!SignatureChecker.isValidSignatureNow(_user, digest, _signature)) revert InvalidSignature();

        // Spend principal and bonus pro rata. Rounding up the bonus part keeps the
        // user's refundable principal as large as possible.
        uint256 bonusPart = Math.mulDiv(_amount, bonus, credit, Math.Rounding.Ceil);
        uint256 principalPart = _amount - bonusPart;

        userPrincipal[_user] = principal - principalPart;
        userBonus[_user] = bonus - bonusPart;
        totalLocked -= _amount;
        merchantWithdrawable += _amount;

        emit Consume(_user, merchant, _amount, principalPart, bonusPart, nonce);
    }

    // ---------------------------------------------------------------------
    // Merchant: withdraw earnings, close store
    // ---------------------------------------------------------------------

    function merchantWithdraw() external nonReentrant onlyMerchant {
        uint256 amount = merchantWithdrawable;
        if (amount == 0) revert NothingToWithdraw();
        merchantWithdrawable = 0;
        emit Withdraw(merchant, amount);
        usdcToken.safeTransfer(merchant, amount);
    }

    /// @notice Permanently close the store. Users can refund immediately afterwards.
    function closeStore() external onlyMerchant {
        if (closed) revert AlreadyClosed();
        closed = true;
        emit StoreClosed(block.timestamp);
    }

    // ---------------------------------------------------------------------
    // User: refund
    // ---------------------------------------------------------------------

    /// @notice After close or expiry, return remaining principal to the user.
    /// Unspent bonus goes back to the merchant's bonus pool: it was a discount, not cash.
    function userRefund() external nonReentrant {
        if (isActive()) revert StoreStillActive();

        uint256 principal = userPrincipal[msg.sender];
        uint256 bonus = userBonus[msg.sender];
        if (principal + bonus == 0) revert NothingToRefund();

        userPrincipal[msg.sender] = 0;
        userBonus[msg.sender] = 0;
        totalLocked -= principal + bonus;
        bonusPool += bonus;

        emit Refund(msg.sender, principal, bonus);
        if (principal > 0) usdcToken.safeTransfer(msg.sender, principal);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function tierCount() external view returns (uint256) {
        return _tiers.length;
    }

    function getTier(uint256 _tierId) external view returns (Tier memory) {
        if (_tierId >= _tiers.length) revert InvalidTierId(_tierId);
        return _tiers[_tierId];
    }

    /// @notice All tiers, including disabled and expired ones (UI filters by `active` / `validUntil`).
    function getTiers() external view returns (Tier[] memory) {
        return _tiers;
    }

    function getUserCredit(address _user) external view returns (uint256) {
        return userPrincipal[_user] + userBonus[_user];
    }

    /// @notice EIP-712 domain separator, exposed for off-chain signers and debugging.
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
