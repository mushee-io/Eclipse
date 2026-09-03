// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IEclipseVault {
    function maxPoolCapacity() external view returns (uint64);
    function setWithdrawalsLocked(bool locked) external;
    function participantCount() external view returns (uint256);
    function participantAt(uint256 index) external view returns (address);
    function principalForDraw(address account) external returns (euint64);
}
