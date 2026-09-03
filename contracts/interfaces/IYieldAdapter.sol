// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/// @notice Minimal interface for a yield source that can contribute confidential
/// assets to Eclipse's isolated prize reserve.
interface IYieldAdapter {
    function contributeYield(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external;
}
