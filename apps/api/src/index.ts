// Social Suite Pro - Unified API Server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './trpc';
import { appRouter } from './routers';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'social-suite-pro-api',
    modules: ['headshot-studio', 'social-manager', 'sentiment-agent'],
    version: '1.0.0',
  });
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Social Suite Pro API Server');
  console.log('================================');
  console.log(`📡 API: http://localhost:${PORT}/trpc`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Modules:');
  console.log('  ✅ Headshot Studio');
  console.log('  ✅ Social Manager');
  console.log('  ✅ Sentiment Agent');
  console.log('  ✅ Unified Analytics');
  console.log('');
});
