// update your webhook as your schema

export const stripePaymentWebhook = async (req) => {
  const event = req.body;
  const paymentIntent = event.data.object;
  switch (event.type) {
    case 'payment_intent.succeeded':
      //you business logic is here
      // Then define and call a method to handle the successful payment intent.
      break;
    case 'payment_intent.payment_failed':
      //you business logic is here
      break;
    case 'payment_intent.canceled':
      //you business logic is here
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
};
