export type ProjectStatus = "active" | "shipped" | "draft";

export interface ProjectMetric {
  label: string;
  value: string;
}

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  status: ProjectStatus;
  description: string;
  metrics: ProjectMetric[];
  stack: string[];
  url?: string;
}

export interface ArcStop {
  period: string;
  company: string;
  role: string;
  shipped: string;
}

export interface Channel {
  name: string;
  handle: string;
  url: string;
  purpose: string;
}

export interface Hackathon {
  date: string;
  event: string;
  placement: string;
  tier: 1 | 2;
  notes?: string;
}
