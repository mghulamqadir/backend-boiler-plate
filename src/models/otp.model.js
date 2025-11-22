import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        email: {
            type: String,
            trim: true,
            required: true,
        },
        newCode: {
            type: Number,
            required: true,
        },
        purpose: {
            type: String,
            required: true,
            default: "forgotPassword"
        },
        expireAt: {
            type: Date,
            default: () => Date.now() + 60 * 1000,
            index: { expires: 60 },
        }
    },
    {
        timestamps: true,
        expireAfterSeconds: 60,
    },
);
export default mongoose.model('Otp', otpSchema);
