// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QoreStamp} from "../src/QoreStamp.sol";

/// @notice Deploys QoreStamp. The sender needs a registered ML-DSA-87 key and
///         a live EVM authorisation window first (see README: `npm run window
///         register`, then `npm run window open`).
contract QoreStampScript is Script {
    function run() external returns (QoreStamp notary) {
        // Forge loads .env from the project root.
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        notary = new QoreStamp();
        vm.stopBroadcast();
        console.log("QoreStamp deployed at", address(notary));
    }
}
