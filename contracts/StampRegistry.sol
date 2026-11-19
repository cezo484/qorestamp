// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StampRegistry
/// @notice Records SHA-256 hashes of documents with the stamper and the
/// block timestamp. A hash can be stamped once. Anyone can look a hash up
/// later and see when it was stamped and by whom. The document itself is
/// never stored on chain, only its hash.
contract StampRegistry {
    struct Stamp {
        address stamper;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Stamp) private stamps;

    uint256 public totalStamps;

    event Stamped(bytes32 indexed hash, address indexed stamper, uint256 timestamp);

    error AlreadyStamped(bytes32 hash);
    error EmptyHash();

    /// @notice Stamp a document hash. Reverts if the hash is empty or was
    /// already stamped.
    function stamp(bytes32 hash) external {
        if (hash == bytes32(0)) revert EmptyHash();
        if (stamps[hash].exists) revert AlreadyStamped(hash);
        stamps[hash] = Stamp({stamper: msg.sender, timestamp: block.timestamp, exists: true});
        totalStamps += 1;
        emit Stamped(hash, msg.sender, block.timestamp);
    }

    /// @notice Look up a hash. Returns the stamper, the stamp time and
    /// whether a stamp exists. Unstamped hashes return the zero address,
    /// timestamp 0 and false.
    function verify(bytes32 hash) external view returns (address stamper, uint256 timestamp, bool exists) {
        Stamp memory s = stamps[hash];
        return (s.stamper, s.timestamp, s.exists);
    }

    /// @notice True when the hash has a stamp.
    function isStamped(bytes32 hash) external view returns (bool) {
        return stamps[hash].exists;
    }
}
