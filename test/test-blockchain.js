import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import readline from "readline";

// 创建readline接口用于交互式测试
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// API基础URL
const BASE_URL = "http://localhost:3000";
const WALLET_DIR = path.join(process.cwd(), "wallets");

// 确保钱包目录存在
if (!fs.existsSync(WALLET_DIR)) {
  fs.mkdirSync(WALLET_DIR, { recursive: true });
  console.log(`已创建钱包目录: ${WALLET_DIR}`);
}

// API调用辅助函数
async function callApi(endpoint, method = "GET", data = null) {
  try {
    console.log(`调用API: ${method} ${endpoint}`);
    if (data) {
      console.log("请求数据:", JSON.stringify(data));
    }

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();

    console.log("API响应:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`API调用失败 ${method} ${endpoint}:`, error);
    throw error;
  }
}

// 1. 创建钱包
async function createWallet(name, password) {
  console.log(`创建钱包 ${name}...`);
  try {
    const result = await callApi("/wallet", "POST", { name, password });

    if (result.address) {
      console.log("钱包创建成功:", result);
      // 列出钱包目录中的文件
      console.log("钱包目录内容:");
      if (fs.existsSync(WALLET_DIR)) {
        const files = fs.readdirSync(WALLET_DIR);
        console.log(files);
      } else {
        console.log("钱包目录不存在");
      }
    } else {
      console.error("钱包创建API返回的响应中没有地址");
    }

    return result;
  } catch (error) {
    console.error("创建钱包失败:", error);
    throw error;
  }
}

// 2. 挖矿
async function mineBlock(minerAddress) {
  console.log(`以地址 ${minerAddress} 进行挖矿...`);
  try {
    const result = await callApi("/mine", "POST", { minerAddress });
    console.log("挖矿成功:", result);
    return result;
  } catch (error) {
    console.error("挖矿失败:", error);
    throw error;
  }
}

// 3. 查询余额
async function getBalance(address) {
  console.log(`查询地址 ${address} 的余额...`);
  try {
    const result = await callApi(`/balance/${address}`);
    console.log("余额:", result);
    return result;
  } catch (error) {
    console.error("查询余额失败:", error);
    throw error;
  }
}

// 4. 创建交易
async function createTransaction(name, password, toAddress, amount) {
  console.log(`创建从 ${name} 到 ${toAddress} 的交易，金额: ${amount}...`);
  try {
    // 尝试先加载钱包以获取更多调试信息
    try {
      console.log(`尝试先加载钱包 ${name} 获取调试信息...`);
      const loadWalletResult = await callApi("/wallet/load", "POST", {
        name,
        password,
      });
      console.log("加载钱包成功:", loadWalletResult);
    } catch (error) {
      console.warn("预加载钱包失败 (仅用于调试):", error.message);
    }

    const result = await callApi("/wallet/transaction", "POST", {
      name,
      password,
      toAddress,
      amount,
    });
    console.log("交易创建成功:", result);
    return result;
  } catch (error) {
    console.error("创建交易失败:", error);
    throw error;
  }
}

// 5. 提交交易
async function submitTransaction(transaction) {
  console.log("提交交易...");
  try {
    const { transaction: tx, signature, pubkey } = transaction;
    const result = await callApi("/transaction", "POST", {
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      signature,
      pubkey,
    });
    console.log("交易提交成功:", result);
    return result;
  } catch (error) {
    console.error("提交交易失败:", error);
    throw error;
  }
}

// 6. 获取区块链状态
async function getBlockchainStatus() {
  console.log("获取区块链状态...");
  try {
    const result = await callApi("/blockchain");
    console.log(`区块链长度: ${result.length} 区块`);
    console.log(`待处理交易: ${result.pendingTransactions.length}`);
    return result;
  } catch (error) {
    console.error("获取区块链状态失败:", error);
    throw error;
  }
}

// 7. 列出所有钱包
async function listWallets() {
  console.log("列出所有钱包...");
  try {
    const result = await callApi("/wallets");
    console.log("钱包列表:", result);

    // 同时打印文件系统中的钱包文件
    console.log("钱包目录内容:");
    if (fs.existsSync(WALLET_DIR)) {
      const files = fs.readdirSync(WALLET_DIR);
      console.log(files);
    } else {
      console.log("钱包目录不存在");
    }

    return result;
  } catch (error) {
    console.error("列出钱包失败:", error);
    throw error;
  }
}

// 手动测试钱包加载
async function testWalletLoading() {
  rl.question("输入钱包名称: ", (name) => {
    rl.question("输入钱包密码: ", async (password) => {
      try {
        console.log(`尝试加载钱包 ${name}...`);

        // 生成钱包密钥（模拟内部实现以便调试）
        console.log("钱包目录:", WALLET_DIR);

        const files = fs.existsSync(WALLET_DIR)
          ? fs.readdirSync(WALLET_DIR)
          : [];
        console.log("钱包目录中的文件:", files);

        const loadResult = await callApi("/wallet/load", "POST", {
          name,
          password,
        });
        console.log("钱包加载成功:", loadResult);

        showMenu();
      } catch (error) {
        console.error("钱包加载失败:", error);
        showMenu();
      }
    });
  });
}

// 交互式菜单
function showMenu() {
  console.log("\n=== CosmJS区块链测试工具 ===");
  console.log("1. 创建新钱包");
  console.log("2. 挖矿");
  console.log("3. 查询余额");
  console.log("4. 创建并提交交易");
  console.log("5. 查看区块链状态");
  console.log("6. 列出所有钱包");
  console.log("7. 测试钱包加载");
  console.log("8. 退出");

  rl.question("\n请选择操作: ", async (choice) => {
    try {
      switch (choice) {
        case "1":
          rl.question("钱包名称: ", (name) => {
            rl.question("钱包密码: ", async (password) => {
              const wallet = await createWallet(name, password);
              if (wallet && wallet.address) {
                console.log(`新钱包地址: ${wallet.address}`);
                console.log(`助记词 (请安全保存): ${wallet.mnemonic}`);
              }
              showMenu();
            });
          });
          break;
        case "2":
          rl.question("矿工地址: ", async (address) => {
            await mineBlock(address);
            showMenu();
          });
          break;
        case "3":
          rl.question("查询地址: ", async (address) => {
            await getBalance(address);
            showMenu();
          });
          break;
        case "4":
          rl.question("发送方钱包名称: ", (name) => {
            rl.question("钱包密码: ", (password) => {
              rl.question("接收方地址: ", (toAddress) => {
                rl.question("转账金额: ", async (amount) => {
                  try {
                    const tx = await createTransaction(
                      name,
                      password,
                      toAddress,
                      parseFloat(amount)
                    );
                    if (tx && tx.transaction) {
                      await submitTransaction(tx.transaction);
                    }
                  } catch (error) {
                    console.error("交易过程出错:", error);
                  }
                  showMenu();
                });
              });
            });
          });
          break;
        case "5":
          await getBlockchainStatus();
          showMenu();
          break;
        case "6":
          await listWallets();
          showMenu();
          break;
        case "7":
          await testWalletLoading();
          break;
        case "8":
          console.log("退出测试工具...");
          rl.close();
          break;
        default:
          console.log("无效选择，请重试");
          showMenu();
      }
    } catch (error) {
      console.error("操作出错:", error);
      showMenu();
    }
  });
}

// 启动测试工具
console.log("启动CosmJS区块链测试工具...");
console.log(`当前工作目录: ${process.cwd()}`);
console.log(`钱包目录: ${WALLET_DIR}`);

// 验证钱包目录
if (fs.existsSync(WALLET_DIR)) {
  console.log("钱包目录存在，列出内容:");
  const files = fs.readdirSync(WALLET_DIR);
  console.log(files);
} else {
  console.log("钱包目录不存在，将创建");
  fs.mkdirSync(WALLET_DIR, { recursive: true });
}

showMenu();
