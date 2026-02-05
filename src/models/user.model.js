import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, required: true, unique: true },
    // if you plan to implement roles, you can use this field
    role: { type: String, required: true, enum: ['user', 'admin'], default: 'user' },
    password: {
      type: String, required: false,
    },
    profilePicture: { type: String, default: null },
    bio: {
      type: String, default: '',
    },
    location: {
      type: String, default: '',
    },
    isVerified: {
      type: Boolean, default: false,
    },
    status: {
      type: String, default: 'inactive', enum: ['active', 'inactive'],
    },
    description: {
      type: String,
    },
    stripeCustomerId: {
      type: String, default: null,
    },
    stripeAccountId: {
      type: String, default: null,
    },
    isStripeVerified: {
      type: Boolean, default: false,
    },
    firebaseUid: {
      type: String, default: null,
    },
    loginAttempts: {
      type: Number, default: 0,
    },
    lastLoginAttempt: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);
