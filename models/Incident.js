import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    incidentCode: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    feature: {
      type: String,
      required: true,
      enum: [
        'report_export',
        'report-export',
        'billing',
        'api_gateway',
        'auth_service',
        'dashboard',
        'payments',
        'login',
      ],
      default: 'report_export',
    },
    severity: {
      type: String,
      enum: ['minor', 'medium', 'major', 'high', 'critical'],
      default: 'minor',
    },
    status: {
      type: String,
      enum: ['investigating', 'identified', 'monitoring', 'resolved'],
      default: 'investigating',
    },
    affectedVersions: {
      type: [String],
      default: ['v2.4'],
    },
    publicSummary: {
      type: String,
      required: true, // Sanitized public message safe for customers
    },
    description: {
      type: String,
      default: '',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    internalDetails: {
      type: String,
      default: '', // Private engineering notes
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Incident = mongoose.model('Incident', incidentSchema);
