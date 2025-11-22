import { getStripe } from '../config/stripe.config.js';
import { ApiError } from './response.handler.js';

export async function stripeCreateCustomer(params) {
  const { email, name } = params;
  const stripe = getStripe();
  if (!stripe) throw ApiError(503, 'Stripe is not configured');
  const customer = await stripe.customers.create({ email, name });

  if (!customer) {
    throw ApiError(400, 'Failed to create customer', [
      'Failed to create customer in Stripe',
    ]);
  }

  return customer.id;
}

// Attach a payment method to a Stripe customer
export const attachPaymentMethodToCustomer = async (
  paymentMethodId,
  customerId,
) => {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  if (!paymentMethod) {
    throw new Error('Failed to attach payment method to customer');
  }

  return paymentMethod;
};

// List all payment methods for a customer
export const listPaymentMethodsForCustomer = async (customerId) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    // Step 1: Get the customer to check the default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId =
      customer.invoice_settings?.default_payment_method || null;

    // Step 2: List all card payment methods
    const paymentMethods = await stripe.customers.listPaymentMethods(
      customerId,
      {
        type: 'card',
      },
    );

    // Step 3: Add isDefault flag
    const enhancedPaymentMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return enhancedPaymentMethods;
  } catch (error) {
    throw new Error(`Error listing payment methods: ${error.message}`);
  }
};

// Detach a payment method from a Stripe customer
export const detachPaymentMethod = async (paymentMethodId) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    await stripe.paymentMethods.detach(paymentMethodId);
    return true;
  } catch (error) {
    throw new Error(`Error detaching payment method: ${error.message}`);
  }
};

export async function stripeCreateCharge(params) {
  const { amount, currency, source, description } = params;
  const stripe = getStripe();
  if (!stripe) throw ApiError(503, 'Stripe is not configured');
  const charge = await stripe.charges.create({
    amount,
    currency,
    source,
    description,
  });

  if (!charge) {
    throw ApiError(400, 'Failed to create charge', [
      'Failed to create charge in Stripe',
    ]);
  }

  return charge;
}

export const createExpressAccount = async (email) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return {
      accountId: account.id,
    };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const createAccountURL = async (accountID) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    const accountLink = await stripe.accountLinks.create({
      account: accountID,
      refresh_url: process.env.FRONTEND_URL,
      return_url: process.env.FRONTEND_URL,
      type: 'account_onboarding',
    });

    return {
      message: 'URL created',
      accountLink: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const loginStripeCustomer = async (accountID) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw ApiError(503, 'Stripe is not configured');
    const customer = await stripe.accounts.createLoginLink(accountID);
    return customer;
  } catch (error) {
    throw ApiError(400, error.message, [error.message])
  }
};
