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
    
    console.log(`区块已挖出: ${this.hash}`);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 50; // 修改挖矿奖励从100到50
    this.dataDir = path.join(process.cwd(), 'data');
    
    // 如果数据目录不存在则创建
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // 尝试从文件加载现有链
    this.loadChain();
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // 添加挖矿奖励交易
    this.pendingTransactions.push({
      fromAddress: null,
      toAddress: miningRewardAddress,
      amount: this.miningReward,
      timestamp: Date.now()
    });

    // 创建新区块并挖矿
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash,
      0,
      this.difficulty
    );

    block.mineBlock();
    console.log('区块挖矿成功!');
    console.log(`挖矿奖励 ${this.miningReward} 代币已发送到地址: ${miningRewardAddress}`);
    
    // 将区块添加到链中并重置待处理交易
    this.chain.push(block);
    this.pendingTransactions = [];
    
    // 保存更新后的链到文件
    this.saveChain();
    
    return block;
  }

  addTransaction(transaction) {
    // 基本验证
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('交易必须包含发送地址和接收地址');
    }

    if (transaction.amount <= 0) {
      throw new Error('交易金额必须为正数');
    }

    // 检查发送者是否有足够的余额（挖矿奖励除外，其fromAddress为null）
    if (transaction.fromAddress !== null) {
      const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
      if (senderBalance < transaction.amount) {
        throw new Error('余额不足');
      }
    }

    // 如果没有时间戳则添加
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

      // 检查区块哈希是否有效
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // 检查是否指向正确的前一个哈希
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
        
        // 恢复适当的原型
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
        
        console.log(`已加载区块链，共有 ${this.chain.length} 个区块`);
      } catch (error) {
        console.error('加载区块链时出错:', error);
      }
    }
  }
}

export { Blockchain, Block };
