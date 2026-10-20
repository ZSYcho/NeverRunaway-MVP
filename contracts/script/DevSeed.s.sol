// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/Script.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {StoreDepositFactory} from "../src/StoreDepositFactory.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {DeploymentWriter} from "./utils/DeploymentWriter.sol";

/// @notice Seeds a fresh local anvil chain with demo stores and balances.
/// Usage: `pnpm dev` from the repo root, or with anvil already running:
///   forge script script/DevSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
/// Keys come from anvil's default mnemonic, so every fresh chain gets the same addresses:
///   #0 deployer, #1 internet cafe merchant, #2 barber merchant, #3 Alice, #4 Bob (consumers).
contract DevSeed is DeploymentWriter {
    string internal constant ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
    uint256 internal constant USDC = 1e6;
    uint256 internal constant STORE_EXPIRE_DAYS = 365;

    function run() external {
        require(block.chainid == 31337, "DevSeed: local anvil only");
        uint256 startBlock = block.number;

        // Platform: test token and factory. Every dev account gets 10,000 test USDC.
        vm.startBroadcast(_key(0));
        MockUSDC usdc = new MockUSDC();
        StoreDepositFactory factory = new StoreDepositFactory(address(usdc));
        for (uint32 i = 1; i < 10; i++) {
            usdc.mint(vm.addr(_key(i)), 10_000 * USDC);
        }
        vm.stopBroadcast();

        // Internet cafe: plain top-up (50 -> 55) plus a 30-day opening promo (100 -> 200).
        vm.startBroadcast(_key(1));
        StoreDepositContract cafe = _createStore(factory, 50 * USDC, 55 * USDC);
        cafe.addTier(100 * USDC, 200 * USDC, uint64(block.timestamp + 30 days), 0, 0);
        _fundBonus(usdc, cafe, 2_000 * USDC);
        vm.stopBroadcast();

        // Barber: 30 per cut. A 200 deposit buys membership (240 credit, i.e. 25 per cut);
        // members can then top up 100 -> 120.
        vm.startBroadcast(_key(2));
        StoreDepositContract barber = _createStore(factory, 30 * USDC, 30 * USDC);
        barber.addTier(200 * USDC, 240 * USDC, 0, 0, 1);
        barber.addTier(100 * USDC, 120 * USDC, 0, 1, 1);
        _fundBonus(usdc, barber, 1_000 * USDC);
        vm.stopBroadcast();

        // Existing balances, so consume and refund flows can be tried without depositing first.
        _deposit(usdc, cafe, _key(3), 1); // Alice: cafe promo
        _deposit(usdc, barber, _key(4), 1); // Bob: barber membership

        _writeDeployment(address(factory), address(usdc), startBlock, true);

        console.log("USDC (mock):        ", address(usdc));
        console.log("StoreDepositFactory:", address(factory));
        console.log("Internet cafe store:", address(cafe));
        console.log("Barber store:       ", address(barber));
    }

    function _key(uint32 index) internal pure returns (uint256) {
        return vm.deriveKey(ANVIL_MNEMONIC, index);
    }

    /// @dev Must be called inside the merchant's broadcast: the factory makes msg.sender the merchant.
    function _createStore(StoreDepositFactory factory, uint256 depositAmount, uint256 creditAmount)
        internal
        returns (StoreDepositContract)
    {
        uint256[] memory deposits = new uint256[](1);
        uint256[] memory credits = new uint256[](1);
        deposits[0] = depositAmount;
        credits[0] = creditAmount;
        return StoreDepositContract(factory.createStoreContract(STORE_EXPIRE_DAYS, deposits, credits));
    }

    function _fundBonus(MockUSDC usdc, StoreDepositContract store, uint256 amount) internal {
        usdc.approve(address(store), amount);
        store.fundBonus(amount);
    }

    function _deposit(MockUSDC usdc, StoreDepositContract store, uint256 userKey, uint256 tierId) internal {
        StoreDepositContract.Tier memory tier = store.getTier(tierId);
        vm.startBroadcast(userKey);
        usdc.approve(address(store), tier.depositAmount);
        store.userDeposit(tierId);
        vm.stopBroadcast();
    }
}
