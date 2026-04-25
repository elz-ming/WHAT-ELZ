import { Hero } from "@/components/sections/hero";
import { Arc } from "@/components/sections/arc";
import { Projects } from "@/components/sections/projects";
import { Wins } from "@/components/sections/wins";
import { Channels } from "@/components/sections/channels";
import { Contact } from "@/components/sections/contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <Arc />
      <Projects />
      <Wins />
      <Channels />
      <Contact />
    </main>
  );
}
