// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Phase-1 compile probe. This verifies that deployed contracts will inherit
/// the official Ethereum/Sepolia FHE coprocessor configuration. It holds no funds.
contract EclipseConfigProbe is ZamaEthereumConfig {
    // Power-of-two atomic-unit capacity required by current FHE bounded randomness.
    uint64 public constant MAX_POOL_CAPACITY = 1_073_741_824;
}
