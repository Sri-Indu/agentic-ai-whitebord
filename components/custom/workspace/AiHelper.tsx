"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  GitBranch,
  Network,
  Share2,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  DIAGRAM_TYPES,
  MIN_PROMPT_LENGTH,
  type DiagramType,
} from "@/lib/diagram/types";
import { insertDiagramIntoWhiteboard } from "@/lib/diagram/toExcalidrawElements";
import type { DiagramData } from "@/lib/diagram/types";

type Props = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
};

const MODE_META: Record<
  DiagramType,
  { label: string; description: string; example: string; icon: React.ElementType }
> = {
  flowchart: {
    label: "Flowchart",
    description: "Steps, decisions, and outcomes",
    example:
      "Create a user login flow with start, enter credentials, validate credentials, dashboard if valid, and an error message if invalid.",
    icon: Workflow,
  },
  mindmap: {
    label: "Mind Map",
    description: "Central topic with branches",
    example: "Create a mind map for learning full-stack web development.",
    icon: Share2,
  },
  architecture: {
    label: "Architecture",
    description: "Systems, services, and data",
    example:
      "Create an e-commerce system architecture with users, React frontend, API server, authentication service, PostgreSQL, Redis cache, and a payment service.",
    icon: Network,
  },
  diagram: {
    label: "Diagram",
    description: "Flexible nodes and relationships",
    example:
      "Create a diagram showing how a user request travels from frontend to backend to database.",
    icon: GitBranch,
  },
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.response?.status === 401) {
      return "Please sign in to generate diagrams.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not generate the diagram. Please try again.";
}

function AiHelper({ excalidrawAPI }: Props) {
  const [open, setOpen] = useState(false);
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = MODE_META[diagramType];
  const canGenerate =
    !loading &&
    prompt.trim().length >= MIN_PROMPT_LENGTH &&
    Boolean(excalidrawAPI);

  const resetForm = () => {
    setPrompt("");
    setError(null);
    setDiagramType("flowchart");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!excalidrawAPI) {
      setError("The whiteboard is still loading. Please try again in a moment.");
      return;
    }

    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      setError(`Please describe the diagram in at least ${MIN_PROMPT_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await axios.post<{ diagram: DiagramData }>("/api/ai/diagram", {
        diagramType,
        prompt: prompt.trim(),
      });

      await insertDiagramIntoWhiteboard(excalidrawAPI, result.data.diagram);
      setOpen(false);
      setPrompt("");
      toast.add({
        type: "success",
        title: "Diagram added to the whiteboard",
        description: `${selected.label} generated as editable shapes.`,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 z-50 h-11 rounded-full px-4 shadow-lg"
        aria-label="Open AI Helper"
      >
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">AI Helper</span>
        <span className="sm:hidden">AI</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-4 text-primary" />
              AI Helper
            </DialogTitle>
            <DialogDescription>
              Describe a diagram and insert editable shapes onto the current whiteboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            {DIAGRAM_TYPES.map((type) => {
              const meta = MODE_META[type];
              const Icon = meta.icon;
              const active = diagramType === type;

              return (
                <button
                  key={type}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setDiagramType(type);
                    setError(null);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
                    active && "border-primary bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4" />
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {meta.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-helper-prompt">Prompt</Label>
            <Textarea
              id="ai-helper-prompt"
              disabled={loading}
              value={prompt}
              placeholder={selected.example}
              className="min-h-28"
              onChange={(event) => {
                setPrompt(event.target.value);
                if (error) setError(null);
              }}
            />
            {!prompt.trim() && (
              <p className="text-xs text-muted-foreground">
                Example: {selected.example}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not generate diagram</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={resetForm}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {loading ? <Spinner /> : <Sparkles />}
              {loading ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AiHelper;
