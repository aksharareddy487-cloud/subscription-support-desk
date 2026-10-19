import mongoose from 'mongoose';

const helpArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
    },
    version: {
      type: String,
      required: true,
      index: true, // e.g., 'v1.8', 'v2.4' for version-aware retrieval
    },
    category: {
      type: String,
      required: true,
      enum: ['account_limits', 'export_reports', 'integrations', 'troubleshooting', 'billing', 'general'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    citationsMetadata: {
      section: { type: String, default: 'General' },
      lastUpdatedBy: { type: String, default: 'Knowledge Team' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for lexical fallback search
helpArticleSchema.index({ title: 'text', content: 'text', category: 'text' });

export const HelpArticle = mongoose.model('HelpArticle', helpArticleSchema);
