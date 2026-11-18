import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

export const ROLE_ACLS = {
  lead: ['team', 'leads_only', 'owner_only'],
  departing: ['team', 'owner_only'],
  incoming_dev: ['team'],
  incoming_designer: ['team'],
};

export const DEMO_USERS = {
  lead: {
    id: 'user_lead_maya',
    name: 'Maya',
    email: 'lead@relay.demo',
    role: 'lead',
    title: 'Engineering Lead',
    demoPassword: 'relay2026!',
    aliases: ['maya@campus.edu'],
  },
  departing: {
    id: 'user_dep_aarav',
    name: 'Aarav',
    email: 'departing@relay.demo',
    role: 'departing',
    title: 'Senior Backend Engineer (Departing)',
    demoPassword: 'relay2026!',
    aliases: ['aarav@campus.edu'],
  },
  incoming_dev: {
    id: 'user_inc_dev',
    name: 'Devon (Incoming Dev)',
    email: 'incoming_dev@relay.demo',
    role: 'incoming_dev',
    title: 'Incoming Software Engineer',
    demoPassword: 'relay2026!',
    aliases: ['devon@campus.edu'],
  },
  incoming_designer: {
    id: 'user_inc_des',
    name: 'Dana (Incoming Designer)',
    email: 'incoming_designer@relay.demo',
    role: 'incoming_designer',
    title: 'Incoming Product Designer',
    demoPassword: 'relay2026!',
    aliases: ['dana@campus.edu'],
  },
};

export function signToken(user) {
  const allowedAcls = ROLE_ACLS[user.role] || ['team'];
  return jwt.sign(
    {
      id: user.id || user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      allowedAcls,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid Authorization header. Please log in.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    // Ensure allowedAcls is populated based on role
    if (!req.user.allowedAcls) {
      req.user.allowedAcls = ROLE_ACLS[req.user.role] || ['team'];
    }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token has expired or is invalid. Please log in again.',
    });
  }
}

// Optional auth: if token present, attach user; otherwise default to public / guest lead for seamless demo if needed
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
      req.user.allowedAcls = ROLE_ACLS[req.user.role] || ['team'];
      return next();
    } catch (e) {
      // pass through
    }
  }
  // Default demo user fallback: lead so public unauthenticated explore works smoothly if accessed directly
  req.user = {
    ...DEMO_USERS.lead,
    allowedAcls: ROLE_ACLS.lead,
  };
  next();
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' is not authorized to perform this action. Required: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

export const requireLead = requireRole(['lead']);
