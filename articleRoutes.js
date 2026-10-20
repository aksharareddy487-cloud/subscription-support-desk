import express from 'express';
import {
  getPublishedArticles,
  getArticleByIdOrSlug,
  getAllArticlesAdmin,
  getArticleAdminById,
  createDraft,
  updateArticle,
  publishArticle,
  deleteArticle
} from '../controllers/articleController.js';

const router = express.Router();

// Public routes (consumed by customer Help Center & LangChain RAG AI)
router.get('/articles', getPublishedArticles);
router.get('/articles/:id', getArticleByIdOrSlug);

// Admin routes (consumed by Knowledge Management dashboard & editor)
router.get('/admin/articles', getAllArticlesAdmin);
router.get('/admin/articles/:id', getArticleAdminById);
router.post('/admin/articles', createDraft);
router.put('/admin/articles/:id', updateArticle);
router.post('/admin/articles/:id/publish', publishArticle);
router.delete('/admin/articles/:id', deleteArticle);

export default router;
