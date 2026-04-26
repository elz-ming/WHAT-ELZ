import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Edmund Lin Zhenming",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <section className="border-b border-zinc-200 px-6 py-24 sm:px-8 sm:py-32 dark:border-zinc-800">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Blog
        </h1>

        {posts.length === 0 ? (
          <p className="mt-12 text-zinc-700 dark:text-zinc-300">
            No posts yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-12 divide-y divide-zinc-200 dark:divide-zinc-800">
            {posts.map((post) => (
              <li key={post.slug} className="py-8">
                <article>
                  <p className="font-mono text-xs tracking-wide text-zinc-500 dark:text-zinc-400">
                    {post.date}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="transition-colors hover:text-[var(--accent-text)]"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  {post.summary && (
                    <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                      {post.summary}
                    </p>
                  )}
                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-xs tracking-wide text-zinc-500 dark:text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
