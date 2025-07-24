// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TaskStaking {
    
    struct Task {
        address creator;
        uint256 stakedAmount;
        uint256 deadline;
        string backendTaskId;  // Links to your backend DB record
        TaskStatus status;
        bool proofSubmitted;
        uint256 createdAt;
    }
    
    enum TaskStatus { 
        Active,      // Task created, awaiting proof
        Submitted,   // Proof submitted, awaiting review
        Completed,   // Approved by admin
        Failed,      // Rejected or deadline missed
        Cancelled    // Cancelled by user (if allowed)
    }
    
    // State variables
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public userTasks;  // User's task IDs
    
    address public owner;
    address public platformWallet;
    uint256 public taskCounter;
    uint256 public minimumStake;
    
    // Events
    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 stakedAmount, uint256 deadline, string backendTaskId);
    event ProofSubmitted(uint256 indexed taskId, address indexed creator);
    event TaskCompleted(uint256 indexed taskId, address indexed creator, uint256 returnedAmount);
    event TaskFailed(uint256 indexed taskId, address indexed creator, uint256 penaltyAmount);
    event PlatformWalletUpdated(address newWallet);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier taskExists(uint256 taskId) {
        require(tasks[taskId].creator != address(0), "Task does not exist");
        _;
    }
    
    modifier onlyTaskCreator(uint256 taskId) {
        require(tasks[taskId].creator == msg.sender, "Not task creator");
        _;
    }
    
    constructor(address _platformWallet, uint256 _minimumStake) {
        owner = msg.sender;
        platformWallet = _platformWallet;
        minimumStake = _minimumStake;
        taskCounter = 0;
    }
    
    // Create new task with stake
    function createTask(
        uint256 _deadline,
        string memory _backendTaskId
    ) external payable returns (uint256) {
        require(msg.value >= minimumStake, "Stake amount too low");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(bytes(_backendTaskId).length > 0, "Backend task ID required");
        
        taskCounter++;
        
        tasks[taskCounter] = Task({
            creator: msg.sender,
            stakedAmount: msg.value,
            deadline: _deadline,
            backendTaskId: _backendTaskId,
            status: TaskStatus.Active,
            proofSubmitted: false,
            createdAt: block.timestamp
        });
        
        userTasks[msg.sender].push(taskCounter);
        
        emit TaskCreated(taskCounter, msg.sender, msg.value, _deadline, _backendTaskId);
        
        return taskCounter;
    }
    
    // User submits proof (called by backend after proof upload)
    function submitProof(uint256 taskId) 
        external 
        taskExists(taskId) 
        onlyTaskCreator(taskId) 
    {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Active, "Task not active");
        require(block.timestamp <= task.deadline, "Deadline passed");
        require(!task.proofSubmitted, "Proof already submitted");
        
        task.proofSubmitted = true;
        task.status = TaskStatus.Submitted;
        
        emit ProofSubmitted(taskId, msg.sender);
    }
    
    // Admin approves task (full refund)
    function approveTask(uint256 taskId) 
        external 
        onlyOwner 
        taskExists(taskId) 
    {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Submitted, "Task not submitted for review");
        
        task.status = TaskStatus.Completed;
        uint256 refundAmount = task.stakedAmount;
        
        // Transfer stake back to user
        payable(task.creator).transfer(refundAmount);
        
        emit TaskCompleted(taskId, task.creator, refundAmount);
    }
    
    // Admin rejects task with partial refund
    function rejectTaskPartial(uint256 taskId, uint256 refundPercentage) 
        external 
        onlyOwner 
        taskExists(taskId) 
    {
        require(refundPercentage <= 100, "Invalid percentage");
        
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Submitted, "Task not submitted for review");
        
        task.status = TaskStatus.Failed;
        
        uint256 refundAmount = (task.stakedAmount * refundPercentage) / 100;
        uint256 penaltyAmount = task.stakedAmount - refundAmount;
        
        // Transfer partial refund to user
        if (refundAmount > 0) {
            payable(task.creator).transfer(refundAmount);
        }
        
        // Transfer penalty to platform
        if (penaltyAmount > 0) {
            payable(platformWallet).transfer(penaltyAmount);
        }
        
        emit TaskFailed(taskId, task.creator, penaltyAmount);
    }
    
    // Admin fully rejects task (no refund)
    function rejectTaskFull(uint256 taskId) 
        external 
        onlyOwner 
        taskExists(taskId) 
    {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Submitted, "Task not submitted for review");
        
        task.status = TaskStatus.Failed;
        uint256 penaltyAmount = task.stakedAmount;
        
        // Transfer full stake to platform
        payable(platformWallet).transfer(penaltyAmount);
        
        emit TaskFailed(taskId, task.creator, penaltyAmount);
    }
    
    // Handle expired tasks (anyone can call)
    function handleExpiredTask(uint256 taskId) 
        external 
        taskExists(taskId) 
    {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Active, "Task not active");
        require(block.timestamp > task.deadline, "Task not expired");
        
        task.status = TaskStatus.Failed;
        uint256 penaltyAmount = task.stakedAmount;
        
        // Transfer stake to platform
        payable(platformWallet).transfer(penaltyAmount);
        
        emit TaskFailed(taskId, task.creator, penaltyAmount);
    }
    
    // Get user's task IDs
    function getUserTasks(address user) external view returns (uint256[] memory) {
        return userTasks[user];
    }
    
    // Get task details
    function getTask(uint256 taskId) external view returns (
        address creator,
        uint256 stakedAmount,
        uint256 deadline,
        string memory backendTaskId,
        TaskStatus status,
        bool proofSubmitted,
        uint256 createdAt
    ) {
        Task storage task = tasks[taskId];
        return (
            task.creator,
            task.stakedAmount,
            task.deadline,
            task.backendTaskId,
            task.status,
            task.proofSubmitted,
            task.createdAt
        );
    }
    
    // Admin functions
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(_newWallet);
    }
    
    function updateMinimumStake(uint256 _newMinimum) external onlyOwner {
        minimumStake = _newMinimum;
    }
    
    // Get contract stats
    function getContractStats() external view returns (
        uint256 totalTasks,
        uint256 contractBalance,
        address currentPlatformWallet
    ) {
        return (taskCounter, address(this).balance, platformWallet);
    }
    
    // Emergency withdraw (owner only)
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}