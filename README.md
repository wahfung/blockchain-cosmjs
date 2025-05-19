# Blockchain-CosmJS

基于CosmJS的区块链实现，具有挖矿和转账功能。

## 项目简介

这是一个使用CosmJS库实现的简单区块链，具有以下主要特性：

- 工作量证明(PoW)挖矿算法
- 安全的钱包创建和管理
- 基于CosmJS的加密和签名
- 交易验证和处理
- 区块链状态持久化
- RESTful API接口

## 技术栈

- **Node.js** - 运行环境
- **CosmJS** - Cosmos SDK的JavaScript实现，用于加密和签名
- **Express** - Web服务器和API
- **Level** - 数据持久化
- **Crypto-JS** - 额外的加密功能

## 安装与使用

### 前提条件

- Node.js (v14+)
- npm (v6+)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/wahfung/blockchain-cosmjs.git
cd blockchain-cosmjs
```

2. 安装依赖
```bash
npm install
```

3. 启动应用
```bash
npm start
```

默认情况下，API服务器将在 http://localhost:3000 上运行。

## 核心功能

### 区块链

- 创建区块
- 工作量证明挖矿
- 交易验证
- 区块链状态验证
- 余额查询

### 钱包

- 创建新钱包（生成24词助记词）
- 加载现有钱包
- 交易签名
- 加密保存钱包数据

### API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/blockchain` | GET | 获取整个区块链 |
| `/block/:index` | GET | 获取特定区块 |
| `/mine` | POST | 挖掘新区块 |
| `/transaction` | POST | 添加新交易 |
| `/balance/:address` | GET | 查询地址余额 |
| `/wallet` | POST | 创建新钱包 |
| `/wallet/load` | POST | 加载现有钱包 |
| `/wallet/transaction` | POST | A创建并签名交易 |
| `/wallets` | GET | 列出所有钱包 |
| `/validate` | GET | 验证区块链 |

## 基本使用流程

1. 创建一个钱包
2. 挖掘一些区块以获得代币
3. 向其他地址发送代币
4. 查询余额和交易历史

## 代码结构

```
blockchain-cosmjs/
├── data/                   # 区块链数据存储
├── wallets/                # 钱包文件存储
├── src/
│   ├── blockchain.js       # 区块链核心实现
│   ├── wallet.js           # 钱包功能实现
│   ├── server.js           # API服务器
│   └── index.js            # 应用入口点
└── package.json
```

## API使用示例

### 创建钱包

```bash
curl -X POST http://localhost:3000/wallet \
  -H "Content-Type: application/json" \
  -d '{"name": "mywallet", "password": "securepassword"}'
```

### 挖掘区块

```bash
curl -X POST http://localhost:3000/mine \
  -H "Content-Type: application/json" \
  -d '{"minerAddress": "cosmos1..."}'
```

### 创建交易

```bash
curl -X POST http://localhost:3000/wallet/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mywallet",
    "password": "securepassword",
    "toAddress": "cosmos1...",
    "amount": 10
  }'
```

### 查询余额

```bash
curl http://localhost:3000/balance/cosmos1...
```

## 扩展与改进方向

- 添加P2P网络支持
- 实现Cosmos风格的权益证明(PoS)共识
- 支持智能合约
- 改进交易验证和防重放攻击
- 添加区块浏览器UI
- 实现跨链交互

## 许可证

MIT
