import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHackathon, upsertHackathon, deleteHackathon } from '@/lib/hackathons';
import { HackathonForm } from './_components/HackathonForm';

export const metadata: Metadata = { title: 'Edit Hackathon — whatelz.ai admin' };

type Props = { params: Promise<{ id: string }> };

async function save(id: string | null, fd: FormData) {
  'use server';
  const awardsRaw = fd.get('awards') as string;
  let awards = [];
  try { awards = JSON.parse(awardsRaw); } catch { awards = []; }

  const teamRaw = fd.get('team') as string;
  let team: string[] = [];
  try { team = JSON.parse(teamRaw); } catch { team = []; }

  const tagsRaw = (fd.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);

  await upsertHackathon(
    {
      name:          fd.get('name') as string,
      slug:          (fd.get('slug') as string) || undefined,
      organizer:     (fd.get('organizer') as string) || undefined,
      date:          fd.get('date') as string,
      location:      (fd.get('location') as string) || undefined,
      awards,
      demo_url:      (fd.get('demo_url') as string) || undefined,
      writeup:       fd.get('writeup') as string,
      tags:          tagsRaw,
      thumbnail_url: (fd.get('thumbnail_url') as string) || undefined,
      published:     fd.get('published') === 'true',
      team,
      tier:          (fd.get('tier') as 'coding' | 'non-coding') ?? 'coding',
      project_name:  (fd.get('project_name') as string) || undefined,
    },
    id ?? undefined,
  );
}

async function remove(id: string) {
  'use server';
  await deleteHackathon(id);
}

export default async function AdminHackathonEditPage({ params }: Props) {
  const { id } = await params;
  const isNew = id === 'new';
  const hackathon = isNew ? null : await getHackathon(id);
  if (!isNew && !hackathon) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border-b border-zinc-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Admin · Hackathons</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {isNew ? 'New Hackathon' : hackathon!.name}
        </h1>
      </div>
      <HackathonForm
        hackathon={hackathon}
        onSave={save.bind(null, isNew ? null : id)}
        onDelete={isNew ? null : remove.bind(null, id)}
      />
    </div>
  );
}
