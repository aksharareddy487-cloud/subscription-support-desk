import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login requests to mitigate credential stuffing and brute-force attacks.
 * Allows 5 attempts per 15 minutes.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts allowed
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Rate limiter for password reset requests.
 * Allows 3 requests per 30 minutes.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Rate limit exceeded. Please slow down your requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
