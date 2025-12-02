import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { ApiError } from '../utils/response.handler.js';
import { generateJwtToken } from '../utils/jwt.token.js';
import Otp from '../models/otp.model.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/brevo.utils.js';
import { stripeCreateCustomer } from '../utils/stripe.utils.js';
import { generateSixDigitCode } from '../utils/constant.utils.js';
import crypto from 'crypto';

export async function onModuleInit() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'defaultAdminPassword';

    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create a new admin user
      const newAdmin = new User({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        isVerified: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newAdmin.save();
      console.log('Admin user created successfully.');
    }
  } catch (error) {
    console.error('Error during admin user creation:', error);
    throw error;
  }
}

export async function adminLogin({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError(404, 'Invalid email or password', [
      'No admin exists with this email address.',
    ]);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError(401, 'Invalid email or password', ['Incorrect password.']);
  }

  const token = generateJwtToken({ userId: user._id });
  return { token, email: user.email };
}

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
  const code = generateSixDigitCode();
  await Otp.create({
    userId: savedUser._id,
    email: savedUser.email,
    newCode: code,
    purpose: 'signup',
  });
  await sendVerificationEmail(savedUser, code);

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

  const isMatch = await bcrypt.compare(password, user.password);

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
    const existingOtp = await Otp.findOne({
      userId: user._id,
      purpose: 'signup',
    });
    if (existingOtp) {
      await Otp.deleteOne({ userId: user._id, purpose: 'signup' });
    }

    const code = generateSixDigitCode();
    await Otp.create({
      userId: userData._id,
      email: userData.email,
      newCode: code,
      purpose: 'signup',
    });
    // await sendVerificationEmail(userData, code);
  }
  return response;
}

export async function forgotPassword(email, redirectUrl) {

  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError(
      404,
      'This email address is not registered. Please check or sign up.',
    );
  }
  const existingOtp = await Otp.findOne({
    userId: user._id,
    purpose: 'forgotPassword',
  });
  if (existingOtp) {
    await Otp.deleteOne({ userId: user._id, purpose: 'forgotPassword' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await Otp.create({
    userId: user._id,
    email: user.email,
    newCode: hashedToken,
    purpose: 'forgotPassword',
  });

  await sendPasswordResetEmail(user, resetToken, redirectUrl);

  return { message: 'Password reset Link sent successfully.' };
}

export async function resetPassword(token, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const otp = await Otp.findOne({
    newCode: hashedToken,
    purpose: 'forgotPassword'
  });

  if (!otp) {
    throw ApiError(400, 'Invalid or expired reset token', [
      'Please request a new password reset link.',
    ]);
  }

  const user = await User.findById(otp.userId);
  if (!user) {
    throw ApiError(404, 'User not found');
  }

  const isSamePassword = bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw ApiError(400, 'New password cannot be the same as the old password', [
      'Please choose a different password.',
    ]);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(user._id, { password: hashedPassword }, { new: true });

  await otp.deleteOne();

  return { message: 'Password reset successfully.' };
}

export async function verifyEmail(code) {
  const otp = await Otp.findOne({ newCode: code, purpose: 'signup' });
  if (!otp) {
    throw ApiError(400, 'Invalid or expired verification code', [
      'Please request a new verification code.',
    ]);
  }
  const isExpired = otp.expireAt < new Date();
  if (isExpired) {
    throw ApiError(400, 'Verification code has expired', [
      'Please request a new verification code.',
    ]);
  }
  await User.findOneAndUpdate(
    { _id: otp.userId },
    { isVerified: true },
    { new: true },
  );
  await otp.deleteOne();
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

  const existingOtp = await Otp.findOne({
    userId: user._id,
    purpose,
  });
  if (existingOtp) {
    await Otp.deleteOne({ userId: user._id, purpose });
  }
  const code = generateSixDigitCode();
  await Otp.create({
    userId: user._id,
    email: user.email,
    newCode: code,
    purpose,
  });
  if (purpose === 'signup') {
    await sendVerificationEmail(user, code);
  }

  if (purpose === 'forgotPassword') {
    await sendPasswordResetEmail(user, code);
  }

  return { message: 'Verification email sent successfully.' };
}
