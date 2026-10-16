// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @dev Drives random sequences of deposit / consume / withdraw / close / refund.
contract StoreHandler is Test {
    uint256 constant USDC = 1e6;

    StoreDepositContract public store;
    MockUSDC public usdc;
    address public merchant;
    uint256[] internal pks;
    address[] public users;
    uint256 public totalDeposited;
    uint256 public totalRefunded;

    constructor(StoreDepositContract _store, MockUSDC _usdc, address _merchant) {
        store = _store;
        usdc = _usdc;
        merchant = _merchant;
        for (uint256 i = 0; i < 3; i++) {
            (address u, uint256 pk) = makeAddrAndKey(string.concat("user", vm.toString(i)));
            users.push(u);
            pks.push(pk);
            usdc.mint(u, 1_000 * USDC);
        }
    }

    function fundBonus(uint256 amount) external {
        amount = bound(amount, 1, 50 * USDC);
        usdc.mint(merchant, amount);
        vm.startPrank(merchant);
        usdc.approve(address(store), amount);
        store.fundBonus(amount);
        vm.stopPrank();
    }

    function deposit(uint256 userSeed, uint256 tierSeed) external {
        if (!store.isActive()) return;
        address u = users[userSeed % users.length];
        uint256 tierId = tierSeed % store.tierCount();
        StoreDepositContract.Tier memory tier = store.getTier(tierId);
        if (store.memberLevel(u) < tier.requiredLevel) return;
        if (store.bonusPool() < tier.creditAmount - tier.depositAmount) return;
        vm.startPrank(u);
        usdc.approve(address(store), tier.depositAmount);
        store.userDeposit(tierId);
        vm.stopPrank();
        totalDeposited += tier.depositAmount;
    }

    function consume(uint256 userSeed, uint256 amount) external {
        if (!store.isActive()) return;
        uint256 i = userSeed % users.length;
        address u = users[i];
        uint256 credit = store.getUserCredit(u);
        if (credit == 0) return;
        amount = bound(amount, 1, credit);

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(abi.encode(store.CONSUME_TYPEHASH(), u, amount, store.nonces(u), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", store.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pks[i], digest);

        vm.prank(merchant);
        store.userConsume(u, amount, deadline, abi.encodePacked(r, s, v));
    }

    function merchantWithdraw() external {
        if (store.merchantWithdrawable() == 0) return;
        vm.prank(merchant);
        store.merchantWithdraw();
    }

    function withdrawBonusPool(uint256 amount) external {
        uint256 pool = store.bonusPool();
        if (pool == 0) return;
        amount = bound(amount, 1, pool);
        vm.prank(merchant);
        store.withdrawBonusPool(amount);
    }

    function close() external {
        if (store.closed()) return;
        vm.prank(merchant);
        store.closeStore();
    }

    function refund(uint256 userSeed) external {
        if (store.isActive()) return;
        address u = users[userSeed % users.length];
        if (store.getUserCredit(u) == 0) return;
        uint256 principal = store.userPrincipal(u);
        vm.prank(u);
        store.userRefund();
        totalRefunded += principal;
    }

    function userCount() external view returns (uint256) {
        return users.length;
    }
}

contract SolvencyInvariantTest is Test {
    uint256 constant USDC = 1e6;

    StoreDepositContract store;
    MockUSDC usdc;
    StoreHandler handler;
    address merchant = makeAddr("merchant");

    function setUp() public {
        usdc = new MockUSDC();
        uint256[] memory deposits = new uint256[](2);
        uint256[] memory credits = new uint256[](2);
        deposits[0] = 10 * USDC;
        credits[0] = 12 * USDC;
        deposits[1] = 50 * USDC;
        credits[1] = 65 * USDC;
        store = new StoreDepositContract(merchant, address(usdc), 365, deposits, credits);
        // Membership tiers: 100 -> 130 grants level 1; 20 -> 30 requires level 1.
        vm.startPrank(merchant);
        store.addTier(100 * USDC, 130 * USDC, 0, 0, 1);
        store.addTier(20 * USDC, 30 * USDC, 0, 1, 0);
        vm.stopPrank();
        handler = new StoreHandler(store, usdc, merchant);
        targetContract(address(handler));
    }

    /// @notice The contract always holds enough USDC to cover every obligation.
    function invariant_ContractIsSolvent() public view {
        assertGe(usdc.balanceOf(address(store)), store.totalLocked() + store.bonusPool() + store.merchantWithdrawable());
    }

    /// @notice totalLocked equals the sum of what every user is still owed.
    function invariant_TotalLockedMatchesUserBalances() public view {
        uint256 sum;
        for (uint256 i = 0; i < handler.userCount(); i++) {
            sum += store.getUserCredit(handler.users(i));
        }
        assertEq(store.totalLocked(), sum);
    }

    /// @notice Users never get back more principal than they put in.
    function invariant_RefundsNeverExceedDeposits() public view {
        assertLe(handler.totalRefunded(), handler.totalDeposited());
    }
}
