import { Hero } from "@/components/sections/hero";
import { Arc } from "@/components/sections/arc";
import { Projects } from "@/components/sections/projects";
import { Wins } from "@/components/sections/wins";
import { Channels } from "@/components/sections/channels";
import { Contact } from "@/components/sections/contact";
import { listHackathons } from "@/lib/hackathons";
import { listCareer } from "@/lib/career";
import { listProjects } from "@/lib/projects";
import { listChannels } from "@/lib/channels";

export default async function Home() {
  const [hackathons, career, projects, channels] = await Promise.all([
    listHackathons(true),
    listCareer(true),
    listProjects(true),
    listChannels(true),
  ]);

  return (
    <main>
      <Hero />
      <Arc entries={career} />
      <Projects projects={projects} />
      <Wins hackathons={hackathons} />
      <Channels channels={channels} />
      <Contact />
    </main>
  );
}
