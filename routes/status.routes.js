import express from 'express';
import {
  getStatus,
  getServiceByFeature,
  getIncidentsAdmin,
  getIncidentById,
  createIncident,
  updateIncident,
} from '../controllers/status.controller.js';
import { requireAuth, requireRole, logSensitiveAction } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route: sanitized incident & service updates
router.get('/', getStatus);

// Incident routes
router.get('/incidents', getIncidentsAdmin);
router.get('/incidents/:id', getIncidentById);

router.post(
  '/incidents',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('CREATE_INCIDENT'),
  createIncident
);

router.patch(
  '/incidents/:id',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('UPDATE_INCIDENT'),
  updateIncident
);

router.put(
  '/incidents/:id',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('UPDATE_INCIDENT'),
  updateIncident
);

// Feature-specific status (must be after /incidents to prevent collision)
router.get('/:feature', getServiceByFeature);

export default router;
