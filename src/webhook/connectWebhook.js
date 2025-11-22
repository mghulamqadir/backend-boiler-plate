import User from '../models/user.model.js';

const VerifiedStatus = ['new']

export const connectWebhookFunction = async (req) => {
  let event = req.stripData

  // Ensure the event has a valid type
  if (!event || !event.type) {
    console.error(' Invalid event received:', event);
    throw new Error('Invalid Stripe webhook event');
  }

  console.log('Event data:', event)

  // Handle Stripe Connect Webhook Events
  switch (event.type) {
    case 'account.application.authorized': {
      const stripeAccountId = event.account; // Use event.account
      const isVerified = event.data?.object?.details_submitted;
      console.log(
        `Event: account.application.authorized for Stripe Account ${stripeAccountId}. Status verified: ${isVerified}`,
      );
      const user = await User.findOneAndUpdate(
        { stripeAccountId },
        { isStripeVerified: isVerified },
        { new: true },
      );
      break;
    }
    // Account Updated: Handle verification updates.
    case 'account.updated': {
      const [_event] = event.data.object.external_accounts.data;
      const stripeAccountId = _event.account;

      const isVerified = VerifiedStatus.includes(_event.status);
      console.log(
        `Event: account.updated for Stripe Account ${stripeAccountId}. External account status verified: ${isVerified}`,
      );
      // Find and update the user in the database
      await User.findOneAndUpdate(
        { stripeAccountId },
        { isStripeVerified: isVerified },
        { new: true },
      );
      break;
    }

    // External Account Created: Handle when a bank/card is added.
    case 'account.external_account.created': {
      const externalAccount = event.data.object;

      const stripeAccountId = externalAccount.account;
      const isVerified = VerifiedStatus.includes(externalAccount.status);
      console.log(
        `Event: account.external_account.created for Stripe Account ${stripeAccountId}. Status verified: ${isVerified}`,
      );
      // Find and update the user in the database
      await User.findOneAndUpdate(
        { stripeAccountId },
        { isStripeVerified: isVerified },
        { new: true },
      );
      break;
    }

    // External Account Updated: Handle when bank details change.

    case 'account.external_account.updated': {
      const externalAccount = event.data.object;

      const stripeAccountId = externalAccount.account;
      const isVerified = VerifiedStatus.includes(externalAccount.status);
      console.log(
        `Event: account.external_account.updated for Stripe Account ${stripeAccountId}. Status verified: ${isVerified}`,
      );
      // Find and update the user in the database
      const user = await User.findOneAndUpdate(
        { stripeAccountId },
        { isStripeVerified: isVerified },
        { new: true },
      );
      break;
    }
    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  return { success: true };
};
