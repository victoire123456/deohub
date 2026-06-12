import { Router } from 'express';
import { register, login, getMe, googleLogin, verifyCode, resendCode } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/verify', verifyCode);
router.post('/resend-code', resendCode);
router.get('/me', authenticateToken, getMe);

export default router;
