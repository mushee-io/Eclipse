// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Isolated custody/accounting for yield-derived prizes only.
/// @dev The vault is never an authorized sender or controller of this contract.
contract PrizeReserve is
    ZamaEthereumConfig,
    IERC7984Receiver,
    Ownable,
    ReentrancyGuard
{
    error OnlyConfiguredToken(address caller);
    error OnlyYieldAdapter(address operator);
    error YieldAdapterAlreadySet();
    error DrawAlreadySet();
    error OnlyDraw(address caller);

    address public immutable asset;
    address public yieldAdapter;
    address public draw;
    euint64 private _availablePrize;

    event YieldContributed(address indexed source);
    event YieldAdapterConfigured(address indexed adapter);
    event DrawConfigured(address indexed draw);

    constructor(address asset_, address owner_) Ownable(owner_) {
        asset = asset_;
    }

    function setYieldAdapter(address adapter) external onlyOwner {
        if (yieldAdapter != address(0)) revert YieldAdapterAlreadySet();
        yieldAdapter = adapter;
        emit YieldAdapterConfigured(adapter);
    }

    function setDraw(address draw_) external onlyOwner {
        if (draw != address(0)) revert DrawAlreadySet();
        draw = draw_;
        emit DrawConfigured(draw_);
    }

    /// @dev Only accepts the ERC-7984 callback when the token operation was initiated
    /// by the configured yield adapter. The encrypted callback amount is the amount
    /// that actually arrived after ERC-7984's safe transfer logic.
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint64 amount,
        bytes calldata
    ) external nonReentrant returns (ebool accepted) {
        if (msg.sender != asset) revert OnlyConfiguredToken(msg.sender);
        if (operator != yieldAdapter) revert OnlyYieldAdapter(operator);

        _availablePrize = FHE.add(_availablePrize, amount);
        FHE.allowThis(_availablePrize);

        accepted = FHE.asEbool(true);
        FHE.allow(accepted, msg.sender);
        emit YieldContributed(from);
    }

    /// @notice Locks all currently available yield for a draw. The Draw receives the
    /// ciphertext handle; it remains unavailable to public/user decryption.
    function lockPrize() external returns (euint64 lockedPrize) {
        if (msg.sender != draw) revert OnlyDraw(msg.sender);
        lockedPrize = _availablePrize;
        _availablePrize = FHE.asEuint64(0);
        FHE.allowThis(_availablePrize);
        FHE.allowThis(lockedPrize);
        FHE.allow(lockedPrize, msg.sender);
    }

    /// @notice Restores a locked prize after a Shadow outcome.
    function rollOver(euint64 lockedPrize) external {
        if (msg.sender != draw) revert OnlyDraw(msg.sender);
        _availablePrize = FHE.add(_availablePrize, lockedPrize);
        FHE.allowThis(_availablePrize);
    }

    /// @notice Transfers a draw-authorized encrypted allocation to a claimant.
    /// @dev The Draw can only supply the allocation it produced from a locked prize;
    /// the recipient address becomes public at claim time, but not their outcome or amount.
    function payout(address recipient, euint64 amount) external nonReentrant {
        if (msg.sender != draw) revert OnlyDraw(msg.sender);
        FHE.allowTransient(amount, asset);
        IERC7984(asset).confidentialTransfer(recipient, amount);
    }

    function availablePrize() external view returns (euint64) {
        return _availablePrize;
    }
}
