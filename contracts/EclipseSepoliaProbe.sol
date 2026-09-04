// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Minimal real-Sepolia FHE/ACL proof. No public decryption path exists.
contract EclipseSepoliaProbe is ZamaEthereumConfig {
    mapping(address account => euint64) private _value;

    event EncryptedValueStored(address indexed account);

    function storeEncryptedAmount(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 value = FHE.fromExternal(encryptedAmount, inputProof);
        _value[msg.sender] = value;
        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
        emit EncryptedValueStored(msg.sender);
    }

    function getEncryptedAmountHandle(
        address account
    ) external view returns (euint64) {
        return _value[account];
    }
}
