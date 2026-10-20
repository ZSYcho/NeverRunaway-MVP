// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";

/// @notice Writes the per-chain address book read by the web app and the API:
///         packages/shared/src/deployments/<chainId>.json
abstract contract DeploymentWriter is Script {
    string internal constant DEPLOYMENTS_DIR = "../packages/shared/src/deployments/";

    /// @param startBlock First block worth scanning for events (a lower bound is fine).
    /// @param usdcFaucet True when `usdc` is a test token with an open mint, so the UI may offer a faucet.
    function _writeDeployment(address factory, address usdc, uint256 startBlock, bool usdcFaucet) internal {
        // A dry run only simulates against a fork: its addresses don't exist on chain.
        if (!vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) && !vm.isContext(VmSafe.ForgeContext.ScriptResume)) {
            console.log("Dry run: deployment file not written (add --broadcast to deploy).");
            return;
        }

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "factory", factory);
        vm.serializeAddress(key, "usdc", usdc);
        vm.serializeUint(key, "startBlock", startBlock);
        string memory json = vm.serializeBool(key, "usdcFaucet", usdcFaucet);

        string memory path = string.concat(DEPLOYMENTS_DIR, vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
    }
}
