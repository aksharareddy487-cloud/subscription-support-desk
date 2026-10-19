import crypto from 'crypto';

/**
 * Generates a cryptographically secure random hex string for tokens.
 * @param {number} bytes - Byte length (default 32 = 64 hex characters)
 * @returns {string} Raw token to send to the user
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hashes a token with SHA-256 before saving to database.
 * This ensures that even if DB is compromised, reset/verification tokens cannot be used directly.
 * @param {string} token 
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
