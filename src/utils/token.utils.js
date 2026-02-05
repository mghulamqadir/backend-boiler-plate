import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    throw new Error('JWT_SECRET_KEY is not defined in the environment variables');
  }
  return secret;
}

export function createEmailVerificationToken(
  { userId, email },
  expiresIn = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '15m',
) {
  return jwt.sign(
    { userId, email, purpose: 'verify-email' },
    getJwtSecret(),
    { expiresIn },
  );
}

export function verifyEmailVerificationToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function createResetPasswordToken(
  { userId, email },
  expiresIn = process.env.RESET_PASSWORD_TOKEN_EXPIRY || '15m',
) {
  return jwt.sign(
    { userId, email, purpose: 'reset-password' },
    getJwtSecret(),
    { expiresIn },
  );
}

export function verifyResetPasswordToken(token) {
  return jwt.verify(token, getJwtSecret());
}
