// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title GovernanceDAO
 * @dev Comprehensive DAO governance system for DefiBrain platform
 * @author DefiBrain Team
 */
contract GovernanceDAO is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // Governance token
    IERC20 public immutable governanceToken;
    
    // Proposal states
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    // Proposal categories
    enum ProposalCategory {
        PROTOCOL_UPGRADE,
        PARAMETER_CHANGE,
        TREASURY_ALLOCATION,
        STRATEGY_ADDITION,
        EMERGENCY_ACTION,
        PARTNERSHIP,
        TOKENOMICS
    }
    
    // Vote types
    enum VoteType {
        Against,
        For,
        Abstain
    }
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        ProposalCategory category;
        string title;
        string description;
        string[] tags;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        bool isEmergency;
        mapping(address => bool) hasVoted;
        mapping(address => VoteType) votes;
    }
    
    // Voting power delegation
    struct DelegationInfo {
        address delegate;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Committee structure
    struct Committee {
        string name;
        address[] members;
        uint256 requiredVotes;
        bool isActive;
        mapping(uint256 => bool) proposalReviews;
    }
    
    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(address => DelegationInfo) public delegations;
    mapping(bytes32 => Committee) public committees;
    mapping(address => bool) public emergencyCouncil;
    mapping(address => uint256) public votingPower;
    
    bytes32[] public committeeNames;
    uint256 public proposalCount;
    uint256 public treasuryBalance;
    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public proposalThreshold;
    uint256 public quorumThreshold;
    uint256 public emergencyVotingPeriod;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalCategory category,
        string title,
        uint256 startBlock,
        uint256 endBlock
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 weight,
        string reason
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    
    event VotingPowerDelegated(
        address indexed delegator,
        address indexed delegate,
        uint256 amount
    );
    
    event CommitteeCreated(
        bytes32 indexed committeeName,
        address[] members
    );
    
    event TreasuryFundsAllocated(
        address indexed recipient,
        uint256 amount,
        string purpose
    );
    
    constructor(
        IERC20 _token,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumThreshold
    ) Ownable(msg.sender) {
        governanceToken = _token;
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumThreshold = _quorumThreshold;
        emergencyVotingPeriod = 1 days;
    }
    
    /**
     * @dev Create a proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalCategory category,
        string memory title,
        string[] memory tags,
        bool isEmergency
    ) public returns (uint256) {
        require(
            getVotingPower(msg.sender) >= proposalThreshold,
            "Insufficient voting power"
        );
        require(targets.length == values.length, "Targets and values length mismatch");
        require(targets.length == calldatas.length, "Targets and calldatas length mismatch");
        require(targets.length > 0, "Must provide actions");
        
        uint256 proposalId = ++proposalCount;
        uint256 startBlock = block.number + votingDelay;
        uint256 endBlock = startBlock + (isEmergency ? emergencyVotingPeriod : votingPeriod);
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.category = category;
        proposal.title = title;
        proposal.description = description;
        proposal.tags = tags;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.startBlock = startBlock;
        proposal.endBlock = endBlock;
        proposal.isEmergency = isEmergency;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            category,
            title,
            startBlock,
            endBlock
        );
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(
        uint256 proposalId,
        VoteType support
    ) public returns (uint256) {
        return _castVote(proposalId, msg.sender, support, "");
    }
    
    /**
     * @dev Cast a vote with reason
     */
    function castVoteWithReason(
        uint256 proposalId,
        VoteType support,
        string calldata reason
    ) public returns (uint256) {
        return _castVote(proposalId, msg.sender, support, reason);
    }
    
    /**
     * @dev Internal vote casting logic
     */
    function _castVote(
        uint256 proposalId,
        address account,
        VoteType support,
        string memory reason
    ) internal returns (uint256) {
        require(state(proposalId) == ProposalState.Active, "Voting is closed");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[account], "Already voted");
        
        uint256 weight = getVotingPower(account);
        require(weight > 0, "No voting power");
        
        proposal.hasVoted[account] = true;
        proposal.votes[account] = support;
        
        if (support == VoteType.Against) {
            proposal.againstVotes += weight;
        } else if (support == VoteType.For) {
            proposal.forVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }
        
        emit VoteCast(account, proposalId, support, weight, reason);
        
        return weight;
    }
    
    /**
     * @dev Execute a proposal
     */
    function execute(
        uint256 proposalId
    ) public payable nonReentrant {
        ProposalState currentState = state(proposalId);
        require(
            currentState == ProposalState.Succeeded,
            "Proposal not in succeeded state"
        );
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        for (uint256 i = 0; i < proposal.targets.length; ++i) {
            (bool success, ) = proposal.targets[i].call{
                value: proposal.values[i]
            }(proposal.calldatas[i]);
            require(success, "Transaction execution reverted");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal
     */
    function cancel(uint256 proposalId) public {
        require(
            state(proposalId) != ProposalState.Executed,
            "Cannot cancel executed proposal"
        );
        
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Only proposer or owner can cancel"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get proposal state
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(proposalId <= proposalCount && proposalId > 0, "Invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        }
        
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }
        
        if (proposal.forVotes <= proposal.againstVotes || !_quorumReached(proposalId)) {
            return ProposalState.Defeated;
        }
        
        return ProposalState.Succeeded;
    }
    
    /**
     * @dev Check if quorum is reached
     */
    function _quorumReached(uint256 proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        return totalVotes >= quorumThreshold;
    }
    
    /**
     * @dev Get voting power of an account
     */
    function getVotingPower(address account) public view returns (uint256) {
        uint256 tokenBalance = governanceToken.balanceOf(account);
        
        // Add delegated voting power
        DelegationInfo memory delegation = delegations[account];
        if (delegation.delegate == account) {
            tokenBalance += delegation.amount;
        }
        
        return tokenBalance;
    }
    
    /**
     * @dev Delegate voting power
     */
    function delegateVotingPower(address delegate, uint256 amount) external {
        require(delegate != address(0), "Invalid delegate");
        require(governanceToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        delegations[msg.sender] = DelegationInfo({
            delegate: delegate,
            amount: amount,
            timestamp: block.timestamp
        });
        
        emit VotingPowerDelegated(msg.sender, delegate, amount);
    }
    
    /**
     * @dev Create a committee
     */
    function createCommittee(
        string memory name,
        address[] memory members,
        uint256 requiredVotes
    ) external onlyOwner {
        bytes32 committeeName = keccak256(abi.encodePacked(name));
        require(committees[committeeName].members.length == 0, "Committee exists");
        
        Committee storage committee = committees[committeeName];
        committee.name = name;
        committee.members = members;
        committee.requiredVotes = requiredVotes;
        committee.isActive = true;
        
        committeeNames.push(committeeName);
        
        emit CommitteeCreated(committeeName, members);
    }
    
    /**
     * @dev Add emergency council member
     */
    function addEmergencyCouncilMember(address member) external onlyOwner {
        emergencyCouncil[member] = true;
    }
    
    /**
     * @dev Allocate treasury funds
     */
    function allocateTreasuryFunds(
        address recipient,
        uint256 amount,
        string memory purpose
    ) external onlyOwner {
        require(amount <= treasuryBalance, "Insufficient treasury funds");
        require(recipient != address(0), "Invalid recipient");
        
        treasuryBalance -= amount;
        governanceToken.transfer(recipient, amount);
        
        emit TreasuryFundsAllocated(recipient, amount, purpose);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            ProposalCategory category,
            string memory title,
            string memory description,
            uint256 startBlock,
            uint256 endBlock,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool executed,
            bool canceled
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.category,
            proposal.title,
            proposal.description,
            proposal.startBlock,
            proposal.endBlock,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.canceled
        );
    }
    
    /**
     * @dev Update governance parameters
     */
    function updateVotingDelay(uint256 newVotingDelay) external onlyOwner {
        votingDelay = newVotingDelay;
    }
    
    function updateVotingPeriod(uint256 newVotingPeriod) external onlyOwner {
        votingPeriod = newVotingPeriod;
    }
    
    function updateProposalThreshold(uint256 newProposalThreshold) external onlyOwner {
        proposalThreshold = newProposalThreshold;
    }
    
    function updateQuorumThreshold(uint256 newQuorumThreshold) external onlyOwner {
        quorumThreshold = newQuorumThreshold;
    }
    
    function updateTreasuryBalance(uint256 newBalance) external onlyOwner {
        treasuryBalance = newBalance;
    }
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {
        treasuryBalance += msg.value;
    }
}