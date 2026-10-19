import { User, USER_ROLES } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * Ensures the incoming request has a valid, active server-side session.
 * Hydrates req.user with the authenticated user document.
 */
export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
        code: 'UNAUTHENTICATED',
      });
    }

    const user = await User.findById(req.session.userId).populate('organizationId');
    if (!user) {
      // Session exists but user was deleted
      req.session.destroy();
      res.clearCookie('support_desk.sid');
      return res.status(401).json({
        error: 'User account no longer exists. Session terminated.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
};

/**
 * Enforces Role-Based Access Control (RBAC).
 * Only users whose role matches one of the allowed roles may proceed.
 * 
 * @param {string|string[]} roles - One role or array of roles allowed
 */
export const requireRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowed.join(', ')}]. Current role: '${req.user.role}'`,
        code: 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
};

/**
 * Convenient role helpers for teammates
 */
export const requireCustomer = requireRole([USER_ROLES.CUSTOMER]);
export const requireSupportSpecialist = requireRole([USER_ROLES.SUPPORT_SPECIALIST, USER_ROLES.SUPERVISOR]);
export const requireKnowledgeManager = requireRole([USER_ROLES.KNOWLEDGE_MANAGER, USER_ROLES.SUPERVISOR]);
export const requireSupervisor = requireRole([USER_ROLES.SUPERVISOR]);
export const requireStaff = requireRole([
  USER_ROLES.SUPPORT_SPECIALIST,
  USER_ROLES.KNOWLEDGE_MANAGER,
  USER_ROLES.SUPERVISOR,
]);

/**
 * Enforces organization boundary isolation (Tenant Isolation).
 * Customers can ONLY access resources belonging to their own organization.
 */
export const requireOrgMembership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Staff members can inspect tickets across organizations if authorized
  if (req.user.role !== USER_ROLES.CUSTOMER) {
    return next();
  }

  const requestedOrgId =
    req.params.orgId ||
    req.params.organizationId ||
    req.query.orgId ||
    req.body.organizationId ||
    req.body.orgId;

  if (!requestedOrgId) {
    // If no org specified, route can continue assuming it uses req.user.organizationId
    return next();
  }

  const userOrgId = req.user.organizationId?._id
    ? req.user.organizationId._id.toString()
    : req.user.organizationId?.toString();

  if (userOrgId !== requestedOrgId.toString()) {
    return res.status(403).json({
      error: 'Cross-tenant access violation: You can only access your own organization data',
      code: 'ORG_ACCESS_DENIED',
    });
  }

  next();
};

/**
 * Helper specifically for Hansika (#5 - AI Agent) and Netra (#6 - AI Tools).
 * "Tools derive the active customer scope from the authenticated session."
 * Ensures AI prompts and tools NEVER accept arbitrary customer IDs from client inputs.
 *
 * @param {Express.Request} req 
 * @returns {Object} Safe scope context
 */
export const extractCustomerScope = (req) => {
  if (!req.user) {
    throw new Error('Cannot extract customer scope from unauthenticated request');
  }

  return {
    userId: req.user._id.toString(),
    userName: req.user.name,
    userEmail: req.user.email,
    role: req.user.role,
    organizationId: req.user.organizationId?._id?.toString() || req.user.organizationId?.toString(),
    organizationName: req.user.organizationId?.name || 'Unknown Org',
    plan: req.user.organizationId?.plan || 'starter',
    productVersion: req.user.organizationId?.productVersion || 'v2.4',
    entitlements: req.user.organizationId?.entitlements || {},
  };
};

/**
 * Audit Logger Middleware for sensitive checks and staff operations.
 * "Staff access follows assignment and support permissions; sensitive checks are audited."
 */
export const logSensitiveAction = (actionName, getResourceId = (req) => req.params.id) => {
  return async (req, res, next) => {
    // Continue execution first
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400 && req.user) {
        try {
          await AuditLog.create({
            userId: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: actionName,
            resourceType: req.baseUrl.replace('/api/', '') || 'resource',
            resourceId: getResourceId(req) || 'N/A',
            details: {
              method: req.method,
              url: req.originalUrl,
              bodySnippet: req.method !== 'GET' ? { ...req.body, password: '[REDACTED]' } : undefined,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        } catch (auditErr) {
          console.error('[Audit Log Failure]:', auditErr.message);
        }
      }
    });
    next();
  };
};
