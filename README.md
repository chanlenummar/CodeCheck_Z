# CodeCheck_Z

CodeCheck_Z is a cutting-edge tool designed for code plagiarism detection, harnessing the power of Zama's Fully Homomorphic Encryption (FHE) technology. It offers a robust solution for educational institutions and developers alike by enabling secure and privacy-preserving comparisons of encrypted source code against a database. With CodeCheck_Z, users can ensure their intellectual property remains confidential while maintaining academic integrity and compliance.

## The Problem

In today’s digital landscape, the integrity of source code is paramount. Cleartext data poses significant risks, especially when it comes to plagiarism and unauthorized use. When code is shared in plain text, it becomes vulnerable to theft and misuse. Not only does this jeopardize intellectual property rights, but it also undermines educational compliance, leaving institutions exposed to potential legal challenges. CodeCheck_Z addresses these concerns by providing a secure method for verifying code originality without exposing the underlying source.

## The Zama FHE Solution

Fully Homomorphic Encryption allows computation on encrypted data, meaning that sensitive information can be processed without revealing it in clear text. Using Zama's FHE technology, specifically the libraries available such as **fhevm**, CodeCheck_Z enables users to upload encrypted code and compare it with others in a secure manner. This ensures that while the similarity between codes is assessed, neither the original code nor the proprietary algorithms are ever compromised, preserving the privacy of the source.

## Key Features

- **Privacy-Preserving Comparisons**: Upload and compare encrypted source code without revealing your intellectual property 🔒.
- **Intellectual Property Protection**: Safeguard your source code while efficiently checking for plagiarism and similarities 📜.
- **Compliance with Educational Standards**: Help academic institutions maintain integrity by ensuring originality in student submissions 🎓.
- **User-Friendly Interface**: Simple upload and comparison process with easy-to-read reports 📊.
- **Robust Security**: Powered by Zama's advanced FHE technology, ensuring that data remains confidential at all times 🔐.

## Technical Architecture & Stack

CodeCheck_Z is built on a modern tech stack to ensure scalability and performance, with Zama's solutions at its core:

- **Core Privacy Engine**: Zama FHE (utilizing fhevm for encrypted computations)
- **Backend Framework**: A suitable backend framework to manage user requests.
- **Database**: A secured database to store encrypted code snippets.
- **Frontend**: A responsive UI for users to easily interact with the tool.

## Smart Contract / Core Logic

Here’s a simplified code snippet using Zama's libraries to illustrate how CodeCheck_Z performs a similarity check on encrypted inputs:solidity
pragma solidity ^0.8.0;

import "fhevm.sol"; // Hypothetical library for FHE-based computations

contract CodeCheck {
    function compareCode(bytes encryptedCode1, bytes encryptedCode2) external view returns (bool) {
        // Decrypting and comparing codes
        uint64 similarityScore = TFHE.decrypt(TFHE.similarityCheck(encryptedCode1, encryptedCode2));
        return (similarityScore > 0);
    }
}

This snippet represents a Solidity smart contract that allows for the comparison of two pieces of encrypted code, returning whether they are similar based on a defined threshold.

## Directory Structure

Here’s an overview of the project directory structure, reflecting the organization of files:
CodeCheck_Z/
├── contracts/
│   └── CodeCheck.sol
├── scripts/
│   └── runCheck.py
├── tests/
│   └── testCodeCheck.py
├── src/
│   └── main.js
└── README.md

## Installation & Setup

Before you begin, ensure you have the following prerequisites installed:

- **Node.js** (for running JavaScript applications)
- **Python** (for executing Python scripts)
- **Zama FHE Library** (required for encryption functionalities)

Follow these steps to set up CodeCheck_Z on your local machine:

1. Install the necessary dependencies:bash
   npm install  # for JavaScript dependencies
   pip install concrete-ml  # for Zama's FHE Python library

2. Ensure you have the Zama FHE library installed as well:bash
   npm install fhevm  # install the FHE library for JavaScript

## Build & Run

To compile the smart contract and run the application, use the following commands:

1. Compile the smart contracts:bash
   npx hardhat compile

2. Run the main Python script to execute code similarity checks:bash
   python scripts/runCheck.py

## Acknowledgements

We would like to extend our gratitude to Zama for providing the open-source Fully Homomorphic Encryption primitives that make this project possible. Their commitment to enhancing privacy and security in computing has enabled CodeCheck_Z to thrive and serve its users effectively.

---

With CodeCheck_Z, experience a revolutionary approach to plagiarism detection that keeps your code secure while maintaining academic and professional integrity. By leveraging Zama's FHE technology, you can ensure your work remains private and protected.


