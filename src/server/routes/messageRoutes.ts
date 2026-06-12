import { Router } from 'express';
import { 
  getMessages, 
  getConversations, 
  createMessageRoute, 
  editMessage, 
  deleteMessage, 
  toggleReaction,
  markMessagesAsSeen
} from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Conversations & list routing (MUST be before matching dynamic user/message ID!)
router.get('/conversations', authenticateToken, getConversations);

// Message-specific operations
router.get('/:userId', authenticateToken, getMessages);
router.post('/', authenticateToken, createMessageRoute);
router.put('/:messageId', authenticateToken, editMessage);
router.delete('/:messageId', authenticateToken, deleteMessage);
router.post('/:messageId/react', authenticateToken, toggleReaction);
router.put('/:userId/seen', authenticateToken, markMessagesAsSeen);

export default router;
