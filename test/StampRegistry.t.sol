// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StampRegistry} from "../contracts/StampRegistry.sol";

contract StampRegistryTest is Test {
    StampRegistry registry;

    bytes32 constant HASH_A = keccak256("document A");
    bytes32 constant HASH_B = keccak256("document B");

    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);

    event Stamped(bytes32 indexed hash, address indexed stamper, uint256 timestamp);

    function setUp() public {
        registry = new StampRegistry();
    }

    function testStampRecordsSenderAndTime() public {
        vm.warp(1_800_000_000);
        vm.prank(ALICE);
        registry.stamp(HASH_A);

        (address stamper, uint256 timestamp, bool exists) = registry.verify(HASH_A);
        assertEq(stamper, ALICE);
        assertEq(timestamp, 1_800_000_000);
        assertTrue(exists);
    }

    function testVerifyUnknownHashReturnsEmptyRecord() public view {
        (address stamper, uint256 timestamp, bool exists) = registry.verify(HASH_A);
        assertEq(stamper, address(0));
        assertEq(timestamp, 0);
        assertFalse(exists);
    }

    function testDuplicateStampReverts() public {
        vm.prank(ALICE);
        registry.stamp(HASH_A);

        vm.prank(BOB);
        vm.expectRevert(abi.encodeWithSelector(StampRegistry.AlreadyStamped.selector, HASH_A));
        registry.stamp(HASH_A);
    }

    function testEmptyHashReverts() public {
        vm.expectRevert(StampRegistry.EmptyHash.selector);
        registry.stamp(bytes32(0));
    }

    function testDifferentHashesAreIndependent() public {
        vm.prank(ALICE);
        registry.stamp(HASH_A);
        vm.prank(BOB);
        registry.stamp(HASH_B);

        (address stamperA,,) = registry.verify(HASH_A);
        (address stamperB,,) = registry.verify(HASH_B);
        assertEq(stamperA, ALICE);
        assertEq(stamperB, BOB);
        assertEq(registry.totalStamps(), 2);
    }

    function testIsStamped() public {
        assertFalse(registry.isStamped(HASH_A));
        registry.stamp(HASH_A);
        assertTrue(registry.isStamped(HASH_A));
        assertFalse(registry.isStamped(HASH_B));
    }

    function testStampEmitsEvent() public {
        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, false, true);
        emit Stamped(HASH_A, ALICE, 1_700_000_000);
        vm.prank(ALICE);
        registry.stamp(HASH_A);
    }

    function testTotalStampsCountsOnlySuccessfulStamps() public {
        registry.stamp(HASH_A);
        vm.expectRevert(abi.encodeWithSelector(StampRegistry.AlreadyStamped.selector, HASH_A));
        registry.stamp(HASH_A);
        assertEq(registry.totalStamps(), 1);
    }

    function testFuzzStampAndVerify(bytes32 hash) public {
        vm.assume(hash != bytes32(0));
        vm.prank(ALICE);
        registry.stamp(hash);
        (address stamper, uint256 timestamp, bool exists) = registry.verify(hash);
        assertEq(stamper, ALICE);
        assertEq(timestamp, block.timestamp);
        assertTrue(exists);
    }
}
