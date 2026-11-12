import app from './app.js';
import { connectDB } from './config/database.js';
import { env } from './config/environment.js';

async function startServer() {
  try {
    console.log('[Relay] Connecting to database...');
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Relay Backend running on http://localhost:${env.PORT}`);
      console.log(`🔒 Security: Helmet, JWT ACLs, Rate Limiter Active`);
      console.log(`🤖 AI Engine: Gemini API (Fallback: Rule-Based Extractor)`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('[Relay] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
