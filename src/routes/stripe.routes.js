import express from 'express';
import { authenticateToken } from '../middlewares/token.middleware.js';
import * as stripeController from '../controllers/stripe.controllers.js';

const router = express.Router();

router.get('/payout', authenticateToken, stripeController.handleStripePayout);

router
  .route('/balance')
  .get(authenticateToken, stripeController.getBalance)
  .post(authenticateToken, stripeController.updateBalance);

router.post('/payment-webhook', stripeController.handleIntendWebhook);

export default router;
