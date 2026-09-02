
"use client";

import React, { useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import axios from "axios";
import { useParams } from "next/navigation";
import { toast } from "@/components/ui/toast";

function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const saveTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {projectid}=useParams();

  const handleCanvasChange = (
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    if (saveTimeRef.current) {
      clearTimeout(saveTimeRef.current);
    }

    saveTimeRef.current = setTimeout(async () => {
  await SaveCanvasChanges(elements, appState, files);

  toast.add({
    title: "Changes Saved",
    type: "success"
  });
}, 10000);
  };

  const SaveCanvasChanges = async (
    elements: readonly any[],
    appState: any,
    files: any
  ) => {
    const result = await axios.post("/api/whiteboard", {
      elements,
      appState,
      files,
      projectId:projectid
    });
  };

  return (
    <div style={{ height: "90vh" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleCanvasChange}
      />
    </div>
  );
}

export default Whiteboard;

