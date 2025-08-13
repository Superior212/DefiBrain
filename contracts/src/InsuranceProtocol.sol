// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PriceOracle.sol";
import "./PortfolioTracker.sol";

/**
 * @title InsuranceProtocol
 * @dev Comprehensive insurance and risk management system for DefiBrain platform
 * @author DefiBrain Team
 */
contract InsuranceProtocol is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Insurance types
    enum InsuranceType {
        SMART_CONTRACT_RISK,
        IMPERMANENT_LOSS,
        LIQUIDATION_PROTECTION,
        ORACLE_FAILURE,
        BRIDGE_RISK,
        PROTOCOL_HACK,
        SLASHING_PROTECTION,
        YIELD_LOSS
    }
    
    // Policy status
    enum PolicyStatus {
        ACTIVE,
        EXPIRED,
        CLAIMED,
        CANCELLED,
        SUSPENDED
    }
    
    // Claim status
    enum ClaimStatus {
        PENDING,
        INVESTIGATING,
        APPROVED,
        REJECTED,
        PAID
    }
    
    // Insurance policy structure
    struct InsurancePolicy {
        uint256 id;
        address policyholder;
        InsuranceType insuranceType;
        uint256 coverageAmount;
        uint256 premium;
        uint256 startTime;
        uint256 endTime;
        address coveredAsset;
        address coveredProtocol;
        PolicyStatus status;
        uint256 deductible;
        string terms;
    }
    
    // Insurance claim structure
    struct InsuranceClaim {
        uint256 id;
        uint256 policyId;
        address claimant;
        uint256 claimAmount;
        string description;
        string evidence;
        uint256 incidentTime;
        uint256 claimTime;
        ClaimStatus status;
        uint256 approvedAmount;
        string assessorNotes;
        address assessor;
    }
    
    // Risk assessment structure
    struct RiskAssessment {
        address protocol;
        uint256 riskScore; // 0-100
        uint256 tvlRisk;
        uint256 codeRisk;
        uint256 teamRisk;
        uint256 auditScore;
        uint256 lastUpdated;
        bool isActive;
    }
    
    // Insurance pool structure
    struct InsurancePool {
        IERC20 asset;
        uint256 totalFunds;
        uint256 availableFunds;
        uint256 reserveRatio; // percentage
        uint256 totalCoverage;
        uint256 totalPremiums;
        bool isActive;
    }
    
    // Underwriter structure
    struct Underwriter {
        address underwriter;
        uint256 stake;
        uint256 reputation;
        uint256 totalCoverage;
        uint256 activePolicies;
        bool isActive;
    }
    
    // State variables
    mapping(uint256 => InsurancePolicy) public policies;
    mapping(uint256 => InsuranceClaim) public claims;
    mapping(address => RiskAssessment) public riskAssessments;
    mapping(address => InsurancePool) public insurancePools;
    mapping(address => Underwriter) public underwriters;
    mapping(address => uint256[]) public userPolicies;
    mapping(address => uint256[]) public userClaims;
    mapping(address => bool) public authorizedAssessors;
    mapping(InsuranceType => uint256) public basePremiumRates;
    
    uint256 public policyCount;
    uint256 public claimCount;
    uint256 public totalInsuredValue;
    uint256 public totalClaimsPaid;
    uint256 public minimumStake;
    uint256 public assessmentPeriod;
    
    // External contracts
    PriceOracle public priceOracle;
    PortfolioTracker public portfolioTracker;
    
    // Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed policyholder,
        InsuranceType insuranceType,
        uint256 coverageAmount,
        uint256 premium
    );
    
    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        address indexed claimant,
        uint256 claimAmount
    );
    
    event ClaimProcessed(
        uint256 indexed claimId,
        ClaimStatus status,
        uint256 approvedAmount
    );
    
    event PremiumPaid(
        uint256 indexed policyId,
        address indexed policyholder,
        uint256 amount
    );
    
    event RiskAssessmentUpdated(
        address indexed protocol,
        uint256 riskScore,
        uint256 timestamp
    );
    
    event UnderwriterRegistered(
        address indexed underwriter,
        uint256 stake
    );
    
    event InsurancePoolCreated(
        address indexed asset,
        uint256 initialFunds
    );
    
    constructor(
        address _priceOracle,
        address _portfolioTracker,
        uint256 _minimumStake,
        uint256 _assessmentPeriod
    ) Ownable(msg.sender) {
        priceOracle = PriceOracle(_priceOracle);
        portfolioTracker = PortfolioTracker(_portfolioTracker);
        minimumStake = _minimumStake;
        assessmentPeriod = _assessmentPeriod;
        
        // Initialize base premium rates (basis points)
        basePremiumRates[InsuranceType.SMART_CONTRACT_RISK] = 500; // 5%
        basePremiumRates[InsuranceType.IMPERMANENT_LOSS] = 300; // 3%
        basePremiumRates[InsuranceType.LIQUIDATION_PROTECTION] = 200; // 2%
        basePremiumRates[InsuranceType.ORACLE_FAILURE] = 150; // 1.5%
        basePremiumRates[InsuranceType.BRIDGE_RISK] = 400; // 4%
        basePremiumRates[InsuranceType.PROTOCOL_HACK] = 600; // 6%
        basePremiumRates[InsuranceType.SLASHING_PROTECTION] = 250; // 2.5%
        basePremiumRates[InsuranceType.YIELD_LOSS] = 100; // 1%
    }
    
    /**
     * @dev Create an insurance policy
     */
    function createPolicy(
        InsuranceType insuranceType,
        uint256 coverageAmount,
        uint256 duration,
        address coveredAsset,
        address coveredProtocol,
        uint256 deductible,
        string memory terms
    ) external payable nonReentrant returns (uint256) {
        require(coverageAmount > 0, "Coverage amount must be positive");
        require(duration > 0, "Duration must be positive");
        require(duration <= 365 days, "Duration too long");
        
        // Calculate premium
        uint256 premium = calculatePremium(
            insuranceType,
            coverageAmount,
            duration,
            coveredProtocol
        );
        
        require(msg.value >= premium, "Insufficient premium payment");
        
        uint256 policyId = ++policyCount;
        
        policies[policyId] = InsurancePolicy({
            id: policyId,
            policyholder: msg.sender,
            insuranceType: insuranceType,
            coverageAmount: coverageAmount,
            premium: premium,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            coveredAsset: coveredAsset,
            coveredProtocol: coveredProtocol,
            status: PolicyStatus.ACTIVE,
            deductible: deductible,
            terms: terms
        });
        
        userPolicies[msg.sender].push(policyId);
        totalInsuredValue += coverageAmount;
        
        // Refund excess payment
        if (msg.value > premium) {
            payable(msg.sender).transfer(msg.value - premium);
        }
        
        emit PolicyCreated(policyId, msg.sender, insuranceType, coverageAmount, premium);
        emit PremiumPaid(policyId, msg.sender, premium);
        
        return policyId;
    }
    
    /**
     * @dev Submit an insurance claim
     */
    function submitClaim(
        uint256 policyId,
        uint256 claimAmount,
        string memory description,
        string memory evidence,
        uint256 incidentTime
    ) external returns (uint256) {
        InsurancePolicy storage policy = policies[policyId];
        require(policy.policyholder == msg.sender, "Not policy holder");
        require(policy.status == PolicyStatus.ACTIVE, "Policy not active");
        require(block.timestamp <= policy.endTime, "Policy expired");
        require(claimAmount <= policy.coverageAmount, "Claim exceeds coverage");
        require(incidentTime >= policy.startTime, "Incident before policy start");
        require(incidentTime <= block.timestamp, "Incident in future");
        
        uint256 claimId = ++claimCount;
        
        claims[claimId] = InsuranceClaim({
            id: claimId,
            policyId: policyId,
            claimant: msg.sender,
            claimAmount: claimAmount,
            description: description,
            evidence: evidence,
            incidentTime: incidentTime,
            claimTime: block.timestamp,
            status: ClaimStatus.PENDING,
            approvedAmount: 0,
            assessorNotes: "",
            assessor: address(0)
        });
        
        userClaims[msg.sender].push(claimId);
        
        emit ClaimSubmitted(claimId, policyId, msg.sender, claimAmount);
        
        return claimId;
    }
    
    /**
     * @dev Process an insurance claim (assessor only)
     */
    function processClaim(
        uint256 claimId,
        ClaimStatus newStatus,
        uint256 approvedAmount,
        string memory assessorNotes
    ) external {
        require(authorizedAssessors[msg.sender], "Not authorized assessor");
        
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING || claim.status == ClaimStatus.INVESTIGATING, "Invalid claim status");
        
        if (newStatus == ClaimStatus.APPROVED) {
            require(approvedAmount > 0, "Approved amount must be positive");
            require(approvedAmount <= claim.claimAmount, "Approved amount exceeds claim");
            
            InsurancePolicy storage policy = policies[claim.policyId];
            require(approvedAmount >= policy.deductible, "Amount below deductible");
            
            // Deduct deductible
            approvedAmount -= policy.deductible;
        }
        
        claim.status = newStatus;
        claim.approvedAmount = approvedAmount;
        claim.assessorNotes = assessorNotes;
        claim.assessor = msg.sender;
        
        emit ClaimProcessed(claimId, newStatus, approvedAmount);
        
        // Auto-pay if approved
        if (newStatus == ClaimStatus.APPROVED) {
            _payClaim(claimId);
        }
    }
    
    /**
     * @dev Pay an approved claim
     */
    function _payClaim(uint256 claimId) internal {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.APPROVED, "Claim not approved");
        require(claim.approvedAmount > 0, "No approved amount");
        
        // Check pool funds
        require(address(this).balance >= claim.approvedAmount, "Insufficient pool funds");
        
        claim.status = ClaimStatus.PAID;
        totalClaimsPaid += claim.approvedAmount;
        
        // Transfer payment
        payable(claim.claimant).transfer(claim.approvedAmount);
        
        // Update policy status
        policies[claim.policyId].status = PolicyStatus.CLAIMED;
    }
    
    /**
     * @dev Calculate premium for insurance policy
     */
    function calculatePremium(
        InsuranceType insuranceType,
        uint256 coverageAmount,
        uint256 duration,
        address coveredProtocol
    ) public view returns (uint256) {
        uint256 basePremium = (coverageAmount * basePremiumRates[insuranceType]) / 10000;
        
        // Adjust for duration (annual rate)
        uint256 durationAdjusted = (basePremium * duration) / 365 days;
        
        // Adjust for protocol risk
        uint256 riskMultiplier = 100; // Default 100% (no adjustment)
        if (coveredProtocol != address(0)) {
            RiskAssessment memory risk = riskAssessments[coveredProtocol];
            if (risk.isActive) {
                riskMultiplier = 50 + risk.riskScore; // 50-150% based on risk score
            }
        }
        
        return (durationAdjusted * riskMultiplier) / 100;
    }
    
    /**
     * @dev Update risk assessment for a protocol
     */
    function updateRiskAssessment(
        address protocol,
        uint256 riskScore,
        uint256 tvlRisk,
        uint256 codeRisk,
        uint256 teamRisk,
        uint256 auditScore
    ) external {
        require(authorizedAssessors[msg.sender], "Not authorized assessor");
        require(riskScore <= 100, "Risk score too high");
        
        riskAssessments[protocol] = RiskAssessment({
            protocol: protocol,
            riskScore: riskScore,
            tvlRisk: tvlRisk,
            codeRisk: codeRisk,
            teamRisk: teamRisk,
            auditScore: auditScore,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        emit RiskAssessmentUpdated(protocol, riskScore, block.timestamp);
    }
    
    /**
     * @dev Register as an underwriter
     */
    function registerUnderwriter() external payable {
        require(msg.value >= minimumStake, "Insufficient stake");
        require(!underwriters[msg.sender].isActive, "Already registered");
        
        underwriters[msg.sender] = Underwriter({
            underwriter: msg.sender,
            stake: msg.value,
            reputation: 50, // Starting reputation
            totalCoverage: 0,
            activePolicies: 0,
            isActive: true
        });
        
        emit UnderwriterRegistered(msg.sender, msg.value);
    }
    
    /**
     * @dev Create insurance pool for an asset
     */
    function createInsurancePool(
        address asset,
        uint256 reserveRatio
    ) external payable onlyOwner {
        require(address(insurancePools[asset].asset) == address(0), "Pool already exists");
        require(reserveRatio <= 100, "Invalid reserve ratio");
        
        insurancePools[asset] = InsurancePool({
            asset: IERC20(asset),
            totalFunds: msg.value,
            availableFunds: msg.value,
            reserveRatio: reserveRatio,
            totalCoverage: 0,
            totalPremiums: 0,
            isActive: true
        });
        
        emit InsurancePoolCreated(asset, msg.value);
    }
    
    /**
     * @dev Get user policies
     */
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }
    
    /**
     * @dev Get user claims
     */
    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }
    
    /**
     * @dev Get policy details
     */
    function getPolicy(uint256 policyId) external view returns (InsurancePolicy memory) {
        return policies[policyId];
    }
    
    /**
     * @dev Get claim details
     */
    function getClaim(uint256 claimId) external view returns (InsuranceClaim memory) {
        return claims[claimId];
    }
    
    /**
     * @dev Check if policy is active
     */
    function isPolicyActive(uint256 policyId) external view returns (bool) {
        InsurancePolicy memory policy = policies[policyId];
        return policy.status == PolicyStatus.ACTIVE && block.timestamp <= policy.endTime;
    }
    
    /**
     * @dev Authorize assessor
     */
    function authorizeAssessor(address assessor, bool authorized) external onlyOwner {
        authorizedAssessors[assessor] = authorized;
    }
    
    /**
     * @dev Update base premium rate
     */
    function updateBasePremiumRate(InsuranceType insuranceType, uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20%
        basePremiumRates[insuranceType] = newRate;
    }
    
    /**
     * @dev Update minimum stake
     */
    function updateMinimumStake(uint256 newMinimumStake) external onlyOwner {
        minimumStake = newMinimumStake;
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    
    /**
     * @dev Cancel policy (before expiry)
     */
    function cancelPolicy(uint256 policyId) external {
        InsurancePolicy storage policy = policies[policyId];
        require(policy.policyholder == msg.sender, "Not policy holder");
        require(policy.status == PolicyStatus.ACTIVE, "Policy not active");
        require(block.timestamp < policy.endTime, "Policy already expired");
        
        policy.status = PolicyStatus.CANCELLED;
        totalInsuredValue -= policy.coverageAmount;
        
        // Partial premium refund (50% if cancelled)
        uint256 refund = policy.premium / 2;
        if (address(this).balance >= refund) {
            payable(msg.sender).transfer(refund);
        }
    }
    
    /**
     * @dev Receive ETH for insurance pool
     */
    receive() external payable {
        // Funds added to general insurance pool
    }
}