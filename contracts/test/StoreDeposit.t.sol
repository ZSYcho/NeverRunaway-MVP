// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

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
        store.userDeposit(DEPOSIT);
        vm.stopPrank();
    }

    /// @dev Merchant pre-funds the promotional bonus. The current contract has no such concept.
    function _fundBonus(uint256) internal {}

    /// @dev Spend `amount` credit of `user`. The current contract needs no user authorization.
    function _consume(address user, uint256, uint256 amount) internal {
        vm.prank(merchant);
        store.userConsume(user, amount);
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
}
