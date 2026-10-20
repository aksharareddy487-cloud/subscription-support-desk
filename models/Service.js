import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['operational', 'degraded', 'outage'],
      default: 'operational',
    },
    message: {
      type: String,
      default: 'Operational',
      trim: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Service = mongoose.model('Service', serviceSchema);
