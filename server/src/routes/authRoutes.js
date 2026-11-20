import express from 'express';
import bcrypt from 'bcryptjs';
import { demoLoginSchema } from './validators.js';
import { DEMO_USERS, signToken, verifyAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { env } from '../config/environment.js';

const router = express.Router();

// In-memory rate limiting map for auth endpoints
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 40;

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
 * Public endpoint listing the configured demo accounts for quick judge access.
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
 * POST /api/auth/login
 * Full end-to-end email + password authentication with bcrypt hashing.
 * Checks MongoDB users, with fallback to auto-seeding demo accounts.
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

    // 1. Look up user in MongoDB
    let dbUser = await User.findOne({ email: normalizedEmail });

    // 2. If user exists in DB and has password, compare using bcrypt
    if (dbUser && dbUser.password) {
      const isMatch = await dbUser.comparePassword(password);
      if (isMatch) {
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
          },
        });
      }
    }

    // 3. Check against DEMO_USERS in-memory list (covers demo accounts even before first startup seed)
    if (env.ALLOW_DEMO_LOGIN) {
      const matchedDemoUser = Object.values(DEMO_USERS).find((u) => {
        if (u.email.toLowerCase() === normalizedEmail) return true;
        if (u.aliases && u.aliases.some((a) => a.toLowerCase() === normalizedEmail)) return true;
        return false;
      });

      if (matchedDemoUser && matchedDemoUser.demoPassword === password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!dbUser) {
          dbUser = await User.create({
            name: matchedDemoUser.name,
            email: matchedDemoUser.email.toLowerCase(),
            role: matchedDemoUser.role,
            password: hashedPassword,
          });
        } else {
          dbUser.password = hashedPassword;
          dbUser.name = matchedDemoUser.name;
          dbUser.role = matchedDemoUser.role;
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
            title: matchedDemoUser.title,
          },
        });
      }
    }

    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Invalid email or password. Please use the Quick Judge Demo Login or check your credentials.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears the session on the backend.
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (used to verify active sessions on page refresh).
 */
router.get('/me', verifyAuth, async (req, res, next) => {
  try {
    let userDetails = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      email: req.user.email,
      allowedAcls: req.user.allowedAcls,
    };

    try {
      const dbUser = await User.findById(req.user.id).select('-password').lean();
      if (dbUser) {
        userDetails = {
          id: dbUser._id,
          name: dbUser.name,
          role: dbUser.role,
          email: dbUser.email,
          allowedAcls: req.user.allowedAcls,
        };
      }
    } catch (e) {
      // Use token claims if DB lookup encounters an issue
    }

    return res.json({
      success: true,
      user: userDetails,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/demo-login
 * Direct one-click login by role for demo personas (lead, departing, incoming_dev, incoming_designer).
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
    const demoUser = DEMO_USERS[role] || (role === 'lead' ? DEMO_USERS.demo_judge : null);

    if (!demoUser) {
      return res.status(400).json({ error: 'Unknown demo role' });
    }

    let dbUser = await User.findOne({ email: demoUser.email.toLowerCase() });
    if (!dbUser) {
      const hashedPassword = await bcrypt.hash(demoUser.demoPassword || 'relay2026!', 10);
      dbUser = await User.create({
        name: demoUser.name,
        email: demoUser.email.toLowerCase(),
        role: demoUser.role,
        password: hashedPassword,
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
        title: demoUser.title,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
