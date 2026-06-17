import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  register, login, verify, resend,
  googleSignIn, githubSignIn,
  phoneRequest, phoneVerify,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register',      register);
router.post('/login',         login);
router.post('/verify-email',  verify);
router.post('/resend-otp',    resend);
router.post('/google',        googleSignIn);
router.post('/github',        githubSignIn);

// Phone verification (logged-in user)
router.post('/phone/request', authenticate, phoneRequest);
router.post('/phone/verify',  authenticate, phoneVerify);

export default router;
