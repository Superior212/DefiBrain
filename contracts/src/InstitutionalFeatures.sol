// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./DefiBrainVault.sol";
import "./PortfolioTracker.sol";
import "./PriceOracle.sol";

/**
 * @title InstitutionalFeatures
 * @dev Enterprise-grade features for institutional users of DefiBrain platform
 * @author DefiBrain Team
 */
contract InstitutionalFeatures is Ownable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    
    // Roles
    bytes32 public constant INSTITUTION_ADMIN = keccak256("INSTITUTION_ADMIN");
    bytes32 public constant COMPLIANCE_OFFICER = keccak256("COMPLIANCE_OFFICER");
    bytes32 public constant RISK_MANAGER = keccak256("RISK_MANAGER");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");
    
    // Institution types
    enum InstitutionType {
        HEDGE_FUND,
        PENSION_FUND,
        INSURANCE_COMPANY,
        BANK,
        FAMILY_OFFICE,
        SOVEREIGN_WEALTH_FUND,
        ENDOWMENT,
        CORPORATE_TREASURY
    }
    
    // KYC status
    enum KYCStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED,
        SUSPENDED
    }
    
    // Transaction types for reporting
    enum TransactionType {
        DEPOSIT,
        WITHDRAWAL,
        TRADE,
        YIELD_CLAIM,
        REBALANCE,
        LIQUIDATION
    }
    
    // Institution profile
    struct Institution {
        uint256 id;
        string name;
        InstitutionType institutionType;
        address primaryContact;
        address[] authorizedUsers;
        uint256 aum; // Assets Under Management
        uint256 riskLimit;
        uint256 dailyWithdrawalLimit;
        KYCStatus kycStatus;
        uint256 kycExpiry;
        bool isActive;
        string jurisdiction;
        string regulatoryLicense;
    }
    
    // Multi-signature wallet configuration
    struct MultiSigConfig {
        address[] signers;
        uint256 requiredSignatures;
        uint256 timelock;
        bool isActive;
    }
    
    // Transaction for multi-sig approval
    struct PendingTransaction {
        uint256 id;
        address institution;
        address target;
        uint256 value;
        bytes data;
        uint256 timestamp;
        uint256 approvals;
        mapping(address => bool) hasApproved;
        bool executed;
        string description;
    }
    
    // Compliance rule
    struct ComplianceRule {
        uint256 id;
        string name;
        string description;
        bool isActive;
        uint256 maxTransactionAmount;
        uint256 dailyTransactionLimit;
        address[] allowedTokens;
        address[] blockedAddresses;
        string[] requiredDocuments;
    }
    
    // Audit trail entry
    struct AuditEntry {
        uint256 timestamp;
        address user;
        TransactionType transactionType;
        address asset;
        uint256 amount;
        string description;
        bytes32 txHash;
    }
    
    // Risk metrics
    struct RiskMetrics {
        uint256 var95; // Value at Risk 95%
        uint256 var99; // Value at Risk 99%
        uint256 expectedShortfall;
        uint256 maxDrawdown;
        uint256 volatility;
        uint256 sharpeRatio;
        uint256 beta;
        uint256 lastUpdated;
    }
    
    // State variables
    mapping(address => Institution) public institutions;
    mapping(address => MultiSigConfig) public multiSigConfigs;
    mapping(uint256 => PendingTransaction) public pendingTransactions;
    mapping(uint256 => ComplianceRule) public complianceRules;
    mapping(address => AuditEntry[]) public auditTrails;
    mapping(address => RiskMetrics) public riskMetrics;
    mapping(address => uint256) public dailyWithdrawals;
    mapping(address => uint256) public lastWithdrawalReset;
    mapping(address => bool) public whitelistedInstitutions;
    
    uint256 public institutionCount;
    uint256 public transactionCount;
    uint256 public complianceRuleCount;
    uint256 public minimumAUM;
    uint256 public kycValidityPeriod;
    
    // External contracts
    DefiBrainVault public vault;
    PortfolioTracker public portfolioTracker;
    PriceOracle public priceOracle;
    
    // Events
    event InstitutionRegistered(
        address indexed institution,
        string name,
        InstitutionType institutionType,
        uint256 aum
    );
    
    event KYCStatusUpdated(
        address indexed institution,
        KYCStatus oldStatus,
        KYCStatus newStatus
    );
    
    event MultiSigConfigured(
        address indexed institution,
        address[] signers,
        uint256 requiredSignatures
    );
    
    event TransactionProposed(
        uint256 indexed transactionId,
        address indexed institution,
        address target,
        uint256 value
    );
    
    event TransactionApproved(
        uint256 indexed transactionId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    event TransactionExecuted(
        uint256 indexed transactionId,
        address indexed institution
    );
    
    event ComplianceRuleCreated(
        uint256 indexed ruleId,
        string name,
        uint256 maxTransactionAmount
    );
    
    event ComplianceViolation(
        address indexed institution,
        uint256 ruleId,
        string violation
    );
    
    event AuditEntryAdded(
        address indexed institution,
        TransactionType transactionType,
        uint256 amount
    );
    
    constructor(
        address _vault,
        address _portfolioTracker,
        address _priceOracle,
        uint256 _minimumAUM,
        uint256 _kycValidityPeriod
    ) Ownable(msg.sender) {
        vault = DefiBrainVault(_vault);
        portfolioTracker = PortfolioTracker(_portfolioTracker);
        priceOracle = PriceOracle(_priceOracle);
        minimumAUM = _minimumAUM;
        kycValidityPeriod = _kycValidityPeriod;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER, msg.sender);
        _grantRole(RISK_MANAGER, msg.sender);
        _grantRole(AUDITOR, msg.sender);
    }
    
    /**
     * @dev Register a new institution
     */
    function registerInstitution(
        string memory name,
        InstitutionType institutionType,
        address primaryContact,
        address[] memory authorizedUsers,
        uint256 aum,
        uint256 riskLimit,
        uint256 dailyWithdrawalLimit,
        string memory jurisdiction,
        string memory regulatoryLicense
    ) external onlyRole(INSTITUTION_ADMIN) returns (uint256) {
        require(aum >= minimumAUM, "AUM below minimum requirement");
        require(primaryContact != address(0), "Invalid primary contact");
        require(bytes(name).length > 0, "Institution name required");
        
        uint256 institutionId = ++institutionCount;
        
        institutions[primaryContact] = Institution({
            id: institutionId,
            name: name,
            institutionType: institutionType,
            primaryContact: primaryContact,
            authorizedUsers: authorizedUsers,
            aum: aum,
            riskLimit: riskLimit,
            dailyWithdrawalLimit: dailyWithdrawalLimit,
            kycStatus: KYCStatus.PENDING,
            kycExpiry: 0,
            isActive: false,
            jurisdiction: jurisdiction,
            regulatoryLicense: regulatoryLicense
        });
        
        emit InstitutionRegistered(primaryContact, name, institutionType, aum);
        
        return institutionId;
    }
    
    /**
     * @dev Update KYC status
     */
    function updateKYCStatus(
        address institution,
        KYCStatus newStatus
    ) external onlyRole(COMPLIANCE_OFFICER) {
        Institution storage inst = institutions[institution];
        require(inst.id > 0, "Institution not found");
        
        KYCStatus oldStatus = inst.kycStatus;
        inst.kycStatus = newStatus;
        
        if (newStatus == KYCStatus.APPROVED) {
            inst.kycExpiry = block.timestamp + kycValidityPeriod;
            inst.isActive = true;
            whitelistedInstitutions[institution] = true;
        } else if (newStatus == KYCStatus.REJECTED || newStatus == KYCStatus.SUSPENDED) {
            inst.isActive = false;
            whitelistedInstitutions[institution] = false;
        }
        
        emit KYCStatusUpdated(institution, oldStatus, newStatus);
    }
    
    /**
     * @dev Configure multi-signature wallet
     */
    function configureMultiSig(
        address[] memory signers,
        uint256 requiredSignatures,
        uint256 timelock
    ) external {
        require(institutions[msg.sender].isActive, "Institution not active");
        require(signers.length >= requiredSignatures, "Invalid signature requirement");
        require(requiredSignatures > 0, "At least one signature required");
        
        multiSigConfigs[msg.sender] = MultiSigConfig({
            signers: signers,
            requiredSignatures: requiredSignatures,
            timelock: timelock,
            isActive: true
        });
        
        emit MultiSigConfigured(msg.sender, signers, requiredSignatures);
    }
    
    /**
     * @dev Propose a transaction for multi-sig approval
     */
    function proposeTransaction(
        address target,
        uint256 value,
        bytes memory data,
        string memory description
    ) external returns (uint256) {
        require(institutions[msg.sender].isActive, "Institution not active");
        require(_isAuthorizedSigner(msg.sender), "Not authorized signer");
        
        uint256 transactionId = ++transactionCount;
        
        PendingTransaction storage txn = pendingTransactions[transactionId];
        txn.id = transactionId;
        txn.institution = msg.sender;
        txn.target = target;
        txn.value = value;
        txn.data = data;
        txn.timestamp = block.timestamp;
        txn.description = description;
        
        emit TransactionProposed(transactionId, msg.sender, target, value);
        
        return transactionId;
    }
    
    /**
     * @dev Approve a pending transaction
     */
    function approveTransaction(uint256 transactionId) external {
        PendingTransaction storage txn = pendingTransactions[transactionId];
        require(txn.id > 0, "Transaction not found");
        require(!txn.executed, "Transaction already executed");
        require(_isAuthorizedSigner(msg.sender), "Not authorized signer");
        require(!txn.hasApproved[msg.sender], "Already approved");
        
        txn.hasApproved[msg.sender] = true;
        txn.approvals++;
        
        emit TransactionApproved(transactionId, msg.sender, txn.approvals);
        
        // Auto-execute if enough approvals
        MultiSigConfig memory config = multiSigConfigs[txn.institution];
        if (txn.approvals >= config.requiredSignatures) {
            _executeTransaction(transactionId);
        }
    }
    
    /**
     * @dev Execute approved transaction
     */
    function _executeTransaction(uint256 transactionId) internal {
        PendingTransaction storage txn = pendingTransactions[transactionId];
        require(!txn.executed, "Transaction already executed");
        
        MultiSigConfig memory config = multiSigConfigs[txn.institution];
        require(txn.approvals >= config.requiredSignatures, "Insufficient approvals");
        require(block.timestamp >= txn.timestamp + config.timelock, "Timelock not expired");
        
        txn.executed = true;
        
        // Execute the transaction
        (bool success, ) = txn.target.call{value: txn.value}(txn.data);
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(transactionId, txn.institution);
        
        // Add to audit trail
        _addAuditEntry(
            txn.institution,
            TransactionType.TRADE,
            address(0),
            txn.value,
            txn.description
        );
    }
    
    /**
     * @dev Create compliance rule
     */
    function createComplianceRule(
        string memory name,
        string memory description,
        uint256 maxTransactionAmount,
        uint256 dailyTransactionLimit,
        address[] memory allowedTokens,
        address[] memory blockedAddresses,
        string[] memory requiredDocuments
    ) external onlyRole(COMPLIANCE_OFFICER) returns (uint256) {
        uint256 ruleId = ++complianceRuleCount;
        
        complianceRules[ruleId] = ComplianceRule({
            id: ruleId,
            name: name,
            description: description,
            isActive: true,
            maxTransactionAmount: maxTransactionAmount,
            dailyTransactionLimit: dailyTransactionLimit,
            allowedTokens: allowedTokens,
            blockedAddresses: blockedAddresses,
            requiredDocuments: requiredDocuments
        });
        
        emit ComplianceRuleCreated(ruleId, name, maxTransactionAmount);
        
        return ruleId;
    }
    
    /**
     * @dev Check compliance for a transaction
     */
    function checkCompliance(
        address institution,
        uint256 amount,
        address token
    ) external view returns (bool, string memory) {
        Institution memory inst = institutions[institution];
        
        // Check if institution is active and KYC approved
        if (!inst.isActive || inst.kycStatus != KYCStatus.APPROVED) {
            return (false, "Institution not active or KYC not approved");
        }
        
        // Check KYC expiry
        if (block.timestamp > inst.kycExpiry) {
            return (false, "KYC expired");
        }
        
        // Check daily withdrawal limit
        if (block.timestamp > lastWithdrawalReset[institution] + 1 days) {
            // Reset daily withdrawal counter
        } else if (dailyWithdrawals[institution] + amount > inst.dailyWithdrawalLimit) {
            return (false, "Daily withdrawal limit exceeded");
        }
        
        // Check against compliance rules
        for (uint256 i = 1; i <= complianceRuleCount; i++) {
            ComplianceRule memory rule = complianceRules[i];
            if (!rule.isActive) continue;
            
            if (amount > rule.maxTransactionAmount) {
                return (false, "Transaction amount exceeds compliance limit");
            }
            
            // Check if token is allowed
            bool tokenAllowed = false;
            for (uint256 j = 0; j < rule.allowedTokens.length; j++) {
                if (rule.allowedTokens[j] == token) {
                    tokenAllowed = true;
                    break;
                }
            }
            if (rule.allowedTokens.length > 0 && !tokenAllowed) {
                return (false, "Token not in allowed list");
            }
        }
        
        return (true, "Compliant");
    }
    
    /**
     * @dev Add audit trail entry
     */
    function _addAuditEntry(
        address institution,
        TransactionType transactionType,
        address asset,
        uint256 amount,
        string memory description
    ) internal {
        auditTrails[institution].push(AuditEntry({
            timestamp: block.timestamp,
            user: msg.sender,
            transactionType: transactionType,
            asset: asset,
            amount: amount,
            description: description,
            txHash: blockhash(block.number - 1)
        }));
        
        emit AuditEntryAdded(institution, transactionType, amount);
    }
    
    /**
     * @dev Update risk metrics
     */
    function updateRiskMetrics(
        address institution,
        uint256 var95,
        uint256 var99,
        uint256 expectedShortfall,
        uint256 maxDrawdown,
        uint256 volatility,
        uint256 sharpeRatio,
        uint256 beta
    ) external onlyRole(RISK_MANAGER) {
        riskMetrics[institution] = RiskMetrics({
            var95: var95,
            var99: var99,
            expectedShortfall: expectedShortfall,
            maxDrawdown: maxDrawdown,
            volatility: volatility,
            sharpeRatio: sharpeRatio,
            beta: beta,
            lastUpdated: block.timestamp
        });
    }
    
    /**
     * @dev Get institution details
     */
    function getInstitution(address institution) external view returns (Institution memory) {
        return institutions[institution];
    }
    
    /**
     * @dev Get audit trail for institution
     */
    function getAuditTrail(address institution) external view returns (AuditEntry[] memory) {
        return auditTrails[institution];
    }
    
    /**
     * @dev Get risk metrics for institution
     */
    function getRiskMetrics(address institution) external view returns (RiskMetrics memory) {
        return riskMetrics[institution];
    }
    
    /**
     * @dev Check if address is authorized signer
     */
    function _isAuthorizedSigner(address signer) internal view returns (bool) {
        MultiSigConfig memory config = multiSigConfigs[signer];
        if (!config.isActive) return false;
        
        for (uint256 i = 0; i < config.signers.length; i++) {
            if (config.signers[i] == signer) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Institutional deposit with compliance checks
     */
    function institutionalDeposit(
        uint256 amount,
        address asset
    ) external nonReentrant {
        require(whitelistedInstitutions[msg.sender], "Institution not whitelisted");
        
        (bool compliant, string memory reason) = this.checkCompliance(msg.sender, amount, asset);
        require(compliant, reason);
        
        // Perform deposit
        IERC20(asset).safeTransferFrom(msg.sender, address(vault), amount);
        
        // Add to audit trail
        _addAuditEntry(
            msg.sender,
            TransactionType.DEPOSIT,
            asset,
            amount,
            "Institutional deposit"
        );
    }
    
    /**
     * @dev Institutional withdrawal with compliance checks
     */
    function institutionalWithdrawal(
        uint256 amount,
        address asset
    ) external nonReentrant {
        require(whitelistedInstitutions[msg.sender], "Institution not whitelisted");
        
        (bool compliant, string memory reason) = this.checkCompliance(msg.sender, amount, asset);
        require(compliant, reason);
        
        // Update daily withdrawal tracking
        if (block.timestamp > lastWithdrawalReset[msg.sender] + 1 days) {
            dailyWithdrawals[msg.sender] = 0;
            lastWithdrawalReset[msg.sender] = block.timestamp;
        }
        dailyWithdrawals[msg.sender] += amount;
        
        // Perform withdrawal
        IERC20(asset).safeTransfer(msg.sender, amount);
        
        // Add to audit trail
        _addAuditEntry(
            msg.sender,
            TransactionType.WITHDRAWAL,
            asset,
            amount,
            "Institutional withdrawal"
        );
    }
    
    /**
     * @dev Update minimum AUM requirement
     */
    function updateMinimumAUM(uint256 newMinimumAUM) external onlyOwner {
        minimumAUM = newMinimumAUM;
    }
    
    /**
     * @dev Update KYC validity period
     */
    function updateKYCValidityPeriod(uint256 newPeriod) external onlyOwner {
        kycValidityPeriod = newPeriod;
    }
    
    /**
     * @dev Emergency pause for institution
     */
    function emergencyPause(address institution) external onlyRole(COMPLIANCE_OFFICER) {
        institutions[institution].isActive = false;
        whitelistedInstitutions[institution] = false;
    }
    
    /**
     * @dev Generate compliance report
     */
    function generateComplianceReport(address institution)
        external
        view
        onlyRole(AUDITOR)
        returns (
            uint256 totalTransactions,
            uint256 totalVolume,
            uint256 complianceViolations,
            bool kycStatus
        )
    {
        AuditEntry[] memory entries = auditTrails[institution];
        totalTransactions = entries.length;
        
        for (uint256 i = 0; i < entries.length; i++) {
            totalVolume += entries[i].amount;
        }
        
        Institution memory inst = institutions[institution];
        kycStatus = inst.kycStatus == KYCStatus.APPROVED && block.timestamp <= inst.kycExpiry;
        
        // Compliance violations would be tracked separately in a real implementation
        complianceViolations = 0;
    }
}