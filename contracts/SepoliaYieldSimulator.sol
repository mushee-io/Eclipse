// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IYieldAdapter} from "./interfaces/IYieldAdapter.sol";

/// @notice Testnet-only adapter that lets a pre-funded account contribute cUSDT
/// as simulated yield. It does not model interest and must not be used in production.
contract SepoliaYieldSimulator is ZamaEthereumConfig, IYieldAdapter {
    IERC7984 public immutable asset;
    address public immutable reserve;

    event SimulatedYieldSubmitted(address indexed funder);

    constructor(IERC7984 asset_, address reserve_) {
        asset = asset_;
        reserve = reserve_;
    }

    /// @dev Funder approves this adapter as an ERC-7984 operator, encrypts an amount
    /// for this contract, then invokes this method. The asset transfer and reserve
    /// accounting happen atomically through ERC-7984's transfer-and-call callback.
    function contributeYield(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external override {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(asset));
        asset.confidentialTransferFromAndCall(msg.sender, reserve, amount, "");
        emit SimulatedYieldSubmitted(msg.sender);
    }
}
