import crypto from 'crypto';

/**
 * Double Submit / Session-bound CSRF Protection Middleware.
 * 
 * 1. GET /api/auth/csrf-token generates or retrieves token and sets a non-httpOnly cookie 'XSRF-TOKEN'
 *    so the frontend React app can read it and send it back via 'X-CSRF-Token' header.
 * 2. On mutating requests (POST, PUT, PATCH, DELETE), verify the incoming header against session token.
 */

export const provideCsrfToken = (req, res) => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
  }

  // Set standard readable XSRF-TOKEN cookie for React/Axios/fetch clients
  res.cookie('XSRF-TOKEN', req.session.csrfSecret, {
    httpOnly: false, // Must be readable by frontend client
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  });

  return res.json({ csrfToken: req.session.csrfSecret });
};

export const verifyCsrf = (req, res, next) => {
  // Safe HTTP methods do not require CSRF token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Allow pre-flight or auth endpoints that do not have session yet (like initial login/signup)
  const exemptPaths = ['/api/auth/login', '/api/auth/signup'];
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  const clientToken =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  if (!clientToken || !req.session?.csrfSecret || clientToken !== req.session.csrfSecret) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED',
    });
  }

  next();
};
