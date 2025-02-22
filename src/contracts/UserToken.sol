// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { ERC721URIStorage, ERC721 } from "@openzeppelin/token/ERC721/extensions/ERC721URIStorage.sol";
import { Ownable } from "@openzeppelin/access/Ownable.sol";

contract UserNFTToken is ERC721URIStorage, Ownable {
    uint256 private tokenId;
    mapping(string => address creator) creators;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {
        tokenId = 1;
    }


    function mint(address _creator, address to, string memory _tokenURI) public onlyOwner {
        uint256 _tokenID = tokenId;
        ++tokenId;
        _safeMint(to, _tokenID);
        _setTokenURI(_tokenID, _tokenURI);
        _setCreator(_creator, _tokenURI);
    }

    function _setCreator(address _creator, string memory _tokenURI) private {
        creators[_tokenURI] = _creator;
    }

    function getCreator(string memory _tokenURI) public view returns(address) {
        return creators[_tokenURI];
    }
}
