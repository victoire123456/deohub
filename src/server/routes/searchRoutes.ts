import { Router } from 'express';
import { searchAll } from '../controllers/searchController';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticateToken, searchAll);

export default router;
