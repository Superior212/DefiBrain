// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDC
 * @dev A  USDC token for testing the DefiBrainVault on Mantle Sepolia testnet
 */
contract USDC is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("USDC", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC has 6 decimals
        
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }
    
    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Allows the owner to mint additional tokens
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}