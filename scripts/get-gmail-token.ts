// Run once to get a refresh token for Gmail OAuth. Paste into .env.local as GOOGLE_REFRESH_TOKEN.
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3100/api/auth/gmail/callback',
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       ['https://www.googleapis.com/auth/gmail.readonly'],
});

console.log('Open this URL and authorise:');
console.log(url);
console.log('\nThen visit: http://localhost:3100/api/auth/gmail/callback?code=<CODE>');
console.log('Copy the refresh_token from the JSON response.');
