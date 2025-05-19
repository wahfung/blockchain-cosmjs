import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import fs from 'fs';
import path from 'path';

class Block {
  constructor(index, timestamp, transactions, previousHash = '', nonce = 0, difficulty = 4) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const data = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      nonce: this.nonce
    });
    
    return toHex(sha256(new TextEncoder().encode(data)));
  }

  mineBlock() {
    const target = Array(this.difficulty + 1).join('0');
    
    while (this.hash.substring(0, this.difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    
    console.log(`Block mined: ${this.hash}`);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.dataDir = path.join(process.cwd(), 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Try to load existing chain from file
    this.loadChain();
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // Add mining reward transaction
    this.pendingTransactions.push({
      fromAddress: null,
      toAddress: miningRewardAddress,
      amount: this.miningReward,
      timestamp: Date.now()
    });

    // Create new block with all pending transactions and mine it
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash,
      0,
      this.difficulty
    );

    block.mineBlock();
    console.log('Block successfully mined!');
    
    // Add block to chain and reset pending transactions
    this.chain.push(block);
    this.pendingTransactions = [];
    
    // Save updated chain to file
    this.saveChain();
    
    return block;
  }

  addTransaction(transaction) {
    // Basic validation
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (transaction.amount <= 0) {
      throw new Error('Transaction amount should be positive');
    }

    // Check if sender has enough balance (except for mining rewards where fromAddress is null)
    if (transaction.fromAddress !== null) {
      const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
      if (senderBalance < transaction.amount) {
        throw new Error('Not enough balance');
      }
    }

    // Add timestamp if not present
    if (!transaction.timestamp) {
      transaction.timestamp = Date.now();
    }

    this.pendingTransactions.push(transaction);
    return this.pendingTransactions.length;
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.fromAddress === address) {
          balance -= transaction.amount;
        }

        if (transaction.toAddress === address) {
          balance += transaction.amount;
        }
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if hash is valid
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Check if points to correct previous hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }

  saveChain() {
    const chainData = JSON.stringify(this.chain, null, 2);
    fs.writeFileSync(path.join(this.dataDir, 'blockchain.json'), chainData);
  }

  loadChain() {
    const chainFile = path.join(this.dataDir, 'blockchain.json');
    
    if (fs.existsSync(chainFile)) {
      try {
        const chainData = fs.readFileSync(chainFile, 'utf8');
        const loadedChain = JSON.parse(chainData);
        
        // Restore proper prototypes
        this.chain = loadedChain.map(blockData => {
          const block = new Block(
            blockData.index,
            blockData.timestamp,
            blockData.transactions,
            blockData.previousHash,
            blockData.nonce,
            blockData.difficulty
          );
          block.hash = blockData.hash;
          return block;
        });
        
        console.log(`Blockchain loaded with ${this.chain.length} blocks`);
      } catch (error) {
        console.error('Error loading blockchain:', error);
      }
    }
  }
}

export { Blockchain, Block };
