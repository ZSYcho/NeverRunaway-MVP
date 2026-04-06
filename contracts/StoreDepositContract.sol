// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


// 门店储值合约，每个快餐店对应一个独立合约
contract StoreDepositContract is ReentrancyGuard {
    // 商家钱包地址
    address public immutable merchant;
    // 稳定币USDC合约地址（Sepolia测试网USDC地址）
    IERC20 public immutable usdcToken;
    // 储值有效期
    uint256 public immutable expireTime;
    // 储值档位：充值金额 → 赠送消费积分
    mapping(uint256 => uint256) public depositTier;
    // 用户钱包 → 消费积分余额
    mapping(address => uint256) public userCredit;
    // 商家可提现余额
    uint256 public merchantWithdrawable;
    // 合约总锁定资金
    uint256 public totalLocked;

    // 事件
    event Deposit(address indexed user, uint256 depositAmount, uint256 creditAmount);
    event Consume(address indexed user, address indexed merchant, uint256 consumeAmount);
    event Withdraw(address indexed merchant, uint256 withdrawAmount);
    event Refund(address indexed user, uint256 refundAmount);

    // 构造函数，仅工厂合约可部署
    constructor(
        address _merchant,
        address _usdcToken,
        uint256 _expireDays,
        uint256[] memory _depositAmounts,
        uint256[] memory _creditAmounts
    ) {
        merchant = _merchant;
        usdcToken = IERC20(_usdcToken);
        expireTime = block.timestamp + _expireDays * 1 days;
        
        // 初始化储值档位
        require(_depositAmounts.length == _creditAmounts.length, "Tier length mismatch");
        for (uint256 i = 0; i < _depositAmounts.length; i++) {
            depositTier[_depositAmounts[i]] = _creditAmounts[i];
        }
    }

    // 修饰器：仅商家可调用
    modifier onlyMerchant() {
        require(msg.sender == merchant, "Only merchant can call");
        _;
    }

    // 1. 用户储值
    function userDeposit(uint256 _depositAmount) external nonReentrant {
        require(depositTier[_depositAmount] > 0, "Invalid deposit tier");
        require(block.timestamp < expireTime, "Deposit expired");
        
        // 从用户钱包转入USDC到合约
        bool success = usdcToken.transferFrom(msg.sender, address(this), _depositAmount);
        require(success, "USDC transfer failed");
        
        // 给用户发放消费积分
        uint256 creditAmount = depositTier[_depositAmount];
        userCredit[msg.sender] += creditAmount;
        totalLocked += _depositAmount;

        emit Deposit(msg.sender, _depositAmount, creditAmount);
    }

    // 2. 消费核销（商家发起，用户签名确认）
    function userConsume(address _user, uint256 _consumeAmount) external onlyMerchant nonReentrant {
        require(userCredit[_user] >= _consumeAmount, "Insufficient credit");
        require(block.timestamp < expireTime, "Contract expired");
        
        // 扣除用户消费积分
        userCredit[_user] -= _consumeAmount;
        // 划入商家可提现池
        merchantWithdrawable += _consumeAmount;
        // 减少锁定资金
        totalLocked -= _consumeAmount;

        emit Consume(_user, merchant, _consumeAmount);
    }

    // 3. 商家提现
    function merchantWithdraw() external onlyMerchant nonReentrant {
        uint256 amount = merchantWithdrawable;
        require(amount > 0, "No withdrawable balance");
        
        // 清零可提现余额，防止重入攻击
        merchantWithdrawable = 0;
        // 转账USDC给商家
        bool success = usdcToken.transfer(merchant, amount);
        require(success, "USDC transfer failed");

        emit Withdraw(merchant, amount);
    }

    // 4. 用户到期退款
    function userRefund() external nonReentrant {
        require(block.timestamp >= expireTime, "Contract not expired");
        uint256 userCreditBalance = userCredit[msg.sender];
        require(userCreditBalance > 0, "No credit to refund");
        
        // 清零用户积分
        userCredit[msg.sender] = 0;
        // 减少锁定资金
        totalLocked -= userCreditBalance;
        // 原路退回USDC
        bool success = usdcToken.transfer(msg.sender, userCreditBalance);
        require(success, "USDC transfer failed");

        emit Refund(msg.sender, userCreditBalance);
    }

    // 查询用户积分余额
    function getUserCredit(address _user) external view returns (uint256) {
        return userCredit[_user];
    }
}