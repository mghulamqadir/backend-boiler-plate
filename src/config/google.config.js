import { OAuth2Client } from 'google-auth-library';

let googleClient;

export function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not defined in the environment variables');
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  return googleClient;
}
