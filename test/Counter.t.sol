// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "@forge-std/Test.sol";
import {UserNFTToken} from "../src/contracts/UserToken.sol";

contract CounterTest is Test {
    UserNFTToken public counter;

    function setUp() public {
        counter = new UserNFTToken("Dummy", "dm");
    }
}
