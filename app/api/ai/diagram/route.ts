import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { DIAGRAM_TYPES, MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH } from "@/lib/diagram/types";
import type { DiagramType } from "@/lib/diagram/types";
import { DiagramValidationError } from "@/lib/diagram/validate";
import { generateDiagramFromGemini } from "@/lib/gemini";

function isDiagramType(value: unknown): value is DiagramType {
  return typeof value === "string" && (DIAGRAM_TYPES as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized user" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { diagramType, prompt } = body as {
    diagramType?: unknown;
    prompt?: unknown;
  };

  if (!isDiagramType(diagramType)) {
    return NextResponse.json(
      { error: "Please choose a valid diagram type." },
      { status: 400 }
    );
  }

  if (typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Please enter a diagram description." },
      { status: 400 }
    );
  }

  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Please describe the diagram in at least ${MIN_PROMPT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Please keep the description under ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const diagram = await generateDiagramFromGemini(diagramType, trimmedPrompt);
    return NextResponse.json({ diagram });
  } catch (error) {
    if (error instanceof DiagramValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("AI diagram generation failed", {
      message: error instanceof Error ? error.message : "unknown",
    });

    const message =
      error instanceof Error ? error.message : "Could not generate the diagram. Please try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
