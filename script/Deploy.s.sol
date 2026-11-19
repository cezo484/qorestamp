// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {StampRegistry} from "../contracts/StampRegistry.sol";

/// @notice Deploy StampRegistry to QoreChain testnet (chain id 9800).
/// Reads PRIVATE_KEY from the environment. Before running this, the deploy
/// account needs testnet QOR from the Dashboard faucet, a registered
/// post-quantum key and an open EVM authorisation window. See README.md.
contract Deploy is Script {
    function run() public returns (StampRegistry registry) {
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);
        registry = new StampRegistry();
        vm.stopBroadcast();
        console.log("StampRegistry deployed at:", address(registry));
    }
}
