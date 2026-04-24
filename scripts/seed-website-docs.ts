import {
  createSection,
  listSections,
  VALID_SLUGS,
  DocSlug,
} from "../lib/website-docs";

const SEED: Record<DocSlug, Array<{ heading: string; content: string }>> = {
  INSTRUCTIONS: [
    {
      heading: "Preamble",
      content:
        "# Website — Operating Protocol\n\n> First read on every Claude session. A product compounds.",
    },
  ],
  CONTEXT: [
    {
      heading: "Preamble",
      content:
        "Personal website. Placeholder — fill in vision, stack, and architecture.",
    },
  ],
  BUILD: [
    {
      heading: "Preamble",
      content:
        "Sprint tracker for the website. Specs (Chat) + close-outs (Code) in the same section.",
    },
    {
      heading: "Current Focus",
      content:
        "_Priority-ordered table of in-flight + queued sprints. Empty on day one._",
    },
    {
      heading: "Ops Checklist",
      content: "_Post-deploy items that belong to no single sprint._",
    },
    {
      heading: "Archive",
      content: "_Shipped sprints older than ~2 weeks move here._",
    },
  ],
  IDEAS: [
    {
      heading: "Preamble",
      content: "Low-friction inbox. Promote to BUILD when ready.",
    },
  ],
  MYSTORY: [
    {
      heading: "Preamble",
      content:
        "Raw notes about Edmund — background, values, experiences, inflection points. Draw from this to shape site copy and to compact into long-term memory over time.",
    },
  ],
};

async function seed() {
  for (const slug of VALID_SLUGS) {
    const existing = await listSections(slug);
    if (existing.sections.length > 0) {
      console.log(
        `${slug}: already has ${existing.sections.length} sections, skipping`,
      );
      continue;
    }
    for (const { heading, content } of SEED[slug]) {
      const res = await createSection(slug, heading, content);
      console.log(`${slug}: created ${heading} →`, res);
    }
  }
  console.log("Seed complete.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
