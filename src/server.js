import express from 'express';
import bodyParser from 'body-parser';
import { Blockchain } from './blockchain.js';
import { Wallet } from './wallet.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化区块链
const myBlockchain = new Blockchain();

// API端点
app.get('/', (req, res) => {
  res.send('CosmJS区块链API正在运行');
});

// 获取整个区块链
app.get('/blockchain', (req, res) => {
  res.json({
    chain: myBlockchain.chain,
    pendingTransactions: myBlockchain.pendingTransactions,
    length: myBlockchain.chain.length
  });
});

// 根据索引获取特定区块
app.get('/block/:index', (req, res) => {
  const blockIndex = parseInt(req.params.index);
  
  if (blockIndex < 0 || blockIndex >= myBlockchain.chain.length) {
    return res.status(404).json({ error: '找不到区块' });
  }
  
  res.json(myBlockchain.chain[blockIndex]);
});

// 挖掘待处理交易
app.post('/mine', (req, res) => {
  const { minerAddress } = req.body;
  
  if (!minerAddress) {
    return res.status(400).json({ error: '需要矿工地址' });
  }
  
  // 区块链的minePendingTransactions方法现在会处理奖励逻辑，不需要在这里添加
  console.log(`开始挖矿，矿工地址: ${minerAddress}`);
  console.log(`当前待处理交易数量: ${myBlockchain.pendingTransactions.length}`);
  
  const newBlock = myBlockchain.minePendingTransactions(minerAddress);
  
  res.json({
    message: '区块挖矿成功',
    block: newBlock
  });
});

// 创建新交易
app.post('/transaction', async (req, res) => {
  const { fromAddress, toAddress, amount, signature, pubkey } = req.body;
  
  if (!fromAddress || !toAddress || !amount || !signature || !pubkey) {
    return res.status(400).json({
      error: '缺少必要的交易参数'
    });
  }
  
  try {
    // 创建交易对象
    const transaction = {
      fromAddress,
      toAddress,
      amount: parseFloat(amount),
      timestamp: Date.now(),
      signature,
      pubkey
    };
    
    // 在这里验证签名（可选 - 可以添加此功能）
    
    // 将交易添加到待处理交易
    const txIndex = myBlockchain.addTransaction(transaction);
    
    res.json({
      message: '交易添加成功',
      transactionIndex: txIndex,
      pendingTransactions: myBlockchain.pendingTransactions.length
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// 获取地址余额
app.get('/balance/:address', (req, res) => {
  const address = req.params.address;
  const balance = myBlockchain.getBalanceOfAddress(address);
  
  res.json({
    address,
    balance
  });
});

// 创建新钱包
app.post('/wallet', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: '需要名称和密码' });
  }
  
  try {
    const wallet = new Wallet();
    const newWallet = await wallet.createWallet(name, password);
    
    res.json({
      message: '钱包创建成功',
      address: newWallet.address,
      mnemonic: newWallet.mnemonic
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// 加载钱包
app.post('/wallet/load', async (req, res) => {
  const { name, password } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: '需要名称和密码' });
  }
  
  try {
    const wallet = new Wallet();
    const loadedWallet = await wallet.loadWallet(name, password);
    
    res.json({
      message: '钱包加载成功',
      address: loadedWallet.address
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// 创建并签名交易
app.post('/wallet/transaction', async (req, res) => {
  const { name, password, toAddress, amount } = req.body;
  
  if (!name || !password || !toAddress || !amount) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  try {
    // 创建钱包实例
    const wallet = new Wallet();
    
    // 加载钱包
    console.log('正在加载钱包...');
    await wallet.loadWallet(name, password);
    
    // 验证钱包地址是否已设置
    const walletAddress = wallet.getAddress();
    if (!walletAddress) {
      console.error('钱包地址未设置');
      throw new Error('钱包加载失败：地址未设置');
    }
    
    console.log(`钱包地址: ${walletAddress}`);
    
    // 创建交易
    console.log(`正在创建交易到 ${toAddress}，金额: ${amount}`);
    const signedTx = await wallet.createTransaction(
      toAddress,
      parseFloat(amount)
    );
    
    console.log('交易已签名:', signedTx);
    
    // 返回签名后的交易
    res.json({
      message: '交易已创建并签名',
      transaction: signedTx
    });
  } catch (error) {
    console.error('创建交易失败:', error);
    res.status(400).json({
      error: error.message || '创建交易失败，请检查参数和钱包'
    });
  }
});

// 列出所有钱包
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

// 检查区块链是否有效
app.get('/validate', (req, res) => {
  const isValid = myBlockchain.isChainValid();
  
  res.json({
    valid: isValid
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`CosmJS区块链API运行在端口 ${PORT}`);
  console.log(`创世区块已创建: ${JSON.stringify(myBlockchain.chain[0])}`);
});

export { app };
