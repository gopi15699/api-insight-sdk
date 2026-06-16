import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listPlans,
  getSubscription,
  subscribe,
  cancel,
} from '../controllers/billing.controller';

const router = Router();

// Public — pricing catalogue.
router.get('/plans', listPlans);

// Authenticated billing actions.
router.get('/subscription', authenticate, getSubscription);
router.post('/subscribe', authenticate, subscribe);
router.post('/cancel', authenticate, cancel);

export default router;
