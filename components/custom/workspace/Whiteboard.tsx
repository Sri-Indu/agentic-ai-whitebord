"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";

import "@excalidraw/excalidraw/index.css";

import { toast } from "@/components/ui/toast";
import axios from "axios";
import { useParams } from "next/navigation";

import "./whiteboard.css";

import {
  Lock,
  Hand,
  MousePointer2,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Eraser,
} from "lucide-react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const Excalidraw = dynamic(
  async () => {
    const { Excalidraw } = await import("@excalidraw/excalidraw");
    return Excalidraw;
  },
  {
    ssr: false,
  }
);

type ToolType =
  | "selection"
  | "hand"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "image"
  | "eraser";

const tools: {
  name: ToolType;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    name: "selection",
    icon: MousePointer2,
    color: "text-blue-600",
  },
  {
    name: "hand",
    icon: Hand,
    color: "text-cyan-600",
  },
  {
    name: "rectangle",
    icon: Square,
    color: "text-purple-600",
  },
  {
    name: "diamond",
    icon: Diamond,
    color: "text-pink-600",
  },
  {
    name: "ellipse",
    icon: Circle,
    color: "text-green-600",
  },
  {
    name: "arrow",
    icon: ArrowRight,
    color: "text-orange-600",
  },
  {
    name: "line",
    icon: Minus,
    color: "text-indigo-600",
  },
  {
    name: "freedraw",
    icon: Pencil,
    color: "text-red-600",
  },
  {
    name: "text",
    icon: Type,
    color: "text-teal-600",
  },
  {
    name: "image",
    icon: ImageIcon,
    color: "text-violet-600",
  },
  {
    name: "eraser",
    icon: Eraser,
    color: "text-gray-600",
  },
];

function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const saveTimeRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const { projectid } = useParams();

  const [activeTool, setActiveTool] =
    useState<ToolType>("selection");

  const [locked, setLocked] = useState(false);

  const handleCanvasChange = (
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    if (saveTimeRef.current) {
      clearTimeout(saveTimeRef.current);
    }

    saveTimeRef.current = setTimeout(async () => {
      try {
        await SaveCanvasChanges(
          elements,
          appState,
          files
        );

        toast.add({
          title: "Changes Saved",
          type: "success",
        });
      } catch (error) {
        console.error(
          "Failed to save canvas:",
          error
        );

        toast.add({
          title: "Failed to save changes",
          type: "error",
        });
      }
    }, 10000);
  };

  const SaveCanvasChanges = async (
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    await axios.post("/api/whiteboard", {
      elements,
      appState,
      files,
      projectId: projectid,
    });
  };

  const changeTool = (tool: ToolType) => {
    if (!excalidrawAPI) return;

    setActiveTool(tool);

    excalidrawAPI.setActiveTool({
      type: tool,
    });
  };

  const toggleLock = () => {
    if (!excalidrawAPI) return;

    setLocked((prev) => !prev);

    excalidrawAPI.setActiveTool({
      type: activeTool,
      locked: !locked,
    });
  };

  return (
    <div style={{ height: "90vh" }}>
      <Excalidraw
        excalidrawAPI={(api) =>
          setExcalidrawAPI(api)
        }
        onChange={handleCanvasChange}
      />

      {/* Custom Toolbar */}
      <div className="absolute left-4 top-1/2 z-50 -translate-y-1/2 flex flex-col gap-0.5 rounded-xl border bg-white p-1 shadow-lg">

        {/* Lock */}
        <button
          onClick={toggleLock}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:cursor-pointer hover:bg-primary/10 ${
            locked ? "bg-primary/10" : ""
          }`}
          title="Lock"
        >
          <Lock
            size={16}
            className={
              locked
                ? "text-blue-600"
                : "text-gray-700"
            }
          />
        </button>

        {/* Separator */}
        <div className="my-0.5 h-px w-full bg-gray-200" />

        {/* Tools */}
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.name}
              onClick={() =>
                changeTool(tool.name)
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:cursor-pointer hover:bg-primary/10 ${
                activeTool === tool.name
                  ? "bg-primary/10"
                  : ""
              }`}
              title={tool.name}
            >
              <Icon
                size={16}
                className={tool.color}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Whiteboard;