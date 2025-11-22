import User from '../models/user.model.js';
import * as stripeUtils from '../utils/stripe.utils.js';
import { getStripe } from '../config/stripe.config.js';
import { connectWebhookFunction } from '../webhook/connectWebhook.js';
import { stripePaymentWebhook } from '../webhook/stripeWebhook.js';
import { ApiError } from '../utils/response.handler.js';
import { sendPayoutEmail } from '../utils/brevo.utils.js';

export const handleStripeConnectAccount = async (userId) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new Error('Stripe customer not found for this user');
    }

    // If user already has a Stripe account, return login link
    if (user.stripeAccountId && user.isStripeVerified) {
      const loginLink = await stripeUtils.loginStripeCustomer(
        user.stripeAccountId,
      );
      return {
        accountId: user.stripeAccountId,
        accountLink: loginLink.url,
      };
    }

    // Create new Express Stripe account
    if (!user.stripeAccountId && !user.isStripeVerified) {
      const { accountId } = await stripeUtils.createExpressAccount(user.email);
      user.stripeAccountId = accountId;
      await user.save();
    }

    // Create onboarding account link
    const { accountLink } = await stripeUtils.createAccountURL(
      user.stripeAccountId,
    );

    return { accountId: user.stripeAccountId, accountLink };
  } catch (error) {
    console.error('Error handling Stripe Connect account:', error.message);
    throw ApiError(400, error.message);
  }
};

export const connectWebhookService = async (req) => {
  try {
    const response = await connectWebhookFunction(req);
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const createPaymentIntent = async (
  amountInCents,
  stripeCustomerId,
  paymentMethodId,
  metadata,
  isUpdate = false,
) => {
  try {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: false,
      metadata: {
        campaignId: metadata,
        isUpdate,
      },
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Error during the payment intent: ${error.message}`);
  }
};

export const intendWebhook = async (req) => {
  try {
    const response = await stripePaymentWebhook(req);
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const getBalance = async (userId) => {
  const today = new Date();
  const lastAvailableBalanceUntil = new Date(today);
  lastAvailableBalanceUntil.setDate(
    today.getDate() - process.env.LAST_AVAILABLE_BALANCE_UNITL || 1,
  );

  const data = await walletModel.aggregate([
    { $match: { userId, createdAt: { $lte: lastAvailableBalanceUntil } } },
    {
      $group: {
        _id: '$transactionType',
        total: { $sum: '$balance' },
      },
    },
  ]);

  const result = {
    credit: 0,
    debit: 0,
  };

  data.forEach((item) => {
    result[item._id] = item.total;
  });

  return result;
};

export const updateBalance = async (user, stripeAccountId) => {
  const today = new Date();
  const lastAvailableBalanceUntil = new Date(today);
  lastAvailableBalanceUntil.setDate(
    today.getDate() - process.env.LAST_AVAILABLE_BALANCE_UNITL || 1,
  );

  const availableBalance = await walletModel.aggregate([
    {
      $match: {
        userId: user._id,
        isWithdraw: false,
        transactionType: 'credit',
        createdAt: { $lte: lastAvailableBalanceUntil },
      },
    },
  ]);

  const balance = await getBalance(user?._id);

  const availableAmmount = balance.credit - balance.debit;

  if (availableAmmount === 0) {
    throw ApiError(400, 'You have no available balance to withdraw');
  }

  const stripe = getStripe();
  if (!stripe) throw ApiError(503, 'Stripe is not configured');

  const stripePayout = await stripe.payouts.create(
    {
      amount: Math.floor(availableAmmount * 100),
      currency: 'usd',
      method: 'standard',
    },
    { stripeAccount: stripeAccountId },
  );

  if (['canceled', 'expired', 'failed'].includes(stripePayout.status)) {
    throw ApiError(400, stripePayout.failure_message);
  }

  sendPayoutEmail(user?.email, user?.name, availableAmmount);

  const ids = availableBalance.map((item) => item._id);

  walletModel.updateMany(
    {
      _id: { $in: ids },
    },
    {
      $set: {
        isWithdraw: true,
      },
    },
    { multi: true },
  );

  walletModel.insertMany(
    availableBalance.map((item) => ({
      ...item,
      isWithdraw: true,
      payoutId: stripePayout.id,
      transactionType: 'debit',
    })),
  );

  return stripePayout;
};
