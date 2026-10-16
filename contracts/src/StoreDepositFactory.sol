// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StoreDepositContract} from "./StoreDepositContract.sol";

// Factory: deploys one StoreDepositContract per store and indexes them by merchant.
contract StoreDepositFactory {
    // Stablecoin used by every store from this factory (set per chain at deploy time).
    address public immutable usdcToken;
    address[] public allStoreContracts;
    mapping(address => address[]) public merchantContracts;

    event StoreContractCreated(address indexed merchant, address indexed storeContract);

    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "Zero USDC address");
        usdcToken = _usdcToken;
    }

    function createStoreContract(
        uint256 _expireDays,
        uint256[] calldata _depositAmounts,
        uint256[] calldata _creditAmounts
    ) external returns (address) {
        StoreDepositContract newStore = new StoreDepositContract(
            msg.sender, usdcToken, _expireDays, _depositAmounts, _creditAmounts
        );

        address storeAddress = address(newStore);
        allStoreContracts.push(storeAddress);
        merchantContracts[msg.sender].push(storeAddress);

        emit StoreContractCreated(msg.sender, storeAddress);
        return storeAddress;
    }

    function getMerchantContracts(address _merchant) external view returns (address[] memory) {
        return merchantContracts[_merchant];
    }

    function getAllStoreContracts() external view returns (address[] memory) {
        return allStoreContracts;
    }
}
