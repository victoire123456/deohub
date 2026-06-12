import { Router } from 'express';
import {
  generateAssistantResponse,
  generateCaption,
  generateReplySuggestion,
  moderateContent,
  analyzePostCreation,
  analyzeVideoFeed,
  getSmartFeed,
  semanticSearch,
  translateMessage,
  summarizeChat,
  getCreatorInsights,
  getPrivacyAudit,
  getUserProfileAnalysis
} from '../controllers/geminiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Assistant & Base APIs
router.post('/chat', authenticateToken, generateAssistantResponse);
router.post('/generate-caption', authenticateToken, generateCaption);
router.post('/generate-reply', authenticateToken, generateReplySuggestion);
router.post('/moderate', authenticateToken, moderateContent);

// Full-app modules
router.post('/analyze-post', authenticateToken, analyzePostCreation);
router.post('/analyze-video', authenticateToken, analyzeVideoFeed);
router.get('/smart-feed', authenticateToken, getSmartFeed);
router.get('/semantic-search', authenticateToken, semanticSearch);
router.post('/translate', authenticateToken, translateMessage);
router.post('/summarize-chat', authenticateToken, summarizeChat);
router.get('/creator-insights', authenticateToken, getCreatorInsights);
router.get('/privacy-audit', authenticateToken, getPrivacyAudit);
router.get('/profile-analysis', authenticateToken, getUserProfileAnalysis);

export default router;
