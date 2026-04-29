import type { Metadata } from 'next';
import { ContactForm } from '@/components/sections/contact-form';

export const metadata: Metadata = {
  title: 'Contact — Edmund Lin Zhenming',
};

export default function ContactPage() {
  return (
    <section className="px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Get in touch</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-zinc-900">
          Contact
        </h1>
        <p className="mt-4 max-w-xl text-zinc-700">
          Open to AI Engineering roles, collabs, and consulting.
        </p>
        <p className="mt-2 max-w-xl text-zinc-500">
          The fastest way to reach me is through this form — or DM me on{' '}
          <a
            href="https://www.linkedin.com/in/elz-fintech/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-zinc-900 transition-colors"
          >
            LinkedIn
          </a>
          .
        </p>
        <ContactForm />
      </div>
    </section>
  );
}
