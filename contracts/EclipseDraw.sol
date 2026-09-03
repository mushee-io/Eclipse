// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IEclipseVault} from "./interfaces/IEclipseVault.sol";
import {IPrizeReserve} from "./interfaces/IPrizeReserve.sol";

contract EclipseDraw is ZamaEthereumConfig {
    enum DrawState {
        OPEN,
        RANDOMNESS_CREATED,
        PROCESSING,
        FINALIZED
    }
    error InvalidState(DrawState actual);
    error BatchTooLarge(uint256 requested);
    error NothingToProcess();
    error AlreadyClaimed(uint256 drawId, address account);
    error ProcessingIncomplete(uint256 cursor, uint256 participants);
    error CapacityMustBePowerOfTwo(uint64 capacity);

    uint256 public constant MAX_BATCH_SIZE = 16;
    IEclipseVault public immutable vault;
    IPrizeReserve public immutable reserve;
    uint256 public currentDrawId;
    DrawState public state;
    uint256 public cursor;
    euint64 private _randomPosition;
    euint64 private _cumulative;
    euint64 private _lockedPrize;
    ebool private _shadow;
    mapping(uint256 => mapping(address => ebool)) private _won;
    mapping(uint256 => mapping(address => euint64)) private _prizeOf;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(uint256 => bool) public finalized;

    event DrawStarted(uint256 indexed drawId);
    event BatchProcessed(
        uint256 indexed drawId,
        uint256 fromIndex,
        uint256 count
    );
    event DrawFinalized(uint256 indexed drawId);
    event NextDrawOpened(uint256 indexed previousDrawId);
    event PrizeClaimProcessed(uint256 indexed drawId, address indexed account);

    constructor(IEclipseVault vault_, IPrizeReserve reserve_) {
        uint64 capacity = vault_.maxPoolCapacity();
        if (capacity == 0 || (capacity & (capacity - 1)) != 0)
            revert CapacityMustBePowerOfTwo(capacity);
        vault = vault_;
        reserve = reserve_;
    }

    function startDraw() external {
        if (state != DrawState.OPEN) revert InvalidState(state);
        currentDrawId++;
        cursor = 0;
        vault.setWithdrawalsLocked(true);
        _lockedPrize = reserve.lockPrize();
        _randomPosition = _createRandom(vault.maxPoolCapacity());
        _cumulative = FHE.asEuint64(0);
        FHE.allowThis(_lockedPrize);
        FHE.allowThis(_randomPosition);
        FHE.allowThis(_cumulative);
        state = DrawState.RANDOMNESS_CREATED;
        emit DrawStarted(currentDrawId);
    }

    function beginProcessing() external {
        if (state != DrawState.RANDOMNESS_CREATED) revert InvalidState(state);
        state = DrawState.PROCESSING;
    }

    function processDrawBatch(uint256 count) external {
        if (state != DrawState.PROCESSING) revert InvalidState(state);
        if (count == 0 || count > MAX_BATCH_SIZE) revert BatchTooLarge(count);
        uint256 total = vault.participantCount();
        if (cursor >= total) revert NothingToProcess();
        uint256 fromIndex = cursor;
        uint256 end = cursor + count;
        if (end > total) end = total;
        for (uint256 i = cursor; i < end; ++i) {
            address participant = vault.participantAt(i);
            euint64 balance = vault.principalForDraw(participant);
            euint64 upper = FHE.add(_cumulative, balance);
            ebool inside = FHE.and(
                FHE.ge(_randomPosition, _cumulative),
                FHE.lt(_randomPosition, upper)
            );
            euint64 prize = FHE.select(inside, _lockedPrize, FHE.asEuint64(0));
            _won[currentDrawId][participant] = inside;
            _prizeOf[currentDrawId][participant] = prize;
            _cumulative = upper;
            FHE.allowThis(inside);
            FHE.allowThis(prize);
            FHE.allowThis(_cumulative);
        }
        cursor = end;
        emit BatchProcessed(currentDrawId, fromIndex, end - fromIndex);
    }

    function finalizeDraw() external {
        if (state != DrawState.PROCESSING) revert InvalidState(state);
        uint256 total = vault.participantCount();
        if (cursor != total) revert ProcessingIncomplete(cursor, total);
        _shadow = FHE.ge(_randomPosition, _cumulative);
        euint64 rollover = FHE.select(_shadow, _lockedPrize, FHE.asEuint64(0));
        FHE.allowThis(_shadow);
        FHE.allowThis(rollover);
        FHE.allowTransient(rollover, address(reserve));
        reserve.rollOver(rollover);
        vault.setWithdrawalsLocked(false);
        state = DrawState.FINALIZED;
        finalized[currentDrawId] = true;
        emit DrawFinalized(currentDrawId);
    }

    function openNextDraw() external {
        if (state != DrawState.FINALIZED) revert InvalidState(state);
        state = DrawState.OPEN;
        emit NextDrawOpened(currentDrawId);
    }

    function authorizeMyResult(
        uint256 drawId
    ) external returns (ebool won, euint64 prize) {
        if (!finalized[drawId]) revert InvalidState(state);
        won = _won[drawId][msg.sender];
        prize = _prizeOf[drawId][msg.sender];
        FHE.allow(won, msg.sender);
        FHE.allow(prize, msg.sender);
    }

    /// @notice Sends the caller's encrypted allocation through the reserve once.
    /// @dev A zero-allocation claim follows the same path and emits the same event.
    function claimPrize(uint256 drawId) external {
        if (!finalized[drawId]) revert InvalidState(state);
        if (claimed[drawId][msg.sender])
            revert AlreadyClaimed(drawId, msg.sender);
        claimed[drawId][msg.sender] = true;
        euint64 prize = _prizeOf[drawId][msg.sender];
        FHE.allowTransient(prize, address(reserve));
        reserve.payout(msg.sender, prize);
        emit PrizeClaimProcessed(drawId, msg.sender);
    }

    function encryptedResultOf(
        uint256 drawId,
        address account
    ) external view returns (ebool, euint64) {
        return (_won[drawId][account], _prizeOf[drawId][account]);
    }

    function _createRandom(uint64 capacity) internal virtual returns (euint64) {
        return FHE.randEuint64(capacity);
    }
}
