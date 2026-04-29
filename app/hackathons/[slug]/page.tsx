import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getHackathonBySlug } from '@/lib/hackathons';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const h = await getHackathonBySlug(slug);
  if (!h) return {};
  return { title: `${h.name} — Edmund Lin Zhenming` };
}

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function youtubeEmbedUrl(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default async function HackathonDetailPage({ params }: Props) {
  const { slug } = await params;
  const h = await getHackathonBySlug(slug);
  if (!h || !h.published) notFound();

  const embedUrl = h.demo_url && isYouTube(h.demo_url) ? youtubeEmbedUrl(h.demo_url) : null;

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
          href="/hackathons"
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          ← Hackathons
        </Link>

        <div className="mt-8 space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            {new Date(h.date).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
            {h.location ? ` · ${h.location}` : ''}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {h.name}
          </h1>
          {h.project_name && (
            <p className="text-lg text-zinc-600 font-medium">{h.project_name}</p>
          )}
          {h.organizer && (
            <p className="text-zinc-500">{h.organizer}</p>
          )}
        </div>

        {/* Team */}
        {h.team.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Team</span>
            {h.team.map(member => (
              <span key={member} className="font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                {member}
              </span>
            ))}
          </div>
        )}

        {/* Awards */}
        {h.awards.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {h.awards.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber-700"
              >
                {a.title}{a.track ? ` · ${a.track}` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {h.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {h.tags.map(t => (
              <span key={t} className="font-mono text-xs text-zinc-400">#{t}</span>
            ))}
          </div>
        )}

        {/* Demo video */}
        {h.demo_url && (
          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Demo</p>
            {embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded border border-zinc-200">
                <iframe
                  src={embedUrl}
                  title="Demo video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <a
                href={h.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 transition-colors"
              >
                {h.demo_url} ↗
              </a>
            )}
          </div>
        )}

        {/* Writeup */}
        {h.writeup.trim() && (
          <div className="mt-12 prose prose-zinc prose-sm max-w-none">
            <ReactMarkdown>{h.writeup}</ReactMarkdown>
          </div>
        )}

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
