import { inngest }               from '../client';
import { supabaseAdmin }         from '@/lib/supabase-server';
import { listNewMessages }       from '@/lib/gmail';
import { classifyEmail }         from '@/lib/email-classifier';
import { matchEmailToApplication } from '@/lib/domain-matcher';

export const emailSync = inngest.createFunction(
  { id: 'email-sync', name: 'Email Sync', triggers: [{ cron: 'TZ=Asia/Singapore */30 * * * *' }] },
  async ({ step }) => {
    const { data: cfg } = await supabaseAdmin
      .from('system_config').select('value').eq('key', 'email_last_sync_at').single();
    const sinceMs = cfg?.value ? new Date(cfg.value as string).getTime() : Date.now() - 24 * 3600 * 1000;

    const messages = await step.run('fetch-gmail', () => listNewMessages(sinceMs));

    let linked = 0;

    for (const msg of messages) {
      const { count } = await supabaseAdmin
        .from('emails').select('*', { count: 'exact', head: true }).eq('message_id', msg.messageId);
      if ((count ?? 0) > 0) continue;

      const emailClass = classifyEmail(msg.subject, msg.bodyText);

      const { companyId, applicationId } = msg.direction === 'inbound'
        ? await step.run(`match-${msg.messageId}`, () => matchEmailToApplication(msg.from))
        : { companyId: null, applicationId: null };

      void companyId;

      const { data: acct } = await supabaseAdmin
        .from('email_accounts').select('id').eq('email', 'elz.work22@gmail.com').single();

      const { data: inserted } = await supabaseAdmin.from('emails').insert({
        account_id:     acct?.id ?? null,
        application_id: applicationId,
        message_id:     msg.messageId,
        thread_id:      msg.threadId,
        from_address:   msg.from,
        to_address:     msg.to,
        subject:        msg.subject,
        body_text:      msg.bodyText,
        direction:      msg.direction,
        is_flagged:     emailClass !== 'unknown',
        received_at:    msg.receivedAt,
      }).select('id').single();

      if (applicationId && inserted) {
        linked++;
        await supabaseAdmin.from('application_events').insert({
          application_id: applicationId,
          event_type:     'email_received',
          new_value:      emailClass,
          details:        { email_id: (inserted as { id: string }).id, subject: msg.subject, from: msg.from },
          source:         'email_listener',
        });

        const statusMap: Record<string, string> = {
          interview_invite: 'interviewing',
          rejection:        'rejected',
          confirmation:     'acknowledged',
        };
        const newStatus = statusMap[emailClass];
        if (newStatus) {
          await supabaseAdmin.from('applications')
            .update({ response_status: emailClass, last_response_at: msg.receivedAt, status: newStatus })
            .eq('id', applicationId);
        }

        await supabaseAdmin.from('notifications').insert({
          module:      'LISTEN',
          title:       `${emailClass.replace(/_/g, ' ')}: ${msg.from.split('<')[0].trim()}`,
          body:        msg.subject,
          priority:    emailClass === 'interview_invite' ? 'high' : 'normal',
          action_type: 'open_application',
          action_id:   applicationId,
        });
      }
    }

    await supabaseAdmin.from('system_config')
      .upsert({ key: 'email_last_sync_at', value: new Date().toISOString() });

    return { messagesProcessed: messages.length, linked };
  },
);
