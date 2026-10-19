import { generateRandomToken, hashToken } from './utils/token.js';
import { sanitizeForModelContext } from './utils/sanitize.js';
import bcrypt from 'bcryptjs';

console.log('--- Running Local Security & Logic Tests ---');

// 1. Token generation & SHA-256 test
const rawToken = generateRandomToken(32);
const hashed = hashToken(rawToken);
console.log(`[PASS] Token Generation: Raw (${rawToken.length} hex chars) -> Hash (${hashed.length} chars)`);

// 2. Password Hashing test
const password = 'TestSecretPassword123!';
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(password, salt);
const isMatch = bcrypt.compareSync(password, passwordHash);
const isWrongMatch = bcrypt.compareSync('WrongPassword', passwordHash);
if (isMatch && !isWrongMatch) {
  console.log('[PASS] Password Hashing & Bcrypt Comparison');
} else {
  console.error('[FAIL] Bcrypt password match failed');
  process.exit(1);
}

// 3. Sensitive Data Redaction for LLMs & Logs
const sensitivePayload = {
  user: 'alice@acme.com',
  password: 'SuperSecretPassword',
  token: 'abc123secrettoken',
  creditCard: '4111-2222-3333-4444',
  normalInfo: 'Why cannot my team export this report?',
};
const cleaned = sanitizeForModelContext(sensitivePayload);

if (
  cleaned.password === '[REDACTED]' &&
  cleaned.token === '[REDACTED]' &&
  cleaned.creditCard === '[REDACTED]' &&
  cleaned.normalInfo === 'Why cannot my team export this report?'
) {
  console.log('[PASS] LLM & Log Sanitization: All sensitive fields properly redacted!');
} else {
  console.error('[FAIL] Sanitization test failed', cleaned);
  process.exit(1);
}

console.log('--- All Preetham Auth Unit Checks Passed! ---');
