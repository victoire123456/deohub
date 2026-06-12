import { Router } from 'express';
import { createPost, getPosts, toggleLike, getComments, createComment, deletePost } from '../controllers/postsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createPost);
router.get('/', authenticateToken, getPosts);
router.post('/:postId/like', authenticateToken, toggleLike);
router.get('/:postId/comments', authenticateToken, getComments);
router.post('/:postId/comments', authenticateToken, createComment);
router.delete('/:postId', authenticateToken, deletePost);

export default router;
