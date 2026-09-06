import type { DiagramType } from "@/lib/diagram/types";
import { MAX_DIAGRAM_NODES } from "@/lib/diagram/types";
import { parseDiagramJson, validateDiagramData } from "@/lib/diagram/validate";

const GEMINI_ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_MAX_ATTEMPTS = 3;

function getGeminiApiKey() {
  for (const name of GEMINI_ENV_KEYS) {
    const value = process.env[name];
    if (value && value.trim().length > 0) {
      return value.trim().replace(/^["']|["']$/g, "");
    }
  }

  throw new Error("Gemini is not configured on the server.");
}

function typeInstructions(diagramType: DiagramType) {
  switch (diagramType) {
    case "flowchart":
      return `Create a flowchart.
Use node types: start, end, process, decision, io.
Include a start node and at least one end node.
Use decision nodes for branches, with edge labels such as "Yes" and "No".
Prefer a clear top-to-bottom flow.`;
    case "mindmap":
      return `Create a mind map.
Use exactly one central node with type "topic".
Major ideas should use type "branch" and connect to the topic.
Secondary ideas should connect to their parent branch and may include parentId.
Use a radial hierarchy. Do not create a linear flowchart.`;
    case "architecture":
      return `Create a software architecture diagram.
Use node types such as client, frontend, backend, api, service, auth, database, cache, queue, external.
Show directional connections between components.
Use groups when several nodes belong to the same layer or bounded context.`;
    default:
      return `Create the most appropriate concept diagram for the request.
Choose node types and relationships that match the user's description.
Keep the structure readable and well spaced.`;
  }
}

function buildPrompt(diagramType: DiagramType, prompt: string) {
  return `You generate structured diagrams for an infinite whiteboard.

Return JSON only. Do not return markdown, images, HTML, Mermaid, or Excalidraw internals.

Schema:
{
  "diagramType": "${diagramType}",
  "layout": "top-to-bottom" | "left-to-right" | "radial",
  "nodes": [
    { "id": "n1", "label": "Short label", "type": "process", "parentId": "optional" }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "optional" }
  ],
  "groups": [
    { "id": "g1", "label": "Backend", "children": ["n2", "n3"] }
  ]
}

Allowed node types:
start, end, process, decision, io, topic, branch, client, frontend, backend, api, service, database, auth, cache, queue, external, generic.

Rules:
- diagramType MUST be "${diagramType}".
- Use 4 to ${MAX_DIAGRAM_NODES} nodes.
- Every edge from/to must reference an existing node id.
- Labels must be short and readable (max 40 characters).
- Do not overlap conceptually redundant nodes.
- ${typeInstructions(diagramType)}

User request:
${prompt}`;
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const content = (candidates[0] as { content?: { parts?: unknown } }).content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : ""
    )
    .join("")
    .trim();
}

function geminiErrorMessage(payload: unknown, httpStatus: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: unknown; status?: unknown } }).error;
    const status = typeof error?.status === "string" ? error.status : "";
    const message = typeof error?.message === "string" ? error.message : "";

    if (httpStatus === 404 || status === "NOT_FOUND") {
      return "The configured Gemini model is no longer available.";
    }

    if (httpStatus === 401 || httpStatus === 403 || status === "UNAUTHENTICATED" || status === "PERMISSION_DENIED") {
      return "Gemini rejected the API key. Check the existing server-side key configuration.";
    }

    if (httpStatus === 429 || status === "RESOURCE_EXHAUSTED") {
      return "Gemini is rate-limited right now. Please try again in a moment.";
    }

    if (httpStatus === 503 || status === "UNAVAILABLE") {
      return "Gemini is temporarily unavailable. Please try again.";
    }

    if (message && !/key|token|credential/i.test(message)) {
      return message.slice(0, 180);
    }
  }

  return "Could not generate the diagram. Please try again.";
}

async function requestGemini(model: string, prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  const payload: unknown = await response.json().catch(() => null);
  return { response, payload };
}

export async function generateDiagramFromGemini(
  diagramType: DiagramType,
  prompt: string
) {
  const apiKey = getGeminiApiKey();
  const contents = buildPrompt(diagramType, prompt);

  let lastError = "Could not generate the diagram. Please try again.";

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    let payload: unknown;

    try {
      ({ response, payload } = await requestGemini(GEMINI_MODEL, contents, apiKey));
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      lastError = timedOut
        ? "Gemini timed out. Please try again."
        : "Could not reach Gemini. Please try again.";
      console.error("AI diagram generation failed", {
        model: GEMINI_MODEL,
        attempt,
        timedOut,
      });
      if (attempt < GEMINI_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }
      throw new Error(lastError);
    }

    if (!response.ok) {
      lastError = geminiErrorMessage(payload, response.status);
      console.error("AI diagram generation failed", {
        model: GEMINI_MODEL,
        httpStatus: response.status,
        attempt,
      });

      const retryable = response.status === 429 || response.status === 503;
      if (retryable && attempt < GEMINI_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }

      throw new Error(lastError);
    }

    const text = extractGeminiText(payload);
    if (!text) {
      lastError = "The AI did not return a diagram.";
      continue;
    }

    const parsed = parseDiagramJson(text);
    return validateDiagramData(parsed, diagramType);
  }

  throw new Error(lastError);
}
