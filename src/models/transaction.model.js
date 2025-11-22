import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    totalAmount: { type: Number, required: true }, // Total cost of the transaction
    stripePaymentIntentId: { type: String, required: true }, // Stripe payment intent ID
    purchasedAt: { type: Date, default: Date.now },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'canceled'],
    },
  },
  { timestamps: true },
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
