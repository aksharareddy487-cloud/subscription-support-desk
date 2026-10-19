import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'starter',
    },
    productVersion: {
      type: String,
      default: 'v2.4', // Current active product version for customer's org
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active',
    },
    entitlements: {
      maxSeats: { type: Number, default: 5 },
      canExportReports: { type: Boolean, default: true },
      prioritySupport: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', organizationSchema);
