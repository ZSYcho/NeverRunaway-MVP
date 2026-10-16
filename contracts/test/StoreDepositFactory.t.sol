// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StoreDepositFactory} from "../src/StoreDepositFactory.sol";
import {StoreDepositContract} from "../src/StoreDepositContract.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract StoreDepositFactoryTest is Test {
    function test_CreateStore_SetsCallerAsMerchantAndFactoryToken() public {
        MockUSDC usdc = new MockUSDC();
        StoreDepositFactory factory = new StoreDepositFactory(address(usdc));
        address merchant = makeAddr("merchant");

        uint256[] memory deposits = new uint256[](1);
        uint256[] memory credits = new uint256[](1);
        deposits[0] = 10e6;
        credits[0] = 12e6;

        vm.prank(merchant);
        address storeAddr = factory.createStoreContract(365, deposits, credits);

        StoreDepositContract store = StoreDepositContract(storeAddr);
        assertEq(store.merchant(), merchant);
        assertEq(address(store.usdcToken()), address(usdc));
        assertEq(store.getTier(0).depositAmount, 10e6);
        assertEq(store.getTier(0).creditAmount, 12e6);
        assertEq(factory.getMerchantContracts(merchant)[0], storeAddr);
        assertEq(factory.getAllStoreContracts().length, 1);
    }
}
