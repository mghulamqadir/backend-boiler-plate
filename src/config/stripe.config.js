import Stripe from 'stripe';

let _stripeInstance;

export function getStripe() {
    if (_stripeInstance) return _stripeInstance;

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        console.warn('[stripe.config] STRIPE_SECRET_KEY is not set; Stripe client will be disabled.');
        return null;
    }

    _stripeInstance = new Stripe(key, { apiVersion: '2023-08-16' });
    return _stripeInstance;
}

export function isStripeEnabled() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
}

export default getStripe;
