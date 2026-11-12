import express from 'express';
import { demoLoginSchema } from './validators.js';
import { DEMO_USERS, signToken, authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = express.Router();

/**
 * POST /api/auth/demo-login
 * Logs in as one of the pre-configured demo roles (lead, departing, incoming_dev, incoming_designer)
 * Returns a signed JWT without requiring passwords or sign-up.
 */
router.post('/demo-login', async (req, res, next) => {
  try {
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
 * GET /api/auth/me
 * Returns the currently authenticated user
 */
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({
    user: req.user,
  });
});

export default router;
