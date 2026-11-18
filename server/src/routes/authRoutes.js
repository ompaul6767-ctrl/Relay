import express from 'express';
import { demoLoginSchema } from './validators.js';
import { DEMO_USERS, signToken, authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { env } from '../config/environment.js';

const router = express.Router();

// Simple in-memory rate limiting map for auth endpoints
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }

  rateLimitMap.set(ip, record);
  return record.count <= MAX_ATTEMPTS_PER_WINDOW;
}

/**
 * GET /api/auth/demo-accounts
 * Public endpoint listing the 4 demo accounts with fake emails & passwords.
 */
router.get('/demo-accounts', (req, res) => {
  if (!env.ALLOW_DEMO_LOGIN) {
    return res.status(403).json({ error: 'Demo accounts disabled' });
  }

  const accounts = Object.values(DEMO_USERS).map((u) => ({
    role: u.role,
    name: u.name,
    email: u.email,
    demoPassword: u.demoPassword,
    title: u.title,
  }));

  return res.json({
    enabled: true,
    accounts,
  });
});

/**
 * POST /api/auth/demo-login
 * Logs in as one of the pre-configured demo roles (lead, departing, incoming_dev, incoming_designer)
 * Returns a signed JWT without requiring passwords or sign-up.
 */
router.post('/demo-login', async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Demo login rate limit reached. Please wait a minute before trying again.',
      });
    }

    if (!env.ALLOW_DEMO_LOGIN) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Demo login is disabled on this server.',
      });
    }

    const parseResult = demoLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { role } = parseResult.data;
    const demoUser = DEMO_USERS[role];

    if (!demoUser) {
      return res.status(400).json({ error: 'Unknown demo role' });
    }

    // Persist or find demo user in database
    let dbUser = await User.findOne({ role });
    if (!dbUser) {
      dbUser = await User.create({
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
      });
    } else if (dbUser.email !== demoUser.email) {
      dbUser.email = demoUser.email;
      await dbUser.save();
    }

    const token = signToken({
      id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        role: dbUser.role,
        email: dbUser.email,
        title: demoUser.title,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Real email + password login that verifies against demo accounts or registered users.
 */
router.post('/login', async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Login rate limit reached. Please wait a minute before trying again.',
      });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Both email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check against demo accounts if demo login is allowed
    if (env.ALLOW_DEMO_LOGIN) {
      const matchedDemoUser = Object.values(DEMO_USERS).find((u) => {
        if (u.email.toLowerCase() === normalizedEmail) return true;
        if (u.aliases && u.aliases.some((a) => a.toLowerCase() === normalizedEmail)) return true;
        return false;
      });

      if (matchedDemoUser && matchedDemoUser.demoPassword === password) {
        let dbUser = await User.findOne({ role: matchedDemoUser.role });
        if (!dbUser) {
          dbUser = await User.create({
            name: matchedDemoUser.name,
            email: matchedDemoUser.email,
            role: matchedDemoUser.role,
          });
        }

        const token = signToken({
          id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
        });

        return res.json({
          success: true,
          token,
          user: {
            id: dbUser._id,
            name: dbUser.name,
            role: dbUser.role,
            email: dbUser.email,
            title: matchedDemoUser.title,
          },
        });
      }
    }

    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Invalid email or password. Use one of the Demo Accounts shown on the landing page (e.g. lead@relay.demo / relay2026!).',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({
    user: req.user,
  });
});

export default router;
