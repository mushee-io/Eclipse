// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IPrizeReserve {
    function lockPrize() external returns (euint64);
    function rollOver(euint64 lockedPrize) external;
    function payout(address recipient, euint64 amount) external;
}
