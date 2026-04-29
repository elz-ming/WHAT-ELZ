import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getCareerBySlug } from '@/lib/career';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entries = await getCareerBySlug(slug);
  if (!entries.length) return {};
  return { title: `${entries[0].company} — Edmund Lin Zhenming` };
}

function formatDateRange(start: string, end: string | null): string {
  const startDate = new Date(start).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  if (!end) return `${startDate} – Present`;
  const endDate = new Date(end).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  return `${startDate} – ${endDate}`;
}

export default async function CareerDetailPage({ params }: Props) {
  const { slug } = await params;
  const entries = await getCareerBySlug(slug);
  if (!entries.length) notFound();

  const company = entries[0].company;

  // Related blog posts
  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('slug, title, summary, published_at')
    .contains('tags', [slug])
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3);

  return (
    <section className="px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/career"
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          ← Career
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {company}
          </h1>
        </div>

        <div className="mt-10 space-y-10">
          {entries.map(entry => (
            <div key={entry.id} className="border border-zinc-200 rounded p-6 space-y-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  {formatDateRange(entry.start_date, entry.end_date)}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-900">{entry.role}</h2>
              </div>

              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map(t => (
                    <span key={t} className="font-mono text-[10px] text-zinc-400">#{t}</span>
                  ))}
                </div>
              )}

              {entry.description && entry.description.trim() && (
                <div className="prose prose-zinc prose-sm max-w-none">
                  <ReactMarkdown>{entry.description}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Related posts */}
        {posts && posts.length > 0 && (
          <div className="mt-16 border-t border-zinc-100 pt-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-4">Related Posts</p>
            <div className="space-y-4">
              {posts.map(post => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block border border-zinc-200 rounded p-4 hover:border-zinc-400 transition-colors space-y-1"
                >
                  <p className="font-medium text-zinc-900 leading-snug">{post.title}</p>
                  {post.summary && (
                    <p className="text-sm text-zinc-500 leading-relaxed">{post.summary}</p>
                  )}
                  {post.published_at && (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {new Date(post.published_at as string).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
