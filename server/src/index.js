import app from './app.js';
import { connectDB } from './config/database.js';
import { env } from './config/environment.js';
import { Case } from './models/Case.js';
import { seedDatabase } from '../scripts/seedHelper.js';
import { seedDemoUsers } from './services/seedUsers.js';

async function startServer() {
  try {
    console.log('[Relay] Connecting to database...');
    await connectDB();
    await seedDemoUsers();

    app.listen(env.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Relay Backend running on http://localhost:${env.PORT}`);
      console.log(`🔒 Security: Helmet, JWT ACLs, Rate Limiter Active`);
      console.log(`🤖 AI Engine: Gemini API (Fallback: Rule-Based Extractor)`);
      console.log(`===============================================`);
    });

    // Auto-seed demo case on first boot if database is fresh
    try {
      const demoCase = await Case.findOne({ title: 'Campus Event Portal' });
      if (!demoCase) {
        console.log('[Relay] Fresh database detected. Pre-seeding Campus Event Portal demo dataset...');
        await seedDatabase();
        console.log('[Relay] Initial demo dataset pre-seeded successfully.');
      }
    } catch (seedErr) {
      console.warn('[Relay] Auto-seed non-fatal notice:', seedErr.message);
    }
  } catch (error) {
    console.error('[Relay] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
