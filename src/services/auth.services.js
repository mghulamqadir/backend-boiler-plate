import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { ApiError } from '../utils/response.handler.js';
import { generateJwtToken } from '../utils/jwt.token.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/brevo.utils.js';
import { stripeCreateCustomer } from '../utils/stripe.utils.js';
import { getGoogleClient } from '../config/google.config.js';
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  createResetPasswordToken,
  verifyResetPasswordToken,
} from '../utils/token.utils.js';

export async function signup({ name, email, password, confirmPassword }, file) {
  if (password !== confirmPassword) {
    throw ApiError(400, 'Passwords do not match', []);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError(400, 'Email already in use', [
      'Please use a different email or log in.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const stripeCustomerId = await stripeCreateCustomer({
    name,
    email,
  });

  const profilePictureUrl = file?.location || null;

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    provider: 'email',
    isVerified: false,
    profilePicture: profilePictureUrl,
    stripeCustomerId,
  });

  const savedUser = await newUser.save();
  const verificationToken = createEmailVerificationToken({
    userId: savedUser._id,
    email: savedUser.email,
  });
  await sendVerificationEmail(savedUser, verificationToken);

  const userData = savedUser.toObject();
  delete userData.password;

  return {
    message: 'Signup successful! Verification email has been sent.',
    user: userData
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError(404, 'Invalid email or password', [
      'No user exists with this email address.',
    ]);
  }

  const isMatch = bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw ApiError(400, 'Invalid email or password', ['Incorrect password.']);
  }

  if (!user.stripeCustomerId) {
    const stripeCustomerId = await stripeCreateCustomer({
      name: user.name,
      email: user.email,
    });
    user.stripeCustomerId = stripeCustomerId;
  }

  user.loginAttempts += 1;
  user.lastLoginAttempt = new Date();
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  const response = { user: userData };
  if (user.isVerified) {
    const token = generateJwtToken({ userId: user._id });
    response.token = token;
    response.message = 'Login successful';
  } else {
    response.message = 'Please verify your account';
    response.token = null;
    response.user = null;
    response.success = false;
  }
  return response;
}

export async function googleAuth({ credential, idToken }) {
  let payload;

  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential || idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError(401, 'Invalid Google credential', [
      'The Google credential is invalid or has expired.',
    ]);
  }

  if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
    throw ApiError(401, 'Google account could not be verified', [
      'A verified Google email address is required.',
    ]);
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email }],
  });

  if (user?.googleId && user.googleId !== payload.sub) {
    throw ApiError(409, 'Google account conflict', [
      'This email is already linked to another Google account.',
    ]);
  }

  if (!user) {
    const stripeCustomerId = await stripeCreateCustomer({
      name: payload.name || email.split('@')[0],
      email,
    });

    user = new User({
      name: payload.name || email.split('@')[0],
      email,
      provider: 'google',
      googleId: payload.sub,
      profilePicture: payload.picture || null,
      isVerified: true,
      status: 'active',
      stripeCustomerId,
    });
  } else {
    user.googleId = payload.sub;
    user.isVerified = true;
    user.status = 'active';

    if (!user.profilePicture && payload.picture) {
      user.profilePicture = payload.picture;
    }

    if (!user.stripeCustomerId) {
      user.stripeCustomerId = await stripeCreateCustomer({
        name: user.name,
        email: user.email,
      });
    }
  }

  user.loginAttempts += 1;
  user.lastLoginAttempt = new Date();
  await user.save();

  const userData = user.toObject();
  delete userData.password;

  return {
    token: generateJwtToken({ userId: user._id }),
    user: userData,
    message: 'Google authentication successful',
  };
}

export async function forgotPassword(email, redirectUrl) {

  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.',
    );
  }
  const resetToken = createResetPasswordToken({
    userId: user._id,
    email: user.email,
  });

  await sendPasswordResetEmail(user, resetToken, redirectUrl);

  return { message: 'Password reset Link sent successfully.' };
}

export async function resetPassword(token, newPassword) {
  if (!token) {
    throw ApiError(400, 'Reset token is required', [
      'Please request a new password reset link.',
    ]);
  }

  let payload;
  try {
    payload = verifyResetPasswordToken(token);
  } catch {
    throw ApiError(400, 'Invalid or expired reset token', [
      'Please request a new password reset link.',
    ]);
  }

  if (!payload?.userId || payload?.purpose !== 'reset-password') {
    throw ApiError(400, 'Invalid reset token', [
      'Please request a new password reset link.',
    ]);
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw ApiError(404, 'User not found');
  }

  if (payload.email && payload.email !== user.email) {
    throw ApiError(400, 'Invalid reset token', [
      'Please request a new password reset link.',
    ]);
  }

  const isSamePassword = bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw ApiError(400, 'New password cannot be the same as the old password', [
      'Please choose a different password.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(user._id, { password: hashedPassword }, { new: true });

  return { message: 'Password reset successfully.' };
}

export async function verifyEmail(token) {
  if (!token) {
    throw ApiError(400, 'Verification token is required', [
      'Please request a new verification email.',
    ]);
  }

  let payload;
  try {
    payload = verifyEmailVerificationToken(token);
  } catch {
    throw ApiError(400, 'Invalid or expired verification token', [
      'Please request a new verification email.',
    ]);
  }

  if (!payload?.userId || payload?.purpose !== 'verify-email') {
    throw ApiError(400, 'Invalid verification token', [
      'Please request a new verification email.',
    ]);
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw ApiError(404, 'User not found');
  }

  if (payload.email && payload.email !== user.email) {
    throw ApiError(400, 'Invalid verification token', [
      'Please request a new verification email.',
    ]);
  }

  if (!user.isVerified) {
    await User.findByIdAndUpdate(
      user._id,
      { isVerified: true, status: 'active' },
      { new: true },
    );
  }
}

export async function resendVerificationEmail(email, purpose) {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.',
    );
  }

  if (purpose === 'signup' && user.isVerified) {
    throw ApiError(400, 'Email already verified', [
      'This email address is already verified.',
    ]);
  }

  if (purpose === 'signup') {
    const verificationToken = createEmailVerificationToken({
      userId: user._id,
      email: user.email,
    });
    await sendVerificationEmail(user, verificationToken);
  }

  if (purpose === 'forgotPassword') {
    const resetToken = createResetPasswordToken({
      userId: user._id,
      email: user.email,
    });
    await sendPasswordResetEmail(user, resetToken);
  }

  return { message: 'Verification email sent successfully.' };
}
