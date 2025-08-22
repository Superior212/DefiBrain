// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WETH
 * @dev A Wrapped Ether token for testing the DefiBrain platform on Mantle Sepolia testnet
 */
contract WETH is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("Wrapped Ether", "WETH") Ownable(msg.sender) {
        _decimals = 18; // WETH has 18 decimals like ETH
        
        // Mint 1000 tokens to the deployer
        _mint(msg.sender, 1_000 * 10**_decimals);
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
    
    /**
     * @dev Deposit ETH and mint WETH tokens
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw ETH by burning WETH tokens
     * @param amount Amount of WETH to burn for ETH
     */
    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
    
    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        deposit();
    }
}