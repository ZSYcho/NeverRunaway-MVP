// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Merchant-defined deposit rules, tested through real small-business scenarios.
contract TiersTest is Test {
    uint256 constant USDC = 1e6;

    MockUSDC usdc;
    StoreDepositContract store;
    address merchant = makeAddr("merchant");
    address alice;
    uint256 alicePk;

    function setUp() public {
        (alice, alicePk) = makeAddrAndKey("alice");
        usdc = new MockUSDC();
        // No initial tiers: each scenario configures its own rules.
        store = new StoreDepositContract(merchant, address(usdc), 365, new uint256[](0), new uint256[](0));
        usdc.mint(alice, 1_000 * USDC);
        usdc.mint(merchant, 1_000 * USDC);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _addTier(uint256 dep, uint256 credit, uint64 validUntil, uint8 requiredLevel, uint8 grantsLevel)
        internal
        returns (uint256)
    {
        vm.prank(merchant);
        return store.addTier(dep, credit, validUntil, requiredLevel, grantsLevel);
    }

    function _fundBonus(uint256 amount) internal {
        vm.startPrank(merchant);
        usdc.approve(address(store), amount);
        store.fundBonus(amount);
        vm.stopPrank();
    }

    function _deposit(uint256 tierId) internal {
        vm.startPrank(alice);
        usdc.approve(address(store), type(uint256).max);
        store.userDeposit(tierId);
        vm.stopPrank();
    }

    function _consume(uint256 amount) internal {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes32 structHash =
            keccak256(abi.encode(store.CONSUME_TYPEHASH(), alice, amount, store.nonces(alice), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", store.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        vm.prank(merchant);
        store.userConsume(alice, amount, deadline, abi.encodePacked(r, s, v));
    }

    // ---------------------------------------------------------------------
    // Scenario: internet cafe grand opening, "deposit 100 get 100 free" for 7 days
    // ---------------------------------------------------------------------

    function test_Scenario_InternetCafe_OpeningPromo() public {
        uint64 promoEnd = uint64(block.timestamp + 7 days);
        uint256 t100 = _addTier(100 * USDC, 200 * USDC, promoEnd, 0, 0);
        uint256 t200 = _addTier(200 * USDC, 400 * USDC, promoEnd, 0, 0);

        // 100% bonus must be fully pre-funded.
        _fundBonus(100 * USDC);
        _deposit(t100);
        assertEq(store.getUserCredit(alice), 200 * USDC);

        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.InsufficientBonusPool.selector, 200 * USDC, 0));
        store.userDeposit(t200);
        vm.stopPrank();

        // Promo ends: the tier stops accepting deposits, existing credit is untouched.
        vm.warp(promoEnd + 1);
        _fundBonus(100 * USDC);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.TierExpired.selector, t100, promoEnd));
        store.userDeposit(t100);
        assertEq(store.getUserCredit(alice), 200 * USDC);
    }

    // ---------------------------------------------------------------------
    // Scenario: barber, 30 per cut; deposit >= 200 => member price 25 per cut
    // ---------------------------------------------------------------------

    function test_Scenario_Barber_MemberPriceAndTopUp() public {
        // 200 USDC buys 240 credit; a cut is listed at 30 credit => 25 USDC effective.
        uint256 join = _addTier(200 * USDC, 240 * USDC, 0, 0, 1);
        // Members may top up smaller amounts at the same rate.
        uint256 topUp = _addTier(100 * USDC, 120 * USDC, 0, 1, 0);
        _fundBonus(60 * USDC);

        // Non-member cannot use the member top-up.
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.MemberLevelTooLow.selector, 1, 0));
        store.userDeposit(topUp);

        _deposit(join);
        assertEq(store.memberLevel(alice), 1);

        // One haircut: 30 credit, of which exactly 25 is the user's own money.
        _consume(30 * USDC);
        assertEq(store.userPrincipal(alice), 175 * USDC);
        assertEq(store.userBonus(alice), 35 * USDC);

        // Membership is permanent: the small top-up now works at member rate.
        _deposit(topUp);
        assertEq(store.memberLevel(alice), 1);
        assertEq(store.getUserCredit(alice), 330 * USDC);
    }

    function test_Membership_NeverDowngrades() public {
        uint256 gold = _addTier(200 * USDC, 240 * USDC, 0, 0, 2);
        uint256 basic = _addTier(50 * USDC, 55 * USDC, 0, 0, 1);
        _fundBonus(100 * USDC);

        _deposit(gold);
        _deposit(basic);
        assertEq(store.memberLevel(alice), 2);
    }

    // ---------------------------------------------------------------------
    // Scenario: restaurant / nail salon, merchant swaps a rule mid-season
    // ---------------------------------------------------------------------

    function test_Scenario_Restaurant_RuleChangeKeepsExistingBalances() public {
        uint256 oldRule = _addTier(50 * USDC, 60 * USDC, 0, 0, 0);
        _fundBonus(20 * USDC);
        _deposit(oldRule);

        // "Edit" = disable + add. The old rule's terms are never mutated.
        vm.startPrank(merchant);
        store.disableTier(oldRule);
        uint256 newRule = store.addTier(50 * USDC, 55 * USDC, 0, 0, 0);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.TierInactive.selector, oldRule));
        store.userDeposit(oldRule);

        _deposit(newRule);
        assertEq(store.getUserCredit(alice), 115 * USDC, "60 from old rule + 55 from new rule");
        assertFalse(store.getTier(oldRule).active);
        assertEq(store.getTier(oldRule).creditAmount, 60 * USDC, "old terms still readable for history");
    }

    // ---------------------------------------------------------------------
    // Rule validation and access control
    // ---------------------------------------------------------------------

    function test_AddTier_OnlyMerchant() public {
        vm.prank(alice);
        vm.expectRevert(StoreDepositContract.OnlyMerchant.selector);
        store.addTier(10 * USDC, 12 * USDC, 0, 0, 0);
    }

    function test_AddTier_RejectsCreditBelowDeposit() public {
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.InvalidTier.selector, 10 * USDC, 9 * USDC));
        store.addTier(10 * USDC, 9 * USDC, 0, 0, 0);
    }

    function test_AddTier_RejectsDeadlineInThePast() public {
        vm.warp(1_000_000);
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.InvalidValidUntil.selector, uint64(999_999)));
        store.addTier(10 * USDC, 12 * USDC, 999_999, 0, 0);
    }

    function test_DisableTier_OnlyMerchant() public {
        uint256 t = _addTier(10 * USDC, 10 * USDC, 0, 0, 0);
        vm.prank(alice);
        vm.expectRevert(StoreDepositContract.OnlyMerchant.selector);
        store.disableTier(t);
    }

    function test_Deposit_RevertsOnUnknownTier() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StoreDepositContract.InvalidTierId.selector, 7));
        store.userDeposit(7);
    }

    function test_Deposit_NoBonusTierNeedsNoFunding() public {
        uint256 t = _addTier(30 * USDC, 30 * USDC, 0, 0, 0);
        _deposit(t);
        assertEq(store.getUserCredit(alice), 30 * USDC);
    }
}
