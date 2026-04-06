// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StoreDepositContract.sol";

// 工厂合约，批量生成门店储值合约，统一管理
contract StoreDepositFactory {
    // 所有门店合约地址
    address[] public allStoreContracts;
    // 商家钱包 → 门店合约地址列表
    mapping(address => address[]) public merchantContracts;
    // Sepolia测试网USDC地址（固定）
    address public constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    event StoreContractCreated(address indexed merchant, address indexed storeContract);

    // 商家一键创建门店合约
    function createStoreContract(
        uint256 _expireDays,
        uint256[] calldata _depositAmounts,
        uint256[] calldata _creditAmounts
    ) external returns (address) {
        // 部署新的门店储值合约
        StoreDepositContract newStore = new StoreDepositContract(
            msg.sender,
            SEPOLIA_USDC,
            _expireDays,
            _depositAmounts,
            _creditAmounts
        );

        // 记录合约信息
        address storeAddress = address(newStore);
        allStoreContracts.push(storeAddress);
        merchantContracts[msg.sender].push(storeAddress);

        emit StoreContractCreated(msg.sender, storeAddress);
        return storeAddress;
    }

    // 获取商家的所有门店合约
    function getMerchantContracts(address _merchant) external view returns (address[] memory) {
        return merchantContracts[_merchant];
    }

    // 获取所有门店合约
    function getAllStoreContracts() external view returns (address[] memory) {
        return allStoreContracts;
    }
}