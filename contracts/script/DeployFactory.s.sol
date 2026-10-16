// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {StoreDepositFactory} from "../src/StoreDepositFactory.sol";

/// Usage (Sepolia):
///   forge script script/DeployFactory.s.sol --rpc-url $SEPOLIA_RPC_URL --account <keystore> --broadcast
/// Override the token with USDC_ADDRESS=0x... for other chains.
contract DeployFactory is Script {
    // Circle's official USDC on Sepolia.
    address constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external returns (StoreDepositFactory factory) {
        address usdc = vm.envOr("USDC_ADDRESS", SEPOLIA_USDC);
        vm.startBroadcast();
        factory = new StoreDepositFactory(usdc);
        vm.stopBroadcast();
        console.log("StoreDepositFactory:", address(factory));
        console.log("USDC:", usdc);
    }
}
