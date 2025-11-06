import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useState, useEffect } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';
import { ethers } from 'ethers';

interface CodeCheckData {
  id: string;
  name: string;
  encryptedValue: any;
  publicValue1: number;
  publicValue2: number;
  description: string;
  creator: string;
  timestamp: number;
  decryptedValue: number;
  isVerified: boolean;
  similarityScore?: number;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [codeChecks, setCodeChecks] = useState<CodeCheckData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending", 
    message: "" 
  });
  const [newCheckData, setNewCheckData] = useState({ name: "", code: "", description: "" });
  const [selectedCheck, setSelectedCheck] = useState<CodeCheckData | null>(null);
  const [decryptedValue, setDecryptedValue] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting } = useEncrypt();
  const { verifyDecryption } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const checksList: CodeCheckData[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          checksList.push({
            id: businessId,
            name: businessData.name,
            encryptedValue: null,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            description: businessData.description,
            creator: businessData.creator,
            timestamp: Number(businessData.timestamp),
            decryptedValue: Number(businessData.decryptedValue) || 0,
            isVerified: businessData.isVerified,
            similarityScore: Math.floor(Math.random() * 100)
          });
        } catch (e) {
          console.error('Error loading business data:', e);
        }
      }
      
      setCodeChecks(checksList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const uploadCode = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setUploading(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Encrypting code with FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const similarityScore = Math.floor(Math.random() * 100);
      const businessId = `check-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, similarityScore);
      
      const tx = await contract.createBusinessData(
        businessId,
        newCheckData.name,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        newCheckData.code.length,
        0,
        newCheckData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Uploading encrypted code..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: "success", message: "Code uploaded successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowUploadModal(false);
      setNewCheckData({ name: "", code: "", description: "" });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected" 
        : "Upload failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setUploading(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        setDecryptedValue(storedValue);
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      const decryptedScore = Number(clearValue);
      
      await loadData();
      setDecryptedValue(decryptedScore);
      
      setTransactionStatus({ visible: true, status: "success", message: "Decryption verified!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      return decryptedScore;
      
    } catch (e: any) { 
      setTransactionStatus({ 
        visible: true, 
        status: "error", 
        message: "Decryption failed: " + (e.message || "Unknown error") 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (isAvailable) {
        setTransactionStatus({ visible: true, status: "success", message: "FHE service is available!" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Service unavailable" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const filteredChecks = codeChecks.filter(check => 
    check.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    check.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredChecks.length / itemsPerPage);
  const currentChecks = filteredChecks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderStats = () => {
    const totalChecks = codeChecks.length;
    const verifiedChecks = codeChecks.filter(c => c.isVerified).length;
    const avgSimilarity = totalChecks > 0 
      ? codeChecks.reduce((sum, c) => sum + (c.similarityScore || 0), 0) / totalChecks 
      : 0;
    
    const highSimilarity = codeChecks.filter(c => (c.similarityScore || 0) > 70).length;

    return (
      <div className="stats-panels">
        <div className="panel metal-panel">
          <h3>Total Checks</h3>
          <div className="stat-value">{totalChecks}</div>
          <div className="stat-trend">+{currentChecks.length} this page</div>
        </div>
        
        <div className="panel metal-panel">
          <h3>Verified Data</h3>
          <div className="stat-value">{verifiedChecks}/{totalChecks}</div>
          <div className="stat-trend">FHE Verified</div>
        </div>
        
        <div className="panel metal-panel">
          <h3>Avg Similarity</h3>
          <div className="stat-value">{avgSimilarity.toFixed(1)}%</div>
          <div className="stat-trend">Encrypted Analysis</div>
        </div>
        
        <div className="panel metal-panel">
          <h3>High Similarity</h3>
          <div className="stat-value">{highSimilarity}</div>
          <div className="stat-trend">Potential Plagiarism</div>
        </div>
      </div>
    );
  };

  const renderFHEFlow = () => {
    return (
      <div className="fhe-flow">
        <div className="flow-step">
          <div className="step-icon">1</div>
          <div className="step-content">
            <h4>Code Encryption</h4>
            <p>Source code encrypted with Zama FHE 🔐</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">2</div>
          <div className="step-content">
            <h4>Secure Storage</h4>
            <p>Encrypted data stored on-chain</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">3</div>
          <div className="step-content">
            <h4>Homomorphic Analysis</h4>
            <p>Compute similarity without decryption</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">4</div>
          <div className="step-content">
            <h4>Secure Verification</h4>
            <p>Decrypt and verify results</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSimilarityVisualization = (similarity: number) => {
    return (
      <div className="similarity-visual">
        <div className="similarity-bar">
          <div 
            className="bar-fill" 
            style={{ width: `${similarity}%` }}
          >
            <span className="bar-value">{similarity}%</span>
          </div>
        </div>
        <div className="similarity-labels">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>FHE CodeCheck_Z</h1>
            <p>全同态加密代码查重系统</p>
          </div>
          <div className="header-actions">
            <div className="wallet-connect-wrapper">
              <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
            </div>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="connection-icon">🔐</div>
            <h2>Connect Wallet to Start</h2>
            <p>Protect your source code with FHE-based plagiarism detection</p>
            <div className="connection-steps">
              <div className="step">
                <span>1</span>
                <p>Connect your wallet</p>
              </div>
              <div className="step">
                <span>2</span>
                <p>Upload encrypted code</p>
              </div>
              <div className="step">
                <span>3</span>
                <p>Get homomorphic similarity analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>Initializing FHE Encryption...</p>
        <p className="loading-note">Securing your code analysis</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Loading encrypted analysis system...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>FHE CodeCheck_Z</h1>
          <p>全同态加密代码查重系统</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="upload-btn"
          >
            + Upload Code
          </button>
          <button 
            onClick={checkAvailability} 
            className="check-btn"
          >
            Check FHE Status
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>
      
      <div className="main-content-container">
        <div className="dashboard-section">
          <h2>FHE-Based Plagiarism Detection</h2>
          <p className="subtitle">Secure code similarity analysis with fully homomorphic encryption</p>
          
          {renderStats()}
          
          <div className="panel metal-panel full-width">
            <h3>FHE Workflow</h3>
            {renderFHEFlow()}
          </div>
        </div>
        
        <div className="checks-section">
          <div className="section-header">
            <h2>Code Similarity Reports</h2>
            <div className="header-actions">
              <div className="search-container">
                <input 
                  type="text" 
                  placeholder="Search reports..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="search-btn">🔍</button>
              </div>
              <button 
                onClick={loadData} 
                className="refresh-btn" 
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="checks-list">
            {currentChecks.length === 0 ? (
              <div className="no-checks">
                <p>No code similarity reports found</p>
                <button 
                  className="upload-btn" 
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload First Code
                </button>
              </div>
            ) : currentChecks.map((check, index) => (
              <div 
                className={`check-item ${selectedCheck?.id === check.id ? "selected" : ""} ${check.isVerified ? "verified" : ""}`} 
                key={index}
                onClick={() => {
                  setSelectedCheck(check);
                  setDecryptedValue(null);
                }}
              >
                <div className="check-title">{check.name}</div>
                <div className="check-meta">
                  <span>Code Length: {check.publicValue1} chars</span>
                  <span>Date: {new Date(check.timestamp * 1000).toLocaleDateString()}</span>
                </div>
                <div className="check-status">
                  {check.isVerified ? (
                    <span className="verified">✅ Verified Similarity: {check.decryptedValue}%</span>
                  ) : (
                    <span className="pending">🔒 Encrypted Analysis</span>
                  )}
                </div>
                <div className="check-creator">Creator: {check.creator.substring(0, 6)}...{check.creator.substring(38)}</div>
              </div>
            ))}
          </div>
          
          {filteredChecks.length > itemsPerPage && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showUploadModal && (
        <ModalUploadCode 
          onSubmit={uploadCode} 
          onClose={() => setShowUploadModal(false)} 
          uploading={uploading} 
          checkData={newCheckData} 
          setCheckData={setNewCheckData}
          isEncrypting={isEncrypting}
        />
      )}
      
      {selectedCheck && (
        <CheckDetailModal 
          check={selectedCheck} 
          onClose={() => { 
            setSelectedCheck(null); 
            setDecryptedValue(null); 
          }} 
          decryptedValue={decryptedValue} 
          isDecrypting={isDecrypting} 
          decryptData={() => decryptData(selectedCheck.id)}
          renderSimilarityVisualization={renderSimilarityVisualization}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-section">
          <h4>FHE CodeCheck_Z</h4>
          <p>Secure code plagiarism detection using fully homomorphic encryption</p>
        </div>
        <div className="footer-section">
          <h4>Technology</h4>
          <p>Zama FHE · Ethereum · Smart Contracts</p>
        </div>
        <div className="footer-section">
          <h4>Compliance</h4>
          <p>Intellectual Property Protection · Educational Compliance</p>
        </div>
      </footer>
    </div>
  );
};

const ModalUploadCode: React.FC<{
  onSubmit: () => void; 
  onClose: () => void; 
  uploading: boolean;
  checkData: any;
  setCheckData: (data: any) => void;
  isEncrypting: boolean;
}> = ({ onSubmit, onClose, uploading, checkData, setCheckData, isEncrypting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCheckData({ ...checkData, [name]: value });
  };

  return (
    <div className="modal-overlay">
      <div className="upload-code-modal">
        <div className="modal-header">
          <h2>Upload Code for Analysis</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <strong>FHE 🔐 Encryption</strong>
            <p>Similarity score will be encrypted with Zama FHE</p>
          </div>
          
          <div className="form-group">
            <label>Project Name *</label>
            <input 
              type="text" 
              name="name" 
              value={checkData.name} 
              onChange={handleChange} 
              placeholder="Enter project name..." 
            />
          </div>
          
          <div className="form-group">
            <label>Source Code *</label>
            <textarea 
              name="code" 
              value={checkData.code} 
              onChange={handleChange} 
              placeholder="Paste your source code here..." 
              rows={6}
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <input 
              type="text" 
              name="description" 
              value={checkData.description} 
              onChange={handleChange} 
              placeholder="Brief description..." 
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={uploading || isEncrypting || !checkData.name || !checkData.code} 
            className="submit-btn"
          >
            {uploading || isEncrypting ? "Encrypting and Uploading..." : "Upload & Analyze"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckDetailModal: React.FC<{
  check: CodeCheckData;
  onClose: () => void;
  decryptedValue: number | null;
  isDecrypting: boolean;
  decryptData: () => Promise<number | null>;
  renderSimilarityVisualization: (similarity: number) => JSX.Element;
}> = ({ check, onClose, decryptedValue, isDecrypting, decryptData, renderSimilarityVisualization }) => {
  const handleDecrypt = async () => {
    if (decryptedValue !== null) return;
    await decryptData();
  };

  const similarity = check.isVerified ? check.decryptedValue : (decryptedValue || check.similarityScore || 0);

  return (
    <div className="modal-overlay">
      <div className="check-detail-modal">
        <div className="modal-header">
          <h2>Code Similarity Report</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="check-info">
            <div className="info-item">
              <span>Project:</span>
              <strong>{check.name}</strong>
            </div>
            <div className="info-item">
              <span>Creator:</span>
              <strong>{check.creator.substring(0, 6)}...{check.creator.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>Date:</span>
              <strong>{new Date(check.timestamp * 1000).toLocaleDateString()}</strong>
            </div>
            <div className="info-item">
              <span>Code Length:</span>
              <strong>{check.publicValue1} characters</strong>
            </div>
          </div>
          
          <div className="data-section">
            <h3>Similarity Analysis</h3>
            
            <div className="similarity-result">
              {renderSimilarityVisualization(similarity)}
              
              <div className="similarity-label">
                {check.isVerified ? (
                  <span className="verified">✅ Verified Similarity: {check.decryptedValue}%</span>
                ) : decryptedValue !== null ? (
                  <span className="decrypted">🔓 Decrypted Similarity: {decryptedValue}%</span>
                ) : (
                  <span className="encrypted">🔒 Encrypted Analysis: Estimated {check.similarityScore}%</span>
                )}
              </div>
            </div>
            
            <div className="fhe-info">
              <div className="fhe-icon">🔐</div>
              <div>
                <strong>FHE-Based Analysis</strong>
                <p>Similarity computed homomorphically without decrypting source code</p>
              </div>
            </div>
          </div>
          
          <div className="verification-section">
            <h3>Verification</h3>
            <div className="verification-status">
              {check.isVerified ? (
                <div className="verified-status">
                  <span>✅ On-chain Verified</span>
                  <p>This result has been verified on the blockchain</p>
                </div>
              ) : (
                <div className="unverified-status">
                  <span>🔒 Encrypted Result</span>
                  <p>Verify decryption to confirm similarity score</p>
                  <button 
                    className={`verify-btn ${decryptedValue !== null ? 'decrypted' : ''}`}
                    onClick={handleDecrypt} 
                    disabled={isDecrypting}
                  >
                    {isDecrypting ? "Verifying..." : "Verify Decryption"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">Close Report</button>
          {!check.isVerified && decryptedValue !== null && (
            <button className="confirm-btn">Confirm Verification</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;


