import { Router } from 'express';
import { getProfile, updateProfile, updateE2EKey, toggleFollow, getUserPosts, verifyUser } from '../controllers/userController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Handle missing username gracefully to prevent the HTML fallback
router.get('/', (req, res) => {
  res.status(400).json({ error: 'Username is required' });
});

// optionalAuthenticateToken should be a middleware that sets req.user if token is valid, but doesn't block if not
router.get('/:username', optionalAuthenticateToken, getProfile);
router.put('/update', authenticateToken, updateProfile);
router.put('/update-e2ee-key', authenticateToken, updateE2EKey);
router.post('/:userId/follow', authenticateToken, toggleFollow);
router.put('/:userId/verify', authenticateToken, verifyUser);
router.get('/:userId/posts', getUserPosts);

export default router;
