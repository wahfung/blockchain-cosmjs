import { app } from './server.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// This file serves as the entry point
console.log(`Starting CosmJS Blockchain on port ${PORT}...`);
console.log('Use the API endpoints to interact with the blockchain');
console.log('Documentation: http://localhost:' + PORT + '/');
