import { listProjects } from '@/lib/projects';
import { ProjectsPageClient } from './ProjectsPageClient';

export default async function ProjectsPage() {
  const projects = await listProjects(true);
  return <ProjectsPageClient projects={projects} />;
}
