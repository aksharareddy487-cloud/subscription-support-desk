/**
 * Sanitizes user objects to prevent leaking passwords, hash values,
 * verification tokens, and sensitive metadata in responses and logs.
 *
 * @param {Object} user - Mongoose document or plain JS user object
 * @returns {Object} Safe user representation
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : { ...user };

  delete userObj.passwordHash;
  delete userObj.verificationToken;
  delete userObj.verificationTokenExpires;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpires;
  delete userObj.__v;

  return userObj;
};

/**
 * Sanitizes any data payload before passing to LangChain / LLM context or logs.
 * Redacts tokens, passwords, credit card numbers, and secret keys.
 * 
 * @param {any} data - Object or string to sanitize
 * @returns {any} Sanitized object or string
 */
export const sanitizeForModelContext = (data) => {
  if (!data) return data;

  const SENSITIVE_KEYS = [
    'password',
    'passwordhash',
    'token',
    'sessionid',
    'secret',
    'creditcard',
    'cvv',
    'cardnumber',
    'authorization',
    'cookie',
  ];

  if (typeof data === 'string') {
    // Redact Bearer tokens, JWTs, card numbers, passwords in string
    return data
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_CARD]')
      .replace(/(password|secret|token)\s*[:=]\s*["']?[^,\s"']+/gi, '$1=[REDACTED]');
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(sanitizeForModelContext);
    }

    const clean = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
        clean[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = sanitizeForModelContext(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  return data;
};
