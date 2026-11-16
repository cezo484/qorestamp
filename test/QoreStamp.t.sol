// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {QoreStamp} from "../src/QoreStamp.sol";

contract QoreStampTest is Test {
    QoreStamp internal notary;

    bytes32 internal constant DOC = keccak256("hello, q-day");
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);

    event Stamped(bytes32 indexed documentHash, address indexed stampler, uint256 timestamp, string label);

    function setUp() public {
        notary = new QoreStamp();
    }

    function test_StampStoresStamplerTimeAndBlock() public {
        vm.warp(1_800_000_000);
        vm.roll(12_345);
        vm.prank(ALICE);
        notary.stamp(DOC, "first draft");
        (address stampler, uint64 ts, uint256 blk, string memory label, bool exists) = notary.verify(DOC);
        assertEq(stampler, ALICE);
        assertEq(ts, 1_800_000_000);
        assertEq(blk, 12_345);
        assertEq(label, "first draft");
        assertTrue(exists);
        assertTrue(notary.isStamped(DOC));
        assertEq(notary.totalStamps(), 1);
    }

    function test_StampEmitsEvent() public {
        vm.expectEmit(address(notary));
        emit Stamped(DOC, ALICE, block.timestamp, "deed");
        vm.prank(ALICE);
        notary.stamp(DOC, "deed");
    }

    function test_VerifyUnknownHashReturnsEmpty() public view {
        (address stampler, uint64 ts, uint256 blk, string memory label, bool exists) = notary.verify(DOC);
        assertEq(stampler, address(0));
        assertEq(ts, 0);
        assertEq(blk, 0);
        assertEq(label, "");
        assertFalse(exists);
        assertFalse(notary.isStamped(DOC));
        assertEq(notary.totalStamps(), 0);
    }

    function test_RevertOnSecondStampOfSameHash() public {
        vm.prank(ALICE);
        notary.stamp(DOC, "original");
        vm.prank(BOB);
        vm.expectRevert(abi.encodeWithSelector(QoreStamp.AlreadyStamped.selector, DOC));
        notary.stamp(DOC, "copycat");
    }

    function test_RevertOnEmptyHash() public {
        vm.expectRevert(QoreStamp.EmptyHash.selector);
        notary.stamp(bytes32(0), "nothing");
    }

    function test_RevertOnLabelTooLong() public {
        string memory longLabel = new string(65);
        vm.expectRevert(QoreStamp.LabelTooLong.selector);
        notary.stamp(DOC, longLabel);
    }

    function test_LabelOfExactly64BytesIsAccepted() public {
        string memory label64 = new string(64);
        notary.stamp(DOC, label64);
        assertTrue(notary.isStamped(DOC));
    }

    function test_EmptyLabelIsAccepted() public {
        notary.stamp(DOC, "");
        assertTrue(notary.isStamped(DOC));
    }

    function test_HashAtEnumeratesInStampOrder() public {
        bytes32 a = keccak256("a");
        bytes32 b = keccak256("b");
        bytes32 c = keccak256("c");
        notary.stamp(a, "a");
        notary.stamp(b, "b");
        notary.stamp(c, "c");
        assertEq(notary.hashAt(0), a);
        assertEq(notary.hashAt(1), b);
        assertEq(notary.hashAt(2), c);
        assertEq(notary.totalStamps(), 3);
    }

    function testFuzz_StampAndVerify(bytes32 hash, string memory label) public {
        vm.assume(hash != bytes32(0));
        vm.assume(bytes(label).length <= 64);
        notary.stamp(hash, label);
        (address stampler,,,, bool exists) = notary.verify(hash);
        assertTrue(exists);
        assertEq(stampler, address(this));
    }
}
