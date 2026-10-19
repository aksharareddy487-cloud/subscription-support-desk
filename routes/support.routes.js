import express from 'express';
import {
  handleSupportAgent,
  handleSupportChat,
  getPublicHelpArticles,
  getPublicServiceStatus,
} from '../controllers/support.controller.js';
import { requireAuth, requireOrgMembership } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (as specified in project brief)
router.get('/help', getPublicHelpArticles);
router.get('/status', getPublicServiceStatus);

// Protected routes (Customer AI investigation & chat)
router.post('/support-agent', requireAuth, requireOrgMembership, handleSupportAgent);
router.post('/support-chat', requireAuth, requireOrgMembership, handleSupportChat);

export default router;
