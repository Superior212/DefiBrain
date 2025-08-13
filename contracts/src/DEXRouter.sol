// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";

/**
 * @title DEXRouter
 * @dev Core DEX router for DefiBrain's trading functionality
 * @notice Handles token swaps, liquidity provision, and price calculations
 */
contract DEXRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    PriceOracle public immutable priceOracle;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public tradingFee = 30; // 0.3% in basis points
    uint256 public slippageTolerance = 100; // 1% in basis points
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Liquidity pools (simplified AMM)
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        mapping(address => uint256) liquidityShares;
        bool active;
    }
    
    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;
    
    // Events
    event TokenSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    
    event LiquidityAdded(
        address indexed user,
        bytes32 indexed poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event LiquidityRemoved(
        address indexed user,
        bytes32 indexed poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event PoolCreated(
        bytes32 indexed poolId,
        address indexed tokenA,
        address indexed tokenB
    );

    constructor(
        address _priceOracle
    ) Ownable(msg.sender) {
        priceOracle = PriceOracle(_priceOracle);
    }

    /**
     * @dev Add a supported token for trading
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
    }

    /**
     * @dev Create a new liquidity pool
     */
    function createPool(
        address tokenA,
        address tokenB
    ) external onlyOwner returns (bytes32 poolId) {
        require(supportedTokens[tokenA] && supportedTokens[tokenB], "Unsupported tokens");
        require(tokenA != tokenB, "Identical tokens");
        
        // Ensure consistent ordering
        if (tokenA > tokenB) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        
        poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!pools[poolId].active, "Pool already exists");
        
        Pool storage pool = pools[poolId];
        pool.tokenA = tokenA;
        pool.tokenB = tokenB;
        pool.active = true;
        
        poolIds.push(poolId);
        
        emit PoolCreated(poolId, tokenA, tokenB);
    }

    /**
     * @dev Get quote for token swap
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amountOut, uint256 fee) {
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Unsupported tokens");
        
        bytes32 poolId = _getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        
        fee = (amountIn * tradingFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        
        // Simple AMM formula: x * y = k
        if (tokenIn == pool.tokenA) {
            amountOut = (pool.reserveB * amountInAfterFee) / (pool.reserveA + amountInAfterFee);
        } else {
            amountOut = (pool.reserveA * amountInAfterFee) / (pool.reserveB + amountInAfterFee);
        }
    }

    /**
     * @dev Execute token swap
     */
    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external nonReentrant returns (uint256 amountOut) {
        require(supportedTokens[tokenIn] && supportedTokens[tokenOut], "Unsupported tokens");
        require(amountIn > 0, "Invalid amount");
        require(to != address(0), "Invalid recipient");
        
        bytes32 poolId = _getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        
        // Calculate output amount and fee
        uint256 fee;
        (amountOut, fee) = this.getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut >= minAmountOut, "Slippage too high");
        
        // Transfer tokens
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
        
        // Update pool reserves
        if (tokenIn == pool.tokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }
        
        emit TokenSwap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
    }

    /**
     * @dev Add liquidity to a pool
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        bytes32 poolId = _getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        
        // Calculate optimal amounts
        if (pool.reserveA == 0 && pool.reserveB == 0) {
            // First liquidity provision
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            // Maintain pool ratio
            uint256 amountBOptimal = (amountADesired * pool.reserveB) / pool.reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "Insufficient B amount");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = (amountBDesired * pool.reserveA) / pool.reserveB;
                require(amountAOptimal >= amountAMin, "Insufficient A amount");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
        
        // Calculate liquidity tokens
        if (pool.totalLiquidity == 0) {
            liquidity = _sqrt(amountA * amountB);
        } else {
            liquidity = _min(
                (amountA * pool.totalLiquidity) / pool.reserveA,
                (amountB * pool.totalLiquidity) / pool.reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        // Transfer tokens and update state
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
        
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        pool.liquidityShares[msg.sender] += liquidity;
        
        emit LiquidityAdded(msg.sender, poolId, amountA, amountB, liquidity);
    }

    /**
     * @dev Remove liquidity from a pool
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        bytes32 poolId = _getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        require(pool.liquidityShares[msg.sender] >= liquidity, "Insufficient liquidity");
        
        // Calculate token amounts
        amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        require(amountA >= amountAMin && amountB >= amountBMin, "Insufficient output amounts");
        
        // Update state and transfer tokens
        pool.liquidityShares[msg.sender] -= liquidity;
        pool.totalLiquidity -= liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        
        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(msg.sender, poolId, amountA, amountB, liquidity);
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo(bytes32 poolId) external view returns (
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 totalLiquidity,
        bool active
    ) {
        Pool storage pool = pools[poolId];
        return (
            pool.tokenA,
            pool.tokenB,
            pool.reserveA,
            pool.reserveB,
            pool.totalLiquidity,
            pool.active
        );
    }

    /**
     * @dev Get user's liquidity share in a pool
     */
    function getUserLiquidity(bytes32 poolId, address user) external view returns (uint256) {
        return pools[poolId].liquidityShares[user];
    }

    /**
     * @dev Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @dev Get all pool IDs
     */
    function getAllPools() external view returns (bytes32[] memory) {
        return poolIds;
    }

    /**
     * @dev Update trading fee (only owner)
     */
    function setTradingFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        tradingFee = _fee;
    }

    // Internal functions
    function _getPoolId(address tokenA, address tokenB) internal pure returns (bytes32) {
        if (tokenA > tokenB) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        return keccak256(abi.encodePacked(tokenA, tokenB));
    }

    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}