import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { ingest, list, groups, stats, getOne } from '../controllers/log.controller';

const router = Router();

// SDK endpoint — authenticated via API key
router.post('/', apiKeyAuth, ingest);

// Dashboard endpoints — authenticated via JWT
router.get('/', authenticate, list);
router.get('/groups', authenticate, groups);
router.get('/stats', authenticate, stats);
router.get('/:id', authenticate, getOne);

export default router;
