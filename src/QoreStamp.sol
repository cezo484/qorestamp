// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QoreStamp — a post-quantum notary on QoreChain
/// @notice Stamp the SHA-256 hash of any document on-chain to prove it
///         existed at a given time. Each stamp is sent through QoreChain's
///         EVM lane, which only admits transactions covered by a post-quantum
///         (ML-DSA-87) authorisation window — so every stamp is backed by a
///         hybrid classical + post-quantum signature, not just a classical one.
///
///         The document itself never leaves the user's machine: only its
///         32-byte hash is stored. Anyone can verify a stamp later by hashing
///         the document and calling {verify}.
contract QoreStamp {
    struct Stamp {
        address stampler;
        uint64 timestamp;
        uint256 blockNumber;
        string label;
    }

    mapping(bytes32 => Stamp) private _stamps;
    bytes32[] private _allHashes;
    uint256 public totalStamps;

    event Stamped(bytes32 indexed documentHash, address indexed stampler, uint256 timestamp, string label);

    error AlreadyStamped(bytes32 documentHash);
    error EmptyHash();
    error LabelTooLong();

    /// @notice Stamp a document hash. Each hash can be stamped only once:
    ///         the first stamp is the proof of existence at that time.
    /// @param documentHash SHA-256 hash of the document (32 bytes).
    /// @param label Short human-readable label, at most 64 bytes (may be empty).
    function stamp(bytes32 documentHash, string calldata label) external {
        if (documentHash == bytes32(0)) revert EmptyHash();
        if (bytes(label).length > 64) revert LabelTooLong();
        if (_stamps[documentHash].stampler != address(0)) revert AlreadyStamped(documentHash);
        _stamps[documentHash] = Stamp({
            stampler: msg.sender,
            // casting to 'uint64' is safe because block.timestamp is seconds
            // since the epoch and uint64 covers ~584 billion years
            // forge-lint: disable-next-line(unsafe-typecast)
            timestamp: uint64(block.timestamp),
            blockNumber: block.number,
            label: label
        });
        _allHashes.push(documentHash);
        unchecked {
            ++totalStamps;
        }
        emit Stamped(documentHash, msg.sender, block.timestamp, label);
    }

    /// @notice Look up a stamp by document hash.
    /// @return stampler Address that stamped it (zero address if never stamped).
    /// @return timestamp Block timestamp of the stamp.
    /// @return blockNumber Block the stamp landed in.
    /// @return label The label given at stamping time.
    /// @return exists True when the hash has a stamp.
    function verify(bytes32 documentHash)
        external
        view
        returns (address stampler, uint64 timestamp, uint256 blockNumber, string memory label, bool exists)
    {
        Stamp storage s = _stamps[documentHash];
        return (s.stampler, s.timestamp, s.blockNumber, s.label, s.stampler != address(0));
    }

    /// @notice True when the hash already has a stamp.
    function isStamped(bytes32 documentHash) external view returns (bool) {
        return _stamps[documentHash].stampler != address(0);
    }

    /// @notice The hash stamped at `index` (stamps are kept in stamp order).
    function hashAt(uint256 index) external view returns (bytes32) {
        return _allHashes[index];
    }
}
