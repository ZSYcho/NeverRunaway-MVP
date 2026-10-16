// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract StoreDepositTest is Test {
    uint256 constant USDC = 1e6;
    uint256 constant DEPOSIT = 10 * USDC;
    uint256 constant CREDIT = 12 * USDC;

    MockUSDC usdc;
    StoreDepositContract store;

    address merchant = makeAddr("merchant");
    address alice;
    uint256 alicePk;
    address bob;
    uint256 bobPk;

    function setUp() public {
        (alice, alicePk) = makeAddrAndKey("alice");
        (bob, bobPk) = makeAddrAndKey("bob");

        usdc = new MockUSDC();
        uint256[] memory deposits = new uint256[](1);
        uint256[] memory credits = new uint256[](1);
        deposits[0] = DEPOSIT;
        credits[0] = CREDIT;
        store = new StoreDepositContract(merchant, address(usdc), 365, deposits, credits);

        usdc.mint(alice, 100 * USDC);
        usdc.mint(bob, 100 * USDC);
        usdc.mint(merchant, 100 * USDC);
    }

    // ---------------------------------------------------------------------
    // Helpers: the only place that knows the contract's write API.
    // ---------------------------------------------------------------------

    function _deposit(address user) internal {
        vm.startPrank(user);
        usdc.approve(address(store), DEPOSIT);
        store.userDeposit(0);
        vm.stopPrank();
    }

    /// @dev Merchant pre-funds the promotional bonus.
    function _fundBonus(uint256 amount) internal {
        vm.startPrank(merchant);
        usdc.approve(address(store), amount);
        store.fundBonus(amount);
        vm.stopPrank();
    }

    /// @dev Builds the EIP-712 digest independently of the contract, the way a wallet would.
    function _digest(StoreDepositContract s, address user, uint256 amount, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Consume(address user,uint256 amount,uint256 nonce,uint256 deadline)"),
                user,
                amount,
                nonce,
                deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", s.DOMAIN_SEPARATOR(), structHash));
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Spend `amount` credit of `user`: user signs, merchant submits.
    function _consume(address user, uint256 pk, uint256 amount) internal {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(pk, _digest(store, user, amount, store.nonces(user), deadline));
        vm.prank(merchant);
        store.userConsume(user, amount, deadline, sig);
    }

    // ---------------------------------------------------------------------
    // Issue 1: merchant must not be able to spend a user's credit without the user's consent.
    // ---------------------------------------------------------------------

    function test_Issue1_MerchantCannotSpendWithoutUserConsent() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        uint256 creditBefore = store.getUserCredit(alice);

        // Merchant calls the legacy entry point with no user signature at all.
        // Amount stays within principal so the Issue 2 underflow cannot mask the result.
        vm.prank(merchant);
        (bool ok,) = address(store).call(abi.encodeWithSignature("userConsume(address,uint256)", alice, DEPOSIT));

        assertFalse(ok, "merchant spent user credit without consent");
        assertEq(store.getUserCredit(alice), creditBefore, "user credit changed");
    }

    // ---------------------------------------------------------------------
    // Issue 2: bonus credit must be funded; the contract must stay solvent.
    // ---------------------------------------------------------------------

    function test_Issue2_UserCanSpendFullCreditIncludingBonus() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);

        _consume(alice, alicePk, CREDIT);
        assertEq(store.getUserCredit(alice), 0);

        uint256 before = usdc.balanceOf(merchant);
        vm.prank(merchant);
        store.merchantWithdraw();
        assertEq(usdc.balanceOf(merchant) - before, CREDIT, "merchant should be paid for all goods served");
    }

    function test_Issue2_UnspentUserCanRefundAfterExpiry() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);

        vm.warp(store.expireTime());
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        store.userRefund();
        assertGe(usdc.balanceOf(alice) - before, DEPOSIT, "user must get at least the principal back");
    }

    function test_Issue2_OtherUsersPrincipalIsNotUsedToPayBonus() public {
        _fundBonus(2 * (CREDIT - DEPOSIT));
        _deposit(alice);
        _deposit(bob);

        // Alice spends everything, merchant cashes out.
        _consume(alice, alicePk, CREDIT);
        vm.prank(merchant);
        store.merchantWithdraw();

        // Bob never spent anything; he must still be able to recover his principal.
        vm.warp(store.expireTime());
        uint256 before = usdc.balanceOf(bob);
        vm.prank(bob);
        store.userRefund();
        assertGe(usdc.balanceOf(bob) - before, DEPOSIT, "bob's principal was used to pay alice's bonus");
    }

    // ---------------------------------------------------------------------
    // Fix 1: EIP-712 consent
    // ---------------------------------------------------------------------

    function _signedConsume(uint256 signerPk, address user, uint256 amount)
        internal
        view
        returns (uint256 deadline, bytes memory sig)
    {
        deadline = block.timestamp + 10 minutes;
        sig = _sign(signerPk, _digest(store, user, amount, store.nonces(user), deadline));
    }

    function test_Consume_SignatureCannotBeReplayed() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(alicePk, alice, 1 * USDC);

        vm.startPrank(merchant);
        store.userConsume(alice, 1 * USDC, deadline, sig);
        // Nonce moved on, so the same signature now hashes to a different digest.
        vm.expectRevert(StoreDepositContract.InvalidSignature.selector);
        store.userConsume(alice, 1 * USDC, deadline, sig);
        vm.stopPrank();
    }

    function test_Consume_RevertsWhenSignedByAnotherAccount() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(bobPk, alice, 1 * USDC);

        vm.prank(merchant);
        vm.expectRevert(StoreDepositContract.InvalidSignature.selector);
        store.userConsume(alice, 1 * USDC, deadline, sig);
    }

    function test_Consume_RevertsWhenAmountTampered() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(alicePk, alice, 1 * USDC);

        vm.prank(merchant);
        vm.expectRevert(StoreDepositContract.InvalidSignature.selector);
        store.userConsume(alice, 10 * USDC, deadline, sig);
    }

    function test_Consume_RevertsAfterDeadline() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(alicePk, alice, 1 * USDC);

        vm.warp(deadline + 1);
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.SignatureExpired.selector, deadline));
        store.userConsume(alice, 1 * USDC, deadline, sig);
    }

    function test_Consume_OnlyMerchantCanSubmit() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(alicePk, alice, 1 * USDC);

        vm.prank(bob);
        vm.expectRevert(StoreDepositContract.OnlyMerchant.selector);
        store.userConsume(alice, 1 * USDC, deadline, sig);
    }

    function test_Consume_SignatureIsBoundToOneStore() public {
        // Same merchant runs a second store; a signature for store A must not work on store B.
        uint256[] memory deposits = new uint256[](1);
        uint256[] memory credits = new uint256[](1);
        deposits[0] = DEPOSIT;
        credits[0] = DEPOSIT;
        StoreDepositContract storeB = new StoreDepositContract(merchant, address(usdc), 365, deposits, credits);
        vm.startPrank(alice);
        usdc.approve(address(storeB), DEPOSIT);
        storeB.userDeposit(0);
        vm.stopPrank();

        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sigForA = _sign(alicePk, _digest(store, alice, 1 * USDC, 0, deadline));

        vm.prank(merchant);
        vm.expectRevert(StoreDepositContract.InvalidSignature.selector);
        storeB.userConsume(alice, 1 * USDC, deadline, sigForA);
    }

    function test_Consume_WorksForERC1271SmartWallet() public {
        (address owner, uint256 ownerPk) = makeAddrAndKey("walletOwner");
        MockSmartWallet wallet = new MockSmartWallet(owner);
        usdc.mint(address(wallet), DEPOSIT);

        _fundBonus(CREDIT - DEPOSIT);
        vm.startPrank(address(wallet));
        usdc.approve(address(store), DEPOSIT);
        store.userDeposit(0);
        vm.stopPrank();

        _consume(address(wallet), ownerPk, 5 * USDC);
        assertEq(store.getUserCredit(address(wallet)), CREDIT - 5 * USDC);
    }

    // ---------------------------------------------------------------------
    // Fix 2: principal / bonus accounting
    // ---------------------------------------------------------------------

    function test_Deposit_RevertsWhenBonusNotFunded() public {
        vm.startPrank(alice);
        usdc.approve(address(store), DEPOSIT);
        vm.expectRevert(
            abi.encodeWithSelector(StoreDepositContract.InsufficientBonusPool.selector, CREDIT - DEPOSIT, 0)
        );
        store.userDeposit(0);
        vm.stopPrank();
    }

    function test_Consume_SplitsPrincipalAndBonusProRata() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);

        // 6 of 12 credit: bonus part = ceil(6 * 2 / 12) = 1, principal part = 5.
        _consume(alice, alicePk, 6 * USDC);
        assertEq(store.userPrincipal(alice), 5 * USDC);
        assertEq(store.userBonus(alice), 1 * USDC);

        vm.prank(merchant);
        store.closeStore();
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        store.userRefund();
        assertEq(usdc.balanceOf(alice) - before, 5 * USDC, "refund = unspent principal");
        assertEq(store.bonusPool(), 1 * USDC, "unspent bonus returns to pool");
    }

    function test_MerchantCanReclaimUnallocatedBonus() public {
        _fundBonus(5 * USDC);
        _deposit(alice); // allocates 2

        vm.prank(merchant);
        vm.expectRevert(); // only 3 left unallocated
        store.withdrawBonusPool(4 * USDC);

        uint256 before = usdc.balanceOf(merchant);
        vm.prank(merchant);
        store.withdrawBonusPool(3 * USDC);
        assertEq(usdc.balanceOf(merchant) - before, 3 * USDC);
    }

    function test_Constructor_RejectsTierWithCreditBelowDeposit() public {
        uint256[] memory deposits = new uint256[](1);
        uint256[] memory credits = new uint256[](1);
        deposits[0] = DEPOSIT;
        credits[0] = DEPOSIT - 1;
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.InvalidTier.selector, DEPOSIT, DEPOSIT - 1));
        new StoreDepositContract(merchant, address(usdc), 365, deposits, credits);
    }

    function testFuzz_ConsumeThenRefundConservesFunds(uint256 spend) public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        spend = bound(spend, 1, CREDIT);

        _consume(alice, alicePk, spend);
        vm.prank(merchant);
        store.closeStore();
        if (store.getUserCredit(alice) > 0) {
            vm.prank(alice);
            store.userRefund();
        }
        vm.prank(merchant);
        store.merchantWithdraw();

        // Merchant was paid exactly what was spent; everything else is still accounted for.
        assertEq(usdc.balanceOf(merchant), 100 * USDC - (CREDIT - DEPOSIT) + spend);
        assertEq(usdc.balanceOf(address(store)), store.bonusPool());
        assertEq(store.totalLocked(), 0);
    }

    // ---------------------------------------------------------------------
    // Fix 3: store closure
    // ---------------------------------------------------------------------

    function test_Close_UserCanRefundImmediately() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);

        vm.prank(merchant);
        store.closeStore();

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        store.userRefund();
        assertEq(usdc.balanceOf(alice) - before, DEPOSIT);
    }

    function test_Close_BlocksNewDepositsAndConsumption() public {
        _fundBonus(2 * (CREDIT - DEPOSIT));
        _deposit(alice);
        (uint256 deadline, bytes memory sig) = _signedConsume(alicePk, alice, 1 * USDC);

        vm.prank(merchant);
        store.closeStore();

        vm.prank(merchant);
        vm.expectRevert(StoreDepositContract.StoreNotActive.selector);
        store.userConsume(alice, 1 * USDC, deadline, sig);

        vm.startPrank(bob);
        usdc.approve(address(store), DEPOSIT);
        vm.expectRevert(StoreDepositContract.StoreNotActive.selector);
        store.userDeposit(0);
        vm.stopPrank();
    }

    function test_Close_OnlyMerchant() public {
        vm.prank(alice);
        vm.expectRevert(StoreDepositContract.OnlyMerchant.selector);
        store.closeStore();
    }

    function test_Close_MerchantKeepsEarnedFunds() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        _consume(alice, alicePk, 6 * USDC);

        vm.startPrank(merchant);
        store.closeStore();
        uint256 before = usdc.balanceOf(merchant);
        store.merchantWithdraw();
        vm.stopPrank();
        assertEq(usdc.balanceOf(merchant) - before, 6 * USDC);
    }

    function test_Refund_RevertsWhileStoreActive() public {
        _fundBonus(CREDIT - DEPOSIT);
        _deposit(alice);
        vm.prank(alice);
        vm.expectRevert(StoreDepositContract.StoreStillActive.selector);
        store.userRefund();
    }
}

/// @dev Minimal ERC-1271 wallet: valid if the hash was signed by `owner`.
contract MockSmartWallet {
    address public immutable owner;

    constructor(address _owner) {
        owner = _owner;
    }

    function isValidSignature(bytes32 hash, bytes calldata sig) external view returns (bytes4) {
        return ECDSA.recover(hash, sig) == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}
