import { listResumes } from '@/lib/supabase-jobs';
import { ResumeBuilder } from '@/components/admin/apply/ResumeBuilder';

export default async function ResumePage() {
  const resumes = await listResumes();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Resume</h1>
        <p className="text-sm text-zinc-500 mt-1">
          AI drafts from your MYSTORY and profile. You edit. You save.
        </p>
      </div>
      <ResumeBuilder initialResumes={resumes} />
    </div>
  );
}
