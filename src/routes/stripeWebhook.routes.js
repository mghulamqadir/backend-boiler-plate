import express from 'express';
import { getStripe } from '../config/stripe.config.js';
import { handleConnectWebhook } from '../controllers/stripe.controllers.js';

const router = express.Router();

// THIN WEBHOOK
router.post(
    '/connect-webhook/thin',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
        try {
            const stripe = getStripe();
            if (!stripe) throw new Error('Stripe is not configured');
            const sig = req.headers['stripe-signature'];
            if (!sig) throw new Error('Stripe signature is required');

            req.stripData = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET_THIN
            );

            next();
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    },
    handleConnectWebhook
);

// SNAPSHOT WEBHOOK
router.post(
    '/connect-webhook/snapshot',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
        try {
            const stripe = getStripe();
            if (!stripe) throw new Error('Stripe is not configured');
            const sig = req.headers['stripe-signature'];
            if (!sig) throw new Error('Stripe signature is required');

            req.stripData = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET_SNAPSHOT
            );

            next();
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    },
    handleConnectWebhook
);

export default router;
