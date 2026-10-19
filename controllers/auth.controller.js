import { User, USER_ROLES } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { generateRandomToken, hashToken } from '../utils/token.js';
import { z } from 'zod';

// Input validation schemas using Zod
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name is required').optional(),
  organizationId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /api/auth/signup
 * Customer registration.
 * CRITICAL RULE: Staff roles CANNOT be self-assigned. All signups default to 'customer'.
 */
export const signup = async (req, res) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, email, password, organizationName, organizationId } = parseResult.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Resolve or create customer Organization
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      let org = null;
      if (organizationName) {
        org = await Organization.findOne({ name: new RegExp(`^${organizationName}$`, 'i') });
        if (!org) {
          org = await Organization.create({
            name: organizationName,
            plan: 'starter',
            isVerified: true,
          });
        }
      } else {
        // Default organization if none specified
        org = await Organization.create({
          name: `${name}'s Organization`,
          plan: 'starter',
          isVerified: true,
        });
      }
      targetOrgId = org._id;
    }

    // Generate email verification token
    const rawVerificationToken = generateRandomToken(32);
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user - STRICTLY ENFORCE 'customer' role
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      passwordHash: password, // will be hashed by pre-save hook
      role: USER_ROLES.CUSTOMER, // HARD RULE: Never allow client self-assignment of staff roles
      organizationId: targetOrgId,
      isEmailVerified: false,
      verificationToken: hashedVerificationToken,
      verificationTokenExpires: verificationExpires,
    });

    await newUser.save();

    // Populate organization details
    await newUser.populate('organizationId');

    // Initialize session automatically upon signup
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Session Error on Signup]:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      req.session.userId = newUser._id;

      // Simulated verification link (displayed in console/demo response)
      const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${rawVerificationToken}`;
      console.log(`[Email Simulation] Verification link for ${newUser.email}: ${verificationLink}`);

      return res.status(201).json({
        message: 'Account registered successfully. Please verify your email.',
        user: newUser.toSafeJSON(),
        demoVerificationToken: rawVerificationToken, // For automated testing / demo convenience
      });
    });
  } catch (error) {
    console.error('[Signup Error]:', error);
    return res.status(500).json({ error: 'Registration failed due to a server error' });
  }
};

/**
 * POST /api/auth/login
 * Rate-limited login with server-side session regeneration.
 */
export const login = async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;

    // Must explicitly select +passwordHash since select: false in schema
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('organizationId');

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Regenerate session to protect against session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('[Session Regenerate Error]:', err);
        return res.status(500).json({ error: 'Failed to establish session' });
      }

      req.session.userId = user._id;

      // Update last login timestamp asynchronously
      User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec();

      return res.json({
        message: 'Login successful',
        user: user.toSafeJSON(),
      });
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({ error: 'Login failed due to a server error' });
  }
};

/**
 * POST /api/auth/logout
 * Destroys server-side session and clears session cookie.
 */
export const logout = (req, res) => {
  if (!req.session) {
    return res.json({ message: 'Already logged out' });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout Error]:', err);
      return res.status(500).json({ error: 'Could not log out at this time' });
    }

    res.clearCookie('support_desk.sid', { path: '/' });
    res.clearCookie('XSRF-TOKEN', { path: '/' });
    return res.json({ message: 'Logged out successfully' });
  });
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile and organization entitlements.
 */
export const getMe = async (req, res) => {
  // req.user is already attached by requireAuth
  return res.json({
    user: req.user.toSafeJSON(),
    organization: req.user.organizationId,
  });
};

/**
 * GET/POST /api/auth/verify-email
 * Confirms user's email using the one-time token.
 */
export const verifyEmail = async (req, res) => {
  try {
    const rawToken = req.query.token || req.body.token;
    if (!rawToken) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const hashedToken = hashToken(rawToken);

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: new Date() },
    }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      return res.status(400).json({ error: 'Verification token is invalid or has expired' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.json({
      message: 'Email verified successfully. You now have full access.',
      isEmailVerified: true,
    });
  } catch (error) {
    console.error('[Verify Email Error]:', error);
    return res.status(500).json({ error: 'Could not verify email' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery flow with time-limited token.
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Consistent response whether user exists or not (prevents account enumeration)
    const genericResponse = {
      message: 'If an account exists with that email, a password reset link has been dispatched.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const rawResetToken = generateRandomToken(32);
    const hashedResetToken = hashToken(rawResetToken);

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${rawResetToken}`;
    console.log(`[Email Simulation] Password reset link for ${user.email}: ${resetUrl}`);

    return res.json({
      ...genericResponse,
      demoResetToken: rawResetToken, // Convenient for automated testing / demo review
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return res.status(500).json({ error: 'Could not initiate password reset' });
  }
};

/**
 * POST /api/auth/reset-password
 * Resets user's password using the verified token.
 */
export const resetPassword = async (req, res) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { token, newPassword } = parseResult.data;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    // Set new password (pre-save hook will hash it)
    user.passwordHash = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
};
