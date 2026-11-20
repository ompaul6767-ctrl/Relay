import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { DEMO_USERS } from '../middleware/auth.js';

/**
 * Automatically seeds pre-configured demo user accounts with bcrypt-hashed passwords on server startup.
 * Ensures demo credentials work out-of-the-box in production (Render) and local environments.
 */
export async function seedDemoUsers() {
  try {
    const seeded = [];

    for (const [key, demoUser] of Object.entries(DEMO_USERS)) {
      const email = demoUser.email.toLowerCase().trim();
      const rawPassword = demoUser.demoPassword || 'relay2026!';

      let user = await User.findOne({ email });

      if (!user) {
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        user = await User.create({
          name: demoUser.name,
          email,
          role: demoUser.role,
          password: hashedPassword,
        });
        seeded.push(`${demoUser.name} (${email})`);
      } else {
        // If user exists without password or password needs update
        const hasValidPassword = user.password && user.password.startsWith('$2');
        if (!hasValidPassword) {
          user.password = await bcrypt.hash(rawPassword, 10);
          await user.save();
          seeded.push(`${demoUser.name} (${email}) [password updated]`);
        }
      }
    }

    if (seeded.length > 0) {
      console.log(`[Relay Auth] Seeded ${seeded.length} demo accounts in database.`);
    }
    return true;
  } catch (error) {
    console.error('[Relay Auth] Failed to seed demo users:', error.message);
    return false;
  }
}
