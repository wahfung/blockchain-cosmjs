import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { makeCosmoshubPath } from '@cosmjs/amino';
import { toHex } from '@cosmjs/encoding';
import { sha256 } from '@cosmjs/crypto';
import fs from 'fs';
import path from 'path';

class Wallet {
  constructor() {
    this.wallet = null;
    this.address = null;
    this.walletDir = path.join(process.cwd(), 'wallets');
    
    // 如果钱包目录不存在则创建
    if (!fs.existsSync(this.walletDir)) {
      fs.mkdirSync(this.walletDir, { recursive: true });
      console.log(`已创建钱包目录: ${this.walletDir}`);
    }
  }

  async createWallet(name, password) {
    try {
      // 生成24个助记词
      const wallet = await DirectSecp256k1HdWallet.generate(24, {
        prefix: 'cosmos',
        hdPaths: [makeCosmoshubPath(0)]
      });
      
      const mnemonic = wallet.mnemonic;
      const [account] = await wallet.getAccounts();
      
      // 使用加密保存钱包到文件
      const walletData = {
        address: account.address,
        pubkey: toHex(account.pubkey),
        mnemonic: mnemonic,
        createdAt: Date.now()
      };
      
      const walletKey = this._generateWalletKey(name, password);
      const walletPath = path.join(this.walletDir, `${walletKey}.json`);
      
      console.log(`创建钱包: ${name}, 文件名: ${walletKey}.json`);
      
      // 在存储之前加密钱包数据
      const encryptedData = this._encryptWalletData(walletData, password);
      fs.writeFileSync(walletPath, JSON.stringify(encryptedData, null, 2));
      
      // 输出调试信息
      console.log(`钱包文件已保存到: ${walletPath}`);
      console.log(`钱包地址: ${account.address}`);
      
      return {
        address: account.address,
        mnemonic: mnemonic,
        path: walletPath
      };
    } catch (error) {
      console.error('创建钱包时出错:', error);
      throw error;
    }
  }

  async loadWallet(name, password) {
    try {
      const walletKey = this._generateWalletKey(name, password);
      const walletPath = path.join(this.walletDir, `${walletKey}.json`);
      
      console.log(`尝试加载钱包文件: ${walletPath}`);
      
      // 列出钱包目录中的所有文件进行调试
      if (fs.existsSync(this.walletDir)) {
        const files = fs.readdirSync(this.walletDir);
        console.log('钱包目录中的文件:', files);
      }
      
      if (!fs.existsSync(walletPath)) {
        throw new Error(`找不到钱包文件: ${walletPath}`);
      }
      
      const fileContent = fs.readFileSync(walletPath, 'utf8');
      console.log(`钱包文件存在，大小: ${fileContent.length} 字节`);
      
      const encryptedData = JSON.parse(fileContent);
      const walletData = this._decryptWalletData(encryptedData, password);
      
      console.log('钱包数据解密成功');
      
      // 从助记词创建钱包
      this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(walletData.mnemonic, {
        prefix: 'cosmos',
        hdPaths: [makeCosmoshubPath(0)]
      });
      
      const [account] = await wallet.getAccounts();
      this.address = account.address;
      
      console.log(`钱包加载成功，地址: ${this.address}`);
      
      return {
        address: account.address,
        pubkey: toHex(account.pubkey)
      };
    } catch (error) {
      console.error(`加载钱包 ${name} 时出错:`, error);
      throw error;
    }
  }

  async listWallets() {
    try {
      if (!fs.existsSync(this.walletDir)) {
        console.log(`钱包目录不存在: ${this.walletDir}`);
        return [];
      }
      
      const files = fs.readdirSync(this.walletDir);
      console.log(`找到 ${files.length} 个钱包文件`);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('列出钱包时出错:', error);
      throw error;
    }
  }

  async signTransaction(transaction) {
    if (!this.wallet) {
      throw new Error('没有加载钱包');
    }
    
    try {
      const [account] = await this.wallet.getAccounts();
      const txData = JSON.stringify(transaction);
      const signDoc = new TextEncoder().encode(txData);
      
      // 修复：直接使用签名方法，确保返回正确的签名
      const signature = await this.wallet.sign(account.address, signDoc);
      
      return {
        transaction,
        signature: toHex(signature),
        pubkey: toHex(account.pubkey)
      };
    } catch (error) {
      console.error('签名交易时出错:', error);
      throw error;
    }
  }

  async createTransaction(toAddress, amount) {
    if (!this.wallet || !this.address) {
      throw new Error('没有加载钱包');
    }
    
    if (!toAddress) {
      throw new Error('需要接收方地址');
    }
    
    if (amount <= 0) {
      throw new Error('金额必须为正数');
    }
    
    const transaction = {
      fromAddress: this.address,
      toAddress: toAddress,
      amount: amount,
      timestamp: Date.now()
    };
    
    return await this.signTransaction(transaction);
  }

  getAddress() {
    return this.address;
  }

  // 钱包安全的私有方法
  _generateWalletKey(name, password) {
    const data = `${name}-${password}`;
    const key = toHex(sha256(new TextEncoder().encode(data))).substring(0, 16);
    console.log(`生成钱包密钥: ${key} (来自 ${name})`);
    return key;
  }

  _encryptWalletData(data, password) {
    // 简单加密用于演示目的
    // 在生产环境中，使用更强的加密方法
    const encryptionKey = toHex(sha256(new TextEncoder().encode(password)));
    const jsonData = JSON.stringify(data);
    
    // XOR加密作为简单示例
    let encrypted = '';
    for (let i = 0; i < jsonData.length; i++) {
      const charCode = jsonData.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return {
      data: Buffer.from(encrypted).toString('base64'),
      checksum: toHex(sha256(new TextEncoder().encode(jsonData)))
    };
  }

  _decryptWalletData(encryptedData, password) {
    // 简单解密用于演示目的
    const encryptionKey = toHex(sha256(new TextEncoder().encode(password)));
    const encryptedStr = Buffer.from(encryptedData.data, 'base64').toString();
    
    // XOR解密
    let decrypted = '';
    for (let i = 0; i < encryptedStr.length; i++) {
      const charCode = encryptedStr.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    // 验证校验和
    const checksum = toHex(sha256(new TextEncoder().encode(decrypted)));
    if (checksum !== encryptedData.checksum) {
      throw new Error('密码无效或钱包文件已损坏');
    }
    
    return JSON.parse(decrypted);
  }
}

export { Wallet };
