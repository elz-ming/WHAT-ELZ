import { projects, elzOs } from "@/content/projects";
import type { Project } from "@/content/types";

function StatusBadge({ status }: { status: Project["status"] }) {
  const label =
    status === "active" ? "active" : status === "shipped" ? "shipped" : "draft";
  const dot = status === "active" ? "●" : "✓";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase">
      <span style={{ color: "var(--accent-text)" }} aria-hidden="true">
        {dot}
      </span>
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
    </span>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const Wrapper = project.url ? "a" : "div";
  const wrapperProps = project.url
    ? {
        href: project.url,
        target: "_blank" as const,
        rel: "noopener noreferrer",
        "aria-label": `${project.name} — open project`,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="group block border border-zinc-200 p-8 transition-colors hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
    >
      <div className="flex items-center justify-between">
        <StatusBadge status={project.status} />
        {project.url && (
          <span
            aria-hidden="true"
            className="font-mono text-xs text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-[-2px] dark:text-zinc-600"
          >
            ↗
          </span>
        )}
      </div>

      <h3 className="mt-6 text-2xl font-semibold tracking-tight">
        {project.name}
      </h3>
      <p className="mt-1 font-mono text-xs tracking-wide text-zinc-500 uppercase">
        {project.tagline}
      </p>

      <p className="mt-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {project.description}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {project.metrics.map((m) => (
          <div key={m.label}>
            <dt className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
              {m.label}
            </dt>
            <dd className="mt-1 text-sm font-medium">{m.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-6 flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li
            key={tech}
            className="border border-zinc-200 px-2 py-1 font-mono text-[10px] tracking-wide text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
          >
            {tech}
          </li>
        ))}
      </ul>
    </Wrapper>
  );
}

export function Projects() {
  const visible = elzOs ? [...projects, elzOs] : projects;
  return (
    <section
      id="projects"
      className="border-b border-zinc-200 px-6 py-20 sm:px-8 sm:py-24 dark:border-zinc-800"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-baseline justify-between">
          <h2 className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Projects
          </h2>
          <p className="hidden font-mono text-[10px] tracking-widest text-zinc-400 uppercase sm:block">
            What is being built
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visible.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
