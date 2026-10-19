import express from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import {
  requireAuth,
  requireRole,
  requireCustomer,
  requireSupportSpecialist,
  requireKnowledgeManager,
  requireSupervisor,
  extractCustomerScope,
} from '../middleware/auth.middleware.js';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { provideCsrfToken } from '../middleware/csrf.middleware.js';

const router = express.Router();

/**
 * Public Routes
 */
router.get('/csrf-token', provideCsrfToken);
router.post('/signup', signup);
router.post('/login', loginLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

/**
 * Protected Session Routes
 */
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

/**
 * Role Verification Test Endpoints
 * Teammates can call these endpoints during development to verify their session headers and permissions!
 */
router.get('/test/customer', requireAuth, requireCustomer, (req, res) => {
  res.json({
    message: 'Authorized: You have customer access.',
    scope: extractCustomerScope(req),
  });
});

router.get('/test/specialist', requireAuth, requireSupportSpecialist, (req, res) => {
  res.json({
    message: 'Authorized: You have support specialist privileges.',
    user: req.user.toSafeJSON(),
  });
});

router.get('/test/knowledge-manager', requireAuth, requireKnowledgeManager, (req, res) => {
  res.json({
    message: 'Authorized: You have knowledge manager privileges.',
    user: req.user.toSafeJSON(),
  });
});

router.get('/test/supervisor', requireAuth, requireSupervisor, (req, res) => {
  res.json({
    message: 'Authorized: You have supervisor privileges.',
    user: req.user.toSafeJSON(),
  });
});

router.get('/test/customer-scope', requireAuth, (req, res) => {
  const scope = extractCustomerScope(req);
  res.json({
    description: 'This is the sanitized scope object Hansika & Netra should inject into AI agents/tools',
    scope,
  });
});

export default router;
