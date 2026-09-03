// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {EclipseDraw} from "../EclipseDraw.sol";
import {IEclipseVault} from "../interfaces/IEclipseVault.sol";
import {IPrizeReserve} from "../interfaces/IPrizeReserve.sol";

/// @dev Test-only deterministic randomness seam. Never deploy on Sepolia.
contract EclipseDrawHarness is EclipseDraw {
    uint64 private immutable _forcedPosition;

    constructor(
        IEclipseVault vault_,
        IPrizeReserve reserve_,
        uint64 forcedPosition_
    ) EclipseDraw(vault_, reserve_) {
        _forcedPosition = forcedPosition_;
    }

    function _createRandom(uint64) internal override returns (euint64) {
        return FHE.asEuint64(_forcedPosition);
    }
}
