// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GOATCredits
 * @dev ERC20 token representing GOAT game credits
 * Users can purchase credits by depositing USDC
 */
contract GOATCredits is ERC20, Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    uint256 public creditPrice = 1e6; // 1 USDC (6 decimals) = 1 credit
    
    event CreditsPurchased(address indexed buyer, uint256 usdcAmount, uint256 creditsAmount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event USDCWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor sets the USDC token address
     * @param _usdc Address of the USDC token contract on Base
     */
    constructor(address _usdc) ERC20("GOAT Credits", "GOAT") {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Purchase credits by depositing USDC
     * @param usdcAmount Amount of USDC to deposit (6 decimals)
     */
    function buyCredits(uint256 usdcAmount) external nonReentrant {
        require(usdcAmount > 0, "Amount must be greater than 0");
        require(usdcAmount >= creditPrice, "Amount too small");
        
        // Calculate credits (GOAT has 18 decimals)
        uint256 credits = (usdcAmount * 1e18) / creditPrice;
        
        // Transfer USDC from buyer to this contract
        require(
            usdc.transferFrom(msg.sender, address(this), usdcAmount),
            "USDC transfer failed"
        );
        
        // Mint GOAT credits to buyer
        _mint(msg.sender, credits);
        
        emit CreditsPurchased(msg.sender, usdcAmount, credits);
    }

    /**
     * @dev Update the credit price (admin only)
     * @param newPrice New price in USDC (6 decimals)
     */
    function setPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = creditPrice;
        creditPrice = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }

    /**
     * @dev Withdraw accumulated USDC (admin only)
     * @param amount Amount of USDC to withdraw
     */
    function withdrawUSDC(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        require(usdc.transfer(owner(), amount), "Transfer failed");
        emit USDCWithdrawn(owner(), amount);
    }

    /**
     * @dev Get USDC balance of the contract
     */
    function getUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Get credit balance of an address
     * @param account Address to query
     */
    function getCreditBalance(address account) external view returns (uint256) {
        return balanceOf(account);
    }
}
