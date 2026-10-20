import mongoose from 'mongoose';
import Article from '../models/Article.js';

const generateSlug = (title) => {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${baseSlug}-${Date.now().toString().slice(-4)}`;
};

// GET /api/articles
// Public endpoint: Only published articles, supports ?topic=, ?productVersion=, ?search=
export const getPublishedArticles = async (req, res) => {
  try {
    const { topic, productVersion, search } = req.query;
    const query = { status: 'published' };

    if (topic) {
      query.topic = { $regex: new RegExp(`^${topic.trim()}$`, 'i') };
    }

    if (productVersion) {
      query.applicableVersions = { $in: [productVersion.trim()] };
    }

    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { topic: searchRegex }
      ];
    }

    const articles = await Article.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles/:id
// Public endpoint: Fetch single published article by ID or slug (supports ?version=)
export const getArticleByIdOrSlug = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId 
      ? { _id: id, status: 'published' } 
      : { slug: id, status: 'published' };

    const article = await Article.findOne(filter);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Published article not found' });
    }

    if (version) {
      const requestedVer = parseInt(version, 10);
      if (requestedVer < article.currentVersion) {
        const snapshot = (article.versionHistory || []).find((h) => h.version === requestedVer);
        if (snapshot) {
          return res.status(200).json({
            success: true,
            versionRequested: requestedVer,
            isHistoricalSnapshot: true,
            data: {
              ...article.toObject(),
              title: snapshot.title,
              content: snapshot.content,
              currentVersion: snapshot.version,
              publishedAt: snapshot.publishedAt,
              changeSummary: snapshot.changeSummary
            }
          });
        }
      }
    }

    res.status(200).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/articles
// Admin dashboard: Fetch all articles across all statuses
export const getAllArticlesAdmin = async (req, res) => {
  try {
    const articles = await Article.find().sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/articles/:id
// Admin editor: Fetch single article by ID or slug (any status, supports ?version=)
export const getArticleAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;
    const filter = isObjectId ? { _id: id } : { slug: id };

    const article = await Article.findOne(filter);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (version) {
      const requestedVer = parseInt(version, 10);
      if (requestedVer < article.currentVersion) {
        const snapshot = (article.versionHistory || []).find((h) => h.version === requestedVer);
        if (snapshot) {
          return res.status(200).json({
            success: true,
            versionRequested: requestedVer,
            isHistoricalSnapshot: true,
            data: {
              ...article.toObject(),
              title: snapshot.title,
              content: snapshot.content,
              currentVersion: snapshot.version,
              publishedAt: snapshot.publishedAt,
              changeSummary: snapshot.changeSummary
            }
          });
        }
      }
    }

    res.status(200).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/articles
// Create a new article draft
export const createDraft = async (req, res) => {
  try {
    const { title, content, topic, applicableVersions, status } = req.body;
    if (!title || !content || !topic) {
      return res.status(400).json({ success: false, message: 'Title, content, and topic are required' });
    }

    const slug = req.body.slug ? req.body.slug.trim() : generateSlug(title);

    let parsedVersions = applicableVersions;
    if (typeof applicableVersions === 'string') {
      parsedVersions = applicableVersions.split(',').map(v => v.trim()).filter(Boolean);
    }

    const newArticle = await Article.create({
      title: title.trim(),
      slug,
      content,
      topic: topic.trim(),
      applicableVersions: parsedVersions || [],
      status: status || 'draft',
      currentVersion: 1,
      versionHistory: []
    });

    res.status(201).json({ success: true, data: newArticle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/articles/:id
// Update an existing draft or article
export const updateArticle = async (req, res) => {
  try {
    const { title, content, topic, applicableVersions, status, slug } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (title !== undefined) article.title = title.trim();
    if (slug !== undefined) article.slug = slug.trim();
    if (content !== undefined) article.content = content;
    if (topic !== undefined) article.topic = topic.trim();
    if (status !== undefined) article.status = status;

    if (applicableVersions !== undefined) {
      let parsedVersions = applicableVersions;
      if (typeof applicableVersions === 'string') {
        parsedVersions = applicableVersions.split(',').map(v => v.trim()).filter(Boolean);
      }
      article.applicableVersions = parsedVersions;
    }

    await article.save();
    res.status(200).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/articles/:id/publish
// Snapshot current content into versionHistory, increment currentVersion, and publish
export const publishArticle = async (req, res) => {
  try {
    const { changeSummary, title, content, topic, applicableVersions } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    if (title !== undefined) article.title = title.trim();
    if (content !== undefined) article.content = content;
    if (topic !== undefined) article.topic = topic.trim();
    if (applicableVersions !== undefined) {
      let parsedVersions = applicableVersions;
      if (typeof applicableVersions === 'string') {
        parsedVersions = applicableVersions.split(',').map(v => v.trim()).filter(Boolean);
      }
      article.applicableVersions = parsedVersions;
    }

    const snapshotVersion = article.currentVersion;
    article.versionHistory.push({
      version: snapshotVersion,
      title: article.title,
      content: article.content,
      publishedAt: new Date(),
      changeSummary: changeSummary ? changeSummary.trim() : `Published version v${snapshotVersion}.0`
    });

    article.currentVersion = article.currentVersion + 1;
    article.status = 'published';

    await article.save();
    res.status(200).json({
      success: true,
      message: `Article published as v${snapshotVersion}.0 successfully`,
      data: article
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/articles/:id
// Delete an article
export const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    res.status(200).json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
