import { ApiError, errorResponse, successResponse } from '../utils/response.handler.js';
import * as stripeService from '../services/stripe.service.js';

export async function handleStripePayout(req, res) {
  try {
    const response = await stripeService.handleStripeConnectAccount(
      req.user._id,
    );
    return successResponse(res, 200, 'Account Saved Successfully', response);
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function handleConnectWebhook(req, res) {
  try {
    const response = await stripeService.connectWebhookService(req);
    return successResponse(
      res,
      200,
      'Connect webhook processed successfully',
      response,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function handleIntendWebhook(req, res) {
  try {
    const response = await stripeService.intendWebhook(req);
    return successResponse(
      res,
      200,
      'Intend webhook processed successfully',
      response,
    );
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function getBalance(req, res) {
  try {
    const userId = req.user._id;
    const balance = await stripeService.getBalance(userId);
    return successResponse(res, 200, 'Balance retrieved successfully', balance);
  } catch (error) {
    return errorResponse(res, error);
  }
}

export async function updateBalance(req, res) {
  try {
    const user = req.user;
    const stripeAccountId = req.user.stripeAccountId;
    const isStripeVerified = req.user.isStripeVerified;
    if (!isStripeVerified) {
      throw ApiError(400, 'Stripe account is not verified');
    }
    const balance = await stripeService.updateBalance(user, stripeAccountId);
    return successResponse(res, 200, 'Balance updated successfully', balance);
  } catch (error) {
    return errorResponse(res, error);
  }
}
