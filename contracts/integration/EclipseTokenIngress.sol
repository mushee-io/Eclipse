// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Phase-2 custody harness for ERC-7984's atomic transfer-and-call flow.
/// @dev This is intentionally not the Vault. Its sole job is to prove the token's
/// returned encrypted amount can be atomically and privately credited to a user.
contract EclipseTokenIngress is
    ZamaEthereumConfig,
    IERC7984Receiver,
    ReentrancyGuard
{
    error OnlyConfiguredToken(address caller);

    address public immutable token;
    mapping(address account => euint64) private _credited;

    event DepositCredited(address indexed account);

    constructor(address token_) {
        token = token_;
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external nonReentrant returns (ebool accepted) {
        if (msg.sender != token) revert OnlyConfiguredToken(msg.sender);

        euint64 updated = FHE.add(_credited[from], amount);
        _credited[from] = updated;

        // Persist for future accounting, then grant only the credited user a
        // decryption capability. No public decryption capability is created.
        FHE.allowThis(updated);
        FHE.allow(updated, from);

        accepted = FHE.asEbool(true);
        // ERC-7984 requires the token caller to be permitted to read this value.
        FHE.allow(accepted, msg.sender);
    }

    function creditedBalanceOf(
        address account
    ) external view returns (euint64) {
        return _credited[account];
    }
}
