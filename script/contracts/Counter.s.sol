// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "@forge-std/Script.sol";
import {UserNFTToken} from "../../src/contracts/UserToken.sol";

contract UserNFTScript is Script {
    UserNFTToken public counter;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        counter = new UserNFTToken("Dummy", "DM");
        
        vm.stopBroadcast();
    }
}
