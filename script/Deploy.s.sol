// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QoreStamp} from "../src/QoreStamp.sol";

/// @notice Deploy QoreStamp to QoreChain testnet (chain id 9800).
/// Reads PRIVATE_KEY from the environment. Before running this, the deploy
/// account needs testnet QOR from the Dashboard faucet, a registered
/// post-quantum key and an open EVM authorisation window. See README.md.
/// (The same contract is deployed by script/QoreStamp.s.sol; this script
/// is the one the local anvil demo in the README uses.)
contract Deploy is Script {
    function run() public returns (QoreStamp notary) {
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);
        notary = new QoreStamp();
        vm.stopBroadcast();
        console.log("QoreStamp deployed at:", address(notary));
    }
}
