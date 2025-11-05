pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract CodeCheck_Z is ZamaEthereumConfig {
    struct CodeSubmission {
        address submitter;
        euint32 encryptedCode;
        uint256 similarityThreshold;
        bool isProcessed;
        uint32 similarityScore;
    }

    mapping(string => CodeSubmission) public submissions;
    string[] public submissionIds;

    event CodeSubmitted(string indexed submissionId, address indexed submitter);
    event SimilarityCalculated(string indexed submissionId, uint32 similarityScore);

    constructor() ZamaEthereumConfig() {
    }

    function submitEncryptedCode(
        string calldata submissionId,
        externalEuint32 encryptedCode,
        bytes calldata inputProof,
        uint256 similarityThreshold
    ) external {
        require(bytes(submissions[submissionId].submitter).length == 0, "Submission ID already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedCode, inputProof)), "Invalid encrypted input");

        submissions[submissionId] = CodeSubmission({
            submitter: msg.sender,
            encryptedCode: FHE.fromExternal(encryptedCode, inputProof),
            similarityThreshold: similarityThreshold,
            isProcessed: false,
            similarityScore: 0
        });

        FHE.allowThis(submissions[submissionId].encryptedCode);
        FHE.makePubliclyDecryptable(submissions[submissionId].encryptedCode);

        submissionIds.push(submissionId);

        emit CodeSubmitted(submissionId, msg.sender);
    }

    function calculateSimilarity(
        string calldata submissionId,
        bytes memory abiEncodedSimilarityScore,
        bytes memory computationProof
    ) external {
        require(bytes(submissions[submissionId].submitter).length > 0, "Submission does not exist");
        require(!submissions[submissionId].isProcessed, "Submission already processed");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(submissions[submissionId].encryptedCode);

        FHE.checkSignatures(cts, abiEncodedSimilarityScore, computationProof);

        uint32 decodedScore = abi.decode(abiEncodedSimilarityScore, (uint32));
        require(decodedScore <= 100, "Similarity score out of range");

        submissions[submissionId].similarityScore = decodedScore;
        submissions[submissionId].isProcessed = true;

        emit SimilarityCalculated(submissionId, decodedScore);
    }

    function getEncryptedCode(string calldata submissionId) external view returns (euint32) {
        require(bytes(submissions[submissionId].submitter).length > 0, "Submission does not exist");
        return submissions[submissionId].encryptedCode;
    }

    function getSubmissionData(string calldata submissionId) external view returns (
        address submitter,
        uint256 similarityThreshold,
        bool isProcessed,
        uint32 similarityScore
    ) {
        require(bytes(submissions[submissionId].submitter).length > 0, "Submission does not exist");
        CodeSubmission storage data = submissions[submissionId];

        return (
            data.submitter,
            data.similarityThreshold,
            data.isProcessed,
            data.similarityScore
        );
    }

    function getAllSubmissionIds() external view returns (string[] memory) {
        return submissionIds;
    }

    function isAvailable() public pure returns (bool) {
        return true;
    }
}


