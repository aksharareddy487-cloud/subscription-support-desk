import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = {
  CUSTOMER: 'customer',
  SUPPORT_SPECIALIST: 'support_specialist',
  KNOWLEDGE_MANAGER: 'knowledge_manager',
  SUPERVISOR: 'supervisor',
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Prevents automatic inclusion in queries
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: function () {
        // Customer accounts must belong to an organization
        return this.role === USER_ROLES.CUSTOMER;
      },
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  next();
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Return safe JSON without password or security tokens
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.verificationTokenExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model('User', userSchema);
