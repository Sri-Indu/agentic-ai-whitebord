"use client";

import React, {
  useCallback,
  useRef,
  useState,
} from "react";
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

import type {
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import FloatingProperties from "./FloatingProperties";

const Excalidraw = dynamic(
  async () => {
    const { Excalidraw } =
      await import("@excalidraw/excalidraw");

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

  const [selectedElement, setSelectedElement] =
    useState<any[]>([]);

  const [canvasState, setCanvasState] =
    useState<any>(null);

  const [locked, setLocked] = useState(false);

  const SaveCanvasChanges = useCallback(
    async (
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
    },
    [projectid]
  );

  const handleCanvasChange = useCallback(
    (
      elements: readonly any[],
      appState: any,
      files: any
    ) => {
      setCanvasState(appState);

      const selectedIds = Object.keys(
        appState.selectedElementIds || {}
      );

      const selectedElements = elements.filter(
        (element) =>
          selectedIds.includes(element.id)
      );

      setSelectedElement(selectedElements);

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
    },
    [SaveCanvasChanges]
  );

  const handleExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      setExcalidrawAPI(api);
    },
    []
  );

  const changeTool = useCallback(
    (tool: ToolType) => {
      if (!excalidrawAPI) return;

      setActiveTool(tool);

      excalidrawAPI.setActiveTool({
        type: tool,
      });
    },
    [excalidrawAPI]
  );

  const toggleLock = useCallback(() => {
    if (!excalidrawAPI) return;

    setLocked((prev) => !prev);

    excalidrawAPI.setActiveTool({
      type: activeTool,
      locked: !locked,
    });
  }, [
    excalidrawAPI,
    activeTool,
    locked,
  ]);

  const getFloatingPosition = () => {
    if (
      !selectedElement ||
      selectedElement.length !== 1 ||
      !canvasState
    ) {
      return {
        left: 0,
        top: 0,
      };
    }

    const element = selectedElement[0];

    const zoom =
      canvasState.zoom?.value ?? 1;

    const scrollX =
      canvasState.scrollX ?? 0;

    const scrollY =
      canvasState.scrollY ?? 0;

    const centerX =
      element.x + element.width / 2;

    const screenX =
      (centerX + scrollX) * zoom;

    const screenY =
      (element.y + scrollY) * zoom;

    return {
      left: screenX,
      top: screenY - 60,
    };
  };

  const floatingPosition =
    getFloatingPosition();

  console.log(floatingPosition);

  return (
    <div style={{ height: "90vh" }}>
      <Excalidraw
        excalidrawAPI={
          handleExcalidrawAPI
        }
        onChange={
          handleCanvasChange
        }
      />

      <FloatingProperties
        selectedElement={
          selectedElement
        }
        canvasState={
          canvasState
        }
        excalidrawAPI={
          excalidrawAPI
        }
      />

      <div className="absolute left-4 top-1/2 z-50 -translate-y-1/2 flex flex-col gap-0.5 rounded-xl border bg-white p-1 shadow-lg">
        <button
          onClick={toggleLock}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:cursor-pointer hover:bg-primary/10 ${
            locked
              ? "bg-primary/10"
              : ""
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

        <div className="my-0.5 h-px w-full bg-gray-200" />

        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.name}
              onClick={() =>
                changeTool(
                  tool.name
                )
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:cursor-pointer hover:bg-primary/10 ${
                activeTool ===
                tool.name
                  ? "bg-primary/10"
                  : ""
              }`}
              title={tool.name}
            >
              <Icon
                size={16}
                className={
                  tool.color
                }
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Whiteboard;