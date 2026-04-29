import type { Metadata } from 'next';
import { listHackathons } from '@/lib/hackathons';
import { HackathonList } from './_components/HackathonList';
import { PageShell } from '@/components/shell/PageShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hackathons — Edmund Lin Zhenming',
};

export default async function HackathonsPage() {
  const hackathons = await listHackathons(true);

  return (
    <PageShell
      title="Hackathons"
      description="A record of hackathons I've competed in — the wins, the builds, and the teams."
      maxWidth="max-w-5xl"
    >
      {hackathons.length === 0 ? (
        <p className="text-zinc-400 font-mono text-sm">No hackathons published yet.</p>
      ) : (
        <HackathonList hackathons={hackathons} />
      )}
    </PageShell>
  );
}
