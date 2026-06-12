import { Router } from 'express';
import { 
  getActiveLiveStreams, 
  getLiveHistory, 
  getLiveStream, 
  startLiveStream, 
  endLiveStream, 
  getLiveComments, 
  createLiveComment, 
  createLiveReaction 
} from '../controllers/liveController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getActiveLiveStreams);
router.get('/history', authenticateToken, getLiveHistory);
router.get('/:streamId', authenticateToken, getLiveStream);
router.post('/start', authenticateToken, startLiveStream);
router.post('/:streamId/end', authenticateToken, endLiveStream);
router.get('/:streamId/comments', authenticateToken, getLiveComments);
router.post('/:streamId/comments', authenticateToken, createLiveComment);
router.post('/:streamId/reactions', authenticateToken, createLiveReaction);

export default router;
