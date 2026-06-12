import { Router } from 'express';
import { createReel, getReels, toggleReelLike, getReelComments, createReelComment, toggleReelCommentLike } from '../controllers/reelController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getReels);
router.post('/', authenticateToken, createReel);
router.post('/:reelId/like', authenticateToken, toggleReelLike);
router.get('/:reelId/comments', authenticateToken, getReelComments);
router.post('/:reelId/comments', authenticateToken, createReelComment);
router.post('/comments/:commentId/like', authenticateToken, toggleReelCommentLike);

export default router;
