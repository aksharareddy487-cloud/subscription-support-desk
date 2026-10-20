import mongoose from 'mongoose';

const VersionHistorySchema = new mongoose.Schema({
  version: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  changeSummary: { type: String, default: 'Updated content' }
});

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  topic: { type: String, required: true },
  applicableVersions: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  currentVersion: { type: Number, default: 1 },
  versionHistory: [VersionHistorySchema]
}, { timestamps: true });

export const Article = mongoose.model('Article', ArticleSchema);
export default Article;
