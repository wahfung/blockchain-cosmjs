import express from 'express';
import bodyParser from 'body-parser';
import { Blockchain } from './blockchain.js';
import { Wallet } from './wallet.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize blockchain
const myBlockchain = new Blockchain();

// API endpoints
app.get('/', (req, res) => {
  res.send('CosmJS Blockchain API is running');
});

// Get the entire blockchain
app.get('/blockchain', (req, res) => {
  res.json({
    chain: myBlockchain.chain,
    pendingTransactions: myBlockchain.pendingTransactions,
    length: myBlockchain.chain.length
  });
});

// Get a specific block by index
app.get('/block/:index', (req, res) => {
  const blockIndex = parseInt(req.params.index);
  
  if (blockIndex < 0 || blockIndex >= myBlockchain.chain.length) {
    return res.status(404).json({ error: 'Block not found' });
  }
  
  res.json(myBlockchain.chain[blockIndex]);
});

// Mine pending transactions
app.post('/mine', (req, res) => {
  const { minerAddress } = req.body;
  
  if (!minerAddress) {
    return res.status(400).json({ error: 'Miner address is required' });
  }
  
  // Check if there are pending transactions
  if (myBlockchain.pendingTransactions.length === 0) {
    // Add a dummy transaction if none exist (mining reward)
    myBlockchain.pendingTransactions.push({
      fromAddress: null,
      toAddress: minerAddress,
      amount: myBlockchain.miningReward,
      timestamp: Date.now()
    });
  }
  
  const newBlock = myBlockchain.minePendingTransactions(minerAddress);
  
  res.json({
    message: 'Block mined successfully',
    block: newBlock
  });
});

// Create a new transaction
app.post('/transaction', async (req, res) => {
  const { fromAddress, toAddress, amount, signature, pubkey } = req.body;
  
  if (!fromAddress || !toAddress || !amount || !signature || !pubkey) {
    return res.status(400).json({
      error: 'Missing required transaction parameters'
    });
  }
  
  try {
    // Create transaction object
    const transaction = {
      fromAddress,
      toAddress,
      amount: parseFloat(amount),
      timestamp: Date.now(),
      signature,
      pubkey
    };
    
    // Verify signature here (optional - you can add this functionality)
    
    // Add transaction to pending transactions
    const txIndex = myBlockchain.addTransaction(transaction);
    
    res.json({
      message: 'Transaction added successfully',
      transactionIndex: txIndex,
      pendingTransactions: myBlockchain.pendingTransactions.length
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Get balance of an address
app.get('/balance/:address', (req, res) => {
  const address = req.params.address;
  const balance = myBlockchain.getBalanceOfAddress(address);
  
  res.json({
    address,
    balance
  });
});

// Create a new wallet
app.post('/wallet', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }
  
  try {
    const wallet = new Wallet();
    const newWallet = await wallet.createWallet(name, password);
    
    res.json({
      message: 'Wallet created successfully',
      address: newWallet.address,
      mnemonic: newWallet.mnemonic
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Load a wallet
app.post('/wallet/load', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }
  
  try {
    const wallet = new Wallet();
    const loadedWallet = await wallet.loadWallet(name, password);
    
    res.json({
      message: 'Wallet loaded successfully',
      address: loadedWallet.address
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Create and sign a transaction
app.post('/wallet/transaction', async (req, res) => {
  const { name, password, toAddress, amount } = req.body;
  
  if (!name || !password || !toAddress || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  try {
    const wallet = new Wallet();
    await wallet.loadWallet(name, password);
    
    const signedTx = await wallet.createTransaction(
      toAddress,
      parseFloat(amount)
    );
    
    res.json({
      message: 'Transaction created and signed',
      transaction: signedTx
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// List all wallets
app.get('/wallets', async (req, res) => {
  try {
    const wallet = new Wallet();
    const wallets = await wallet.listWallets();
    
    res.json({
      wallets
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Check if blockchain is valid
app.get('/validate', (req, res) => {
  const isValid = myBlockchain.isChainValid();
  
  res.json({
    valid: isValid
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`CosmJS Blockchain API running on port ${PORT}`);
  console.log(`Genesis block created: ${JSON.stringify(myBlockchain.chain[0])}`);
});

export { app };
