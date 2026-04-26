import { google } from 'googleapis';

function getGmailClient() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2 });
}

export interface GmailMessage {
  readonly messageId:  string;
  readonly threadId:   string;
  readonly from:       string;
  readonly to:         string;
  readonly subject:    string;
  readonly bodyText:   string;
  readonly receivedAt: string;
  readonly direction:  'inbound' | 'outbound';
}

function decodeBase64(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractText(payload: { body?: { data?: string | null } | null; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }> | null }): string {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data);
  }
  return '';
}

export async function listNewMessages(sinceEpochMs: number): Promise<GmailMessage[]> {
  const gmail  = getGmailClient();
  const sinceS = Math.floor(sinceEpochMs / 1000);
  const results: GmailMessage[] = [];

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q:      `after:${sinceS}`,
    maxResults: 100,
  });

  for (const m of listRes.data.messages ?? []) {
    const msg     = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
    const headers = msg.data.payload?.headers ?? [];
    const from    = getHeader(headers, 'From');
    const to      = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const date    = getHeader(headers, 'Date');
    const body    = extractText(msg.data.payload ?? {});
    const direction: 'inbound' | 'outbound' =
      to.includes('elz.work22@gmail.com') && !from.includes('elz.work22@gmail.com')
        ? 'inbound' : 'outbound';

    results.push({
      messageId:  m.id!,
      threadId:   m.threadId!,
      from, to, subject,
      bodyText:   body.slice(0, 4000),
      receivedAt: new Date(date).toISOString(),
      direction,
    });
  }

  return results;
}
