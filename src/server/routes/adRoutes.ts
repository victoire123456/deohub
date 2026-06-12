import { Router } from 'express';
import { 
  createAd, 
  getAds, 
  registerInteraction, 
  promotePost, 
  getPromotedPosts,
  updateAdStatus,
  deleteAd,
  updateAd,
  adminModerateAd
} from '../controllers/adController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getAds);
router.post('/', authenticateToken, createAd);
router.post('/:adId/interact', authenticateToken, registerInteraction);
router.get('/promoted', authenticateToken, getPromotedPosts);
router.post('/promote', authenticateToken, promotePost);

// Management routes
router.put('/:adId/status', authenticateToken, updateAdStatus);
router.delete('/:adId', authenticateToken, deleteAd);
router.put('/:adId', authenticateToken, updateAd);
router.post('/:adId/moderate', authenticateToken, adminModerateAd);

export default router;
