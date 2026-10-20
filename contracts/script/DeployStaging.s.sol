// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/Script.sol";
import {StoreDepositFactory} from "../src/StoreDepositFactory.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";
import {DeploymentWriter} from "./utils/DeploymentWriter.sol";

/// @notice Staging deployment for public testnets: an open-mint test USDC (so anyone trying the demo
///         can use the in-app faucet) and the factory. Stores are created by merchants through the app.
/// Usage (X Layer testnet), with an encrypted keystore account:
///   forge script script/DeployStaging.s.sol --rpc-url https://testrpc.xlayer.tech/terigon \
///     --account nr-deployer --broadcast
/// For a real stablecoin use DeployFactory.s.sol instead.
contract DeployStaging is DeploymentWriter {
    uint256 internal constant X_LAYER_TESTNET = 1952;
    uint256 internal constant SEPOLIA = 11155111;

    function run() external {
        // An open-mint token must never reach a chain where it could be mistaken for real USDC.
        require(block.chainid == X_LAYER_TESTNET || block.chainid == SEPOLIA, "DeployStaging: testnets only");
        uint256 startBlock = block.number;

        vm.startBroadcast();
        MockUSDC usdc = new MockUSDC();
        StoreDepositFactory factory = new StoreDepositFactory(address(usdc));
        vm.stopBroadcast();

        _writeDeployment(address(factory), address(usdc), startBlock, true);

        console.log("USDC (test token):  ", address(usdc));
        console.log("StoreDepositFactory:", address(factory));
    }
}
