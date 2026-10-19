import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    incidentCode: {
      type: String,
      required: true,
      unique: true, // e.g., 'INC-2041'
    },
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
    },
    affectedFeature: {
      type: String,
      required: true,
      index: true, // e.g., 'export', 'reporting', 'billing', 'auth'
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['investigating', 'identified', 'monitoring', 'resolved'],
      default: 'investigating',
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    workaround: {
      type: String,
      default: 'Our engineering team is actively investigating. Please retry in 30 minutes.',
    },
    impactedPlans: {
      type: [String],
      default: ['all'],
    },
  },
  {
    timestamps: true,
  }
);

export const Incident = mongoose.model('Incident', incidentSchema);
