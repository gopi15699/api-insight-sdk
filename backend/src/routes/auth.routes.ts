import { Router } from 'express';
import { register, login, googleSignIn } from '../controllers/auth.controller';

const router = Router();

router.post('/register',      register);
router.post('/login',         login);
router.post('/google',        googleSignIn);

export default router;
