import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listProjects, getProjectBySlug } from "@/lib/projects";
import { ContentRenderer } from "@/components/shell/ContentRenderer";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await listProjects(true);
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: `${project.name} — Edmund Lin`,
    description: project.tagline ?? undefined,
  };
}

const STATUS_LABEL: Record<string, string> = {
  active:   "Active",
  shipped:  "Shipped",
  archived: "Archived",
};

const STATUS_CLASSES: Record<string, string> = {
  active:   "bg-green-50 text-green-700",
  shipped:  "bg-zinc-100 text-zinc-600",
  archived: "bg-zinc-50 text-zinc-400",
};

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Project
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 text-lg text-zinc-600">{project.tagline}</p>
        <div className="mt-4 flex items-center gap-3">
          {project.status && (
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_CLASSES[project.status] ?? ''}`}
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          )}
          {project.external_url && (
            <a
              href={project.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-900"
            >
              Visit ↗
            </a>
          )}
        </div>
      </header>

      {project.description && (
        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-zinc-400">
            What it is
          </h2>
          <p className="text-base leading-relaxed text-zinc-700">
            {project.description}
          </p>
        </section>
      )}

      {project.metrics && project.metrics.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
            By the numbers
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {project.metrics.map((m) => (
              <div
                key={m.label}
                className="border border-zinc-200 px-4 py-4"
              >
                <dd className="text-xl font-semibold text-zinc-900">{m.value}</dd>
                <dt className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  {m.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {project.tech_stack && project.tech_stack.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
            Tech stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="rounded bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {project.content && (
        <section className="mb-10 border-t border-zinc-100 pt-10">
          <ContentRenderer content={project.content} />
        </section>
      )}

      <div className="border-t border-zinc-200 pt-8">
        <a
          href="/projects"
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-900"
        >
          ← All projects
        </a>
      </div>
    </main>
  );
}
