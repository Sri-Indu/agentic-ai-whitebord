export const DIAGRAM_TYPES = [
  "flowchart",
  "mindmap",
  "architecture",
  "diagram",
] as const;

export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export const LAYOUTS = [
  "top-to-bottom",
  "left-to-right",
  "radial",
] as const;

export type DiagramLayout = (typeof LAYOUTS)[number];

export const NODE_TYPES = [
  "start",
  "end",
  "process",
  "decision",
  "io",
  "topic",
  "branch",
  "client",
  "frontend",
  "backend",
  "api",
  "service",
  "database",
  "auth",
  "cache",
  "queue",
  "external",
  "generic",
] as const;

export type DiagramNodeType = (typeof NODE_TYPES)[number];

export type DiagramNode = {
  id: string;
  label: string;
  type: DiagramNodeType;
  description?: string;
  parentId?: string;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type DiagramGroup = {
  id: string;
  label: string;
  children: string[];
};

export type DiagramData = {
  diagramType: DiagramType;
  layout?: DiagramLayout;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
};

export const MAX_DIAGRAM_NODES = 28;
export const MAX_DIAGRAM_EDGES = 40;
export const MAX_PROMPT_LENGTH = 2000;
export const MIN_PROMPT_LENGTH = 8;
