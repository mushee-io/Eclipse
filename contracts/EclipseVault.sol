// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {
    FHE,
    ebool,
    euint64,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EclipseVault
/// @notice Confidential principal custody for Eclipse.
/// @dev Deposits must use ERC-7984 confidentialTransferAndCall. No plaintext balance,
/// total principal, or capacity result is emitted. This phase deliberately has no
/// prize-transfer authority: principal is only returned to the depositing account.
contract EclipseVault is
    ZamaEthereumConfig,
    IERC7984Receiver,
    Ownable,
    ReentrancyGuard
{
    error OnlyConfiguredToken(address caller);
    error WithdrawalsLocked();
    error InvalidCapacity();
    error DrawControllerAlreadySet();
    error OnlyDrawController(address caller);

    IERC7984 public immutable asset;
    uint64 public immutable maxPoolCapacity;
    address public drawController;
    bool public withdrawalsLocked;

    mapping(address account => euint64) private _principalOf;
    mapping(address account => ebool) private _lastDepositAccepted;
    mapping(address account => bool) private _knownParticipant;
    address[] private _participants;
    euint64 private _totalPrincipal;

    event DepositProcessed(address indexed account);
    event WithdrawalProcessed(address indexed account);
    event DrawControllerConfigured(address indexed controller);
    event WithdrawalsLockChanged(bool locked);

    constructor(
        IERC7984 asset_,
        uint64 maxPoolCapacity_,
        address owner_
    ) Ownable(owner_) {
        if (maxPoolCapacity_ == 0) revert InvalidCapacity();
        asset = asset_;
        maxPoolCapacity = maxPoolCapacity_;
    }

    /// @notice One-time wiring step. The controller may only toggle the short draw lock.
    function setDrawController(address controller) external onlyOwner {
        if (drawController != address(0)) revert DrawControllerAlreadySet();
        drawController = controller;
        emit DrawControllerConfigured(controller);
    }

    function setWithdrawalsLocked(bool locked) external {
        if (msg.sender != drawController) revert OnlyDrawController(msg.sender);
        withdrawalsLocked = locked;
        emit WithdrawalsLockChanged(locked);
    }

    /// @inheritdoc IERC7984Receiver
    /// @dev The ERC-7984 token transfers first, then this callback returns an encrypted
    /// acceptance bit. A capacity failure causes the standard token refund path; vault
    /// state is selected back to its old encrypted values in the same transaction.
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external nonReentrant returns (ebool accepted) {
        if (msg.sender != address(asset))
            revert OnlyConfiguredToken(msg.sender);

        euint64 candidateTotal = FHE.add(_totalPrincipal, amount);
        accepted = FHE.le(candidateTotal, maxPoolCapacity);

        euint64 candidateBalance = FHE.add(_principalOf[from], amount);
        euint64 nextBalance = FHE.select(
            accepted,
            candidateBalance,
            _principalOf[from]
        );
        euint64 nextTotal = FHE.select(
            accepted,
            candidateTotal,
            _totalPrincipal
        );

        _principalOf[from] = nextBalance;
        _totalPrincipal = nextTotal;
        _lastDepositAccepted[from] = accepted;

        FHE.allowThis(nextBalance);
        FHE.allow(nextBalance, from);
        FHE.allowThis(nextTotal);
        FHE.allowThis(accepted);
        FHE.allow(accepted, from);
        // The token must read this callback return value to decide whether to refund.
        FHE.allow(accepted, msg.sender);
        if (!_knownParticipant[from]) {
            _knownParticipant[from] = true;
            _participants.push(from);
        }

        emit DepositProcessed(from);
    }

    /// @notice Attempts a private principal withdrawal. An insufficient request settles
    /// as an encrypted zero transfer instead of producing a public balance oracle.
    function withdraw(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        if (withdrawalsLocked) revert WithdrawalsLocked();

        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 currentBalance = _principalOf[msg.sender];
        ebool enoughPrincipal = FHE.le(requested, currentBalance);
        euint64 actualWithdrawal = FHE.select(
            enoughPrincipal,
            requested,
            FHE.asEuint64(0)
        );

        euint64 nextBalance = FHE.sub(currentBalance, actualWithdrawal);
        euint64 nextTotal = FHE.sub(_totalPrincipal, actualWithdrawal);
        _principalOf[msg.sender] = nextBalance;
        _totalPrincipal = nextTotal;

        FHE.allowThis(nextBalance);
        FHE.allow(nextBalance, msg.sender);
        FHE.allowThis(nextTotal);
        FHE.allowThis(actualWithdrawal);
        FHE.allowTransient(actualWithdrawal, address(asset));
        asset.confidentialTransfer(msg.sender, actualWithdrawal);

        emit WithdrawalProcessed(msg.sender);
    }

    function principalOf(address account) external view returns (euint64) {
        return _principalOf[account];
    }

    function lastDepositAccepted(
        address account
    ) external view returns (ebool) {
        return _lastDepositAccepted[account];
    }

    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    function participantAt(uint256 index) external view returns (address) {
        return _participants[index];
    }

    function principalForDraw(address account) external returns (euint64) {
        if (msg.sender != drawController) revert OnlyDrawController(msg.sender);
        euint64 balance = _principalOf[account];
        FHE.allow(balance, msg.sender);
        return balance;
    }
}
