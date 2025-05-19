import { app } from './server.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3000;

// 此文件作为入口点
console.log(`正在启动CosmJS区块链，端口${PORT}...`);
console.log('使用API端点与区块链交互');
console.log('文档：http://localhost:' + PORT + '/');
