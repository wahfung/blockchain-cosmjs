import fetch from 'node-fetch';
import fs from 'fs';
import readline from 'readline';

// 创建readline接口用于交互式测试
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// API基础URL
const BASE_URL = 'http://localhost:3000';

// 保存测试状态
let testState = {
  wallet1: {
    name: 'wallet1',
    password: 'password1',
    address: null,
    mnemonic: null
  },
  wallet2: {
    name: 'wallet2',
    password: 'password2',
    address: null,
    mnemonic: null
  },
  transactions: []
};

// 保存状态到文件
function saveState() {
  fs.writeFileSync('test-state.json', JSON.stringify(testState, null, 2));
  console.log('测试状态已保存到 test-state.json');
}

// 加载状态（如果存在）
function loadState() {
  if (fs.existsSync('test-state.json')) {
    try {
      testState = JSON.parse(fs.readFileSync('test-state.json', 'utf8'));
      console.log('已从 test-state.json 加载测试状态');
    } catch (error) {
      console.error('加载测试状态失败:', error);
    }
  }
}

// API调用辅助函数
async function callApi(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return await response.json();
  } catch (error) {
    console.error(`API调用失败 ${method} ${endpoint}:`, error);
    throw error;
  }
}

// 1. 创建钱包
async function createWallet(name, password) {
  console.log(`创建钱包 ${name}...`);
  try {
    const result = await callApi('/wallet', 'POST', { name, password });
    console.log('钱包创建成功:', result);
    return result;
  } catch (error) {
    console.error('创建钱包失败:', error);
    throw error;
  }
}

// 2. 挖矿
async function mineBlock(minerAddress) {
  console.log(`以地址 ${minerAddress} 进行挖矿...`);
  try {
    const result = await callApi('/mine', 'POST', { minerAddress });
    console.log('挖矿成功:', result);
    return result;
  } catch (error) {
    console.error('挖矿失败:', error);
    throw error;
  }
}

// 3. 查询余额
async function getBalance(address) {
  console.log(`查询地址 ${address} 的余额...`);
  try {
    const result = await callApi(`/balance/${address}`);
    console.log('余额:', result);
    return result;
  } catch (error) {
    console.error('查询余额失败:', error);
    throw error;
  }
}

// 4. 创建交易
async function createTransaction(name, password, toAddress, amount) {
  console.log(`创建从 ${name} 到 ${toAddress} 的交易，金额: ${amount}...`);
  try {
    const result = await callApi('/wallet/transaction', 'POST', {
      name,
      password,
      toAddress,
      amount
    });
    console.log('交易创建成功:', result);
    return result;
  } catch (error) {
    console.error('创建交易失败:', error);
    throw error;
  }
}

// 5. 提交交易
async function submitTransaction(transaction) {
  console.log('提交交易...');
  try {
    const { transaction: tx, signature, pubkey } = transaction;
    const result = await callApi('/transaction', 'POST', {
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      signature,
      pubkey
    });
    console.log('交易提交成功:', result);
    return result;
  } catch (error) {
    console.error('提交交易失败:', error);
    throw error;
  }
}

// 6. 获取区块链状态
async function getBlockchainStatus() {
  console.log('获取区块链状态...');
  try {
    const result = await callApi('/blockchain');
    console.log(`区块链长度: ${result.length} 区块`);
    console.log(`待处理交易: ${result.pendingTransactions.length}`);
    return result;
  } catch (error) {
    console.error('获取区块链状态失败:', error);
    throw error;
  }
}

// 测试流程
async function runBasicTest() {
  try {
    loadState();
    
    // 1. 创建钱包（如果尚未创建）
    if (!testState.wallet1.address) {
      const wallet1 = await createWallet(testState.wallet1.name, testState.wallet1.password);
      testState.wallet1.address = wallet1.address;
      testState.wallet1.mnemonic = wallet1.mnemonic;
    }
    
    if (!testState.wallet2.address) {
      const wallet2 = await createWallet(testState.wallet2.name, testState.wallet2.password);
      testState.wallet2.address = wallet2.address;
      testState.wallet2.mnemonic = wallet2.mnemonic;
    }
    
    saveState();
    
    // 2. 挖矿到钱包1
    await mineBlock(testState.wallet1.address);
    
    // 3. 查询钱包1余额
    const balance1 = await getBalance(testState.wallet1.address);
    
    // 4. 从钱包1创建交易到钱包2
    if (balance1.balance > 0) {
      const transactionAmount = 10; // 转账10个代币
      const transaction = await createTransaction(
        testState.wallet1.name,
        testState.wallet1.password,
        testState.wallet2.address,
        transactionAmount
      );
      
      testState.transactions.push(transaction);
      saveState();
      
      // 5. 提交交易到区块链
      await submitTransaction(transaction.transaction);
      
      // 6. 再次挖矿以确认交易
      await mineBlock(testState.wallet1.address);
      
      // 7. 检查两个钱包的余额
      await getBalance(testState.wallet1.address);
      await getBalance(testState.wallet2.address);
    } else {
      console.log('钱包1余额不足，请先挖矿');
    }
    
    // 8. 获取区块链状态
    await getBlockchainStatus();
    
    console.log('\n基本测试完成。');
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 交互式菜单
function showMenu() {
  console.log('\n=== CosmJS区块链测试工具 ===');
  console.log('1. 运行基本测试流程');
  console.log('2. 创建新钱包');
  console.log('3. 挖矿');
  console.log('4. 查询余额');
  console.log('5. 创建并提交交易');
  console.log('6. 查看区块链状态');
  console.log('7. 退出');
  
  rl.question('\n请选择操作: ', async (choice) => {
    try {
      switch (choice) {
        case '1':
          await runBasicTest();
          showMenu();
          break;
        case '2':
          rl.question('钱包名称: ', (name) => {
            rl.question('钱包密码: ', async (password) => {
              const wallet = await createWallet(name, password);
              if (wallet && wallet.address) {
                console.log(`新钱包地址: ${wallet.address}`);
                console.log(`助记词 (请安全保存): ${wallet.mnemonic}`);
              }
              showMenu();
            });
          });
          break;
        case '3':
          rl.question('矿工地址: ', async (address) => {
            await mineBlock(address);
            showMenu();
          });
          break;
        case '4':
          rl.question('查询地址: ', async (address) => {
            await getBalance(address);
            showMenu();
          });
          break;
        case '5':
          rl.question('发送方钱包名称: ', (name) => {
            rl.question('钱包密码: ', (password) => {
              rl.question('接收方地址: ', (toAddress) => {
                rl.question('转账金额: ', async (amount) => {
                  const tx = await createTransaction(name, password, toAddress, parseFloat(amount));
                  if (tx && tx.transaction) {
                    await submitTransaction(tx.transaction);
                  }
                  showMenu();
                });
              });
            });
          });
          break;
        case '6':
          await getBlockchainStatus();
          showMenu();
          break;
        case '7':
          console.log('退出测试工具...');
          rl.close();
          break;
        default:
          console.log('无效选择，请重试');
          showMenu();
      }
    } catch (error) {
      console.error('操作出错:', error);
      showMenu();
    }
  });
}

// 启动测试工具
console.log('启动CosmJS区块链测试工具...');
loadState();
showMenu();
