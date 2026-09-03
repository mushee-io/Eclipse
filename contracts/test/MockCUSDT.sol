// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Local/mock-only ERC-7984 asset for Eclipse integration tests.
/// @dev Never deploy this mintable token as an Eclipse production asset.
contract MockCUSDT is ZamaEthereumConfig, ERC7984, Ownable {
    constructor(
        address owner_
    ) ERC7984("Mock Confidential USDT", "cUSDT", "") Ownable(owner_) {}

    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }

    function _update(
        address from,
        address to,
        euint64 amount
    ) internal override returns (euint64 transferred) {
        return super._update(from, to, amount);
    }
}
