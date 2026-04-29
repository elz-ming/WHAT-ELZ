import type { Metadata } from 'next';
import { ContactForm } from '@/components/sections/contact-form';
import { PageShell } from '@/components/shell/PageShell';

export const metadata: Metadata = { title: 'Contact — Edmund Lin Zhenming' };

export default function ContactPage() {
  return (
    <PageShell title="Contact" description="Open to AI Engineering roles, collabs, and consulting.">
      <p className="text-sm text-zinc-500 max-w-xl mb-2">
        The fastest way to reach me is through this form — or DM me on{' '}
        <a href="https://www.linkedin.com/in/elz-fintech/" target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-zinc-900 transition-colors">
          LinkedIn
        </a>.
      </p>
      <ContactForm />
    </PageShell>
  );
}
