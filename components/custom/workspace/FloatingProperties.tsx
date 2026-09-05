"use client";

import React, { useState } from "react";
import {
  Copy,
  Palette,
  Trash2,
  Type,
} from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

type Props = {
  selectedElement: any[];
  canvasState: any;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
};

const colors = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function FloatingProperties({
  selectedElement,
  canvasState,
  excalidrawAPI,
}: Props) {
  const [showStrokeColors, setShowStrokeColors] =
    useState(false);

  const [showFillColors, setShowFillColors] =
    useState(false);

  if (
    selectedElement.length !== 1 ||
    !canvasState ||
    !excalidrawAPI
  ) {
    return null;
  }

  const element = selectedElement[0];

  const zoom = canvasState.zoom?.value ?? 1;
  const scrollX = canvasState.scrollX ?? 0;
  const scrollY = canvasState.scrollY ?? 0;

  const left =
    (element.x +
      element.width / 2 +
      scrollX) *
    zoom;

  const top =
    (element.y + scrollY) * zoom - 55;

  const updateElement = (
    updates: Record<string, any>
  ) => {
    const elements =
      excalidrawAPI.getSceneElements();

    excalidrawAPI.updateScene({
      elements: elements.map((item: any) =>
        item.id === element.id
          ? {
              ...item,
              ...updates,
              version: item.version + 1,
              versionNonce: Math.floor(
                Math.random() * 2147483647
              ),
            }
          : item
      ),
    });
  };

  const ColorPicker = ({
    property,
    isOpen,
    setIsOpen,
  }: {
    property:
      | "strokeColor"
      | "backgroundColor";
    isOpen: boolean;
    setIsOpen: React.Dispatch<
      React.SetStateAction<boolean>
    >;
  }) => {
    const currentColor =
      element[property] ?? "#000000";

    return (
      <div className="relative">
        <button
          type="button"
          title={
            property === "strokeColor"
              ? "Stroke color"
              : "Fill color"
          }
          onClick={() =>
            setIsOpen((prev) => !prev)
          }
          className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-gray-100"
        >
          <Palette
            size={16}
            className="text-gray-600"
          />
        </button>

        {isOpen && (
          <div className="absolute bottom-9 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 shadow-lg">
            {colors.map((color) => {
              const isSelected =
                currentColor === color;

              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => {
                    updateElement({
                      [property]: color,
                    });

                    setIsOpen(false);
                  }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150 hover:scale-125 ${
                    isSelected
                      ? "ring-2 ring-gray-400 ring-offset-1"
                      : ""
                  }`}
                  style={{
                    backgroundColor: color,
                    border:
                      color === "#ffffff"
                        ? "1px solid #d1d5db"
                        : "1px solid transparent",
                  }}
                >
                  {isSelected && (
                    <span
                      className={`text-[10px] font-bold ${
                        color === "#ffffff" ||
                        color === "#eab308"
                          ? "text-black"
                          : "text-white"
                      }`}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const commonProperties = (
    <>
      <ColorPicker
        property="strokeColor"
        isOpen={showStrokeColors}
        setIsOpen={setShowStrokeColors}
      />

      <select
        value={element.strokeWidth ?? 2}
        onChange={(e) =>
          updateElement({
            strokeWidth: Number(
              e.target.value
            ),
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Stroke width"
      >
        <option value="1">1px</option>
        <option value="2">2px</option>
        <option value="4">4px</option>
        <option value="6">6px</option>
        <option value="8">8px</option>
      </select>

      <select
        value={
          element.strokeStyle ?? "solid"
        }
        onChange={(e) =>
          updateElement({
            strokeStyle: e.target.value,
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Stroke style"
      >
        <option value="solid">
          Solid
        </option>
        <option value="dashed">
          Dashed
        </option>
        <option value="dotted">
          Dotted
        </option>
      </select>

      <select
        value={element.opacity ?? 100}
        onChange={(e) =>
          updateElement({
            opacity: Number(
              e.target.value
            ),
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Opacity"
      >
        <option value="100">100%</option>
        <option value="75">75%</option>
        <option value="50">50%</option>
        <option value="25">25%</option>
      </select>
    </>
  );

  const shapeProperties = (
    <>
      <ColorPicker
        property="backgroundColor"
        isOpen={showFillColors}
        setIsOpen={setShowFillColors}
      />

      {commonProperties}
    </>
  );

  const arrowProperties = (
    <>
      {commonProperties}

      <select
        value={
          element.startArrowhead ?? "none"
        }
        onChange={(e) =>
          updateElement({
            startArrowhead:
              e.target.value === "none"
                ? null
                : e.target.value,
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Start arrow"
      >
        <option value="none">
          Start
        </option>
        <option value="arrow">
          Arrow
        </option>
        <option value="triangle">
          Triangle
        </option>
        <option value="bar">
          Bar
        </option>
        <option value="dot">
          Dot
        </option>
      </select>

      <select
        value={
          element.endArrowhead ?? "arrow"
        }
        onChange={(e) =>
          updateElement({
            endArrowhead:
              e.target.value === "none"
                ? null
                : e.target.value,
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="End arrow"
      >
        <option value="none">
          End
        </option>
        <option value="arrow">
          Arrow
        </option>
        <option value="triangle">
          Triangle
        </option>
        <option value="bar">
          Bar
        </option>
        <option value="dot">
          Dot
        </option>
      </select>
    </>
  );

  const textProperties = (
    <>
      <Type
        size={14}
        className="text-gray-600"
      />

      <select
        value={element.fontSize ?? 20}
        onChange={(e) =>
          updateElement({
            fontSize: Number(
              e.target.value
            ),
          })
        }
        className="h-7 w-12 rounded-md bg-gray-100 px-1 text-[11px] outline-none hover:bg-gray-200"
        title="Font size"
      >
        <option value="12">12</option>
        <option value="16">16</option>
        <option value="20">20</option>
        <option value="24">24</option>
        <option value="32">32</option>
        <option value="40">40</option>
        <option value="48">48</option>
      </select>

      <select
        value={element.fontFamily ?? 5}
        onChange={(e) =>
          updateElement({
            fontFamily: Number(
              e.target.value
            ),
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Font family"
      >
        <option value="1">
          Virgil
        </option>
        <option value="2">
          Helvetica
        </option>
        <option value="3">
          Cascadia
        </option>
        <option value="5">
          Excalifont
        </option>
      </select>

      <ColorPicker
        property="strokeColor"
        isOpen={showStrokeColors}
        setIsOpen={setShowStrokeColors}
      />

      <select
        value={
          element.textAlign ?? "left"
        }
        onChange={(e) =>
          updateElement({
            textAlign: e.target.value,
          })
        }
        className="h-7 rounded-md bg-gray-100 px-1.5 text-[11px] outline-none hover:bg-gray-200"
        title="Text alignment"
      >
        <option value="left">
          Left
        </option>
        <option value="center">
          Center
        </option>
        <option value="right">
          Right
        </option>
      </select>
    </>
  );

  const deleteElement = () => {
    excalidrawAPI.updateScene({
      elements:
        excalidrawAPI
          .getSceneElements()
          .filter(
            (item: any) =>
              item.id !== element.id
          ),
    });
  };

  const duplicateElement = () => {
    const newElement = {
      ...element,
      id: crypto.randomUUID(),
      x: element.x + 20,
      y: element.y + 20,
      version: 1,
      versionNonce: Math.floor(
        Math.random() * 2147483647
      ),
    };

    excalidrawAPI.updateScene({
      elements: [
        ...excalidrawAPI.getSceneElements(),
        newElement,
      ],
      appState: {
        selectedElementIds: {
          [newElement.id]: true,
        },
      },
    });
  };

  const moveElement = (
    direction: number
  ) => {
    const elements = [
      ...excalidrawAPI.getSceneElements(),
    ];

    const index = elements.findIndex(
      (item: any) =>
        item.id === element.id
    );

    const newIndex =
      index + direction;

    if (
      index < 0 ||
      newIndex < 0 ||
      newIndex >= elements.length
    ) {
      return;
    }

    [
      elements[index],
      elements[newIndex],
    ] = [
      elements[newIndex],
      elements[index],
    ];

    excalidrawAPI.updateScene({
      elements,
    });
  };

  let properties = null;

  if (
    [
      "rectangle",
      "diamond",
      "ellipse",
    ].includes(element.type)
  ) {
    properties =
      shapeProperties;
  } else if (
    element.type === "arrow"
  ) {
    properties =
      arrowProperties;
  } else if (
    element.type === "line" ||
    element.type === "freedraw" ||
    element.type === "image"
  ) {
    properties =
      commonProperties;
  } else if (
    element.type === "text"
  ) {
    properties =
      textProperties;
  }

  if (!properties) {
    return null;
  }

  return (
    <div
      className="absolute z-[100] rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-md"
      style={{
        left,
        top,
        transform:
          "translateX(-50%)",
      }}
    >
      <div className="flex max-w-[90vw] items-center gap-1.5">
        {properties}

        <div className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          title="Send backward"
          onClick={() =>
            moveElement(-1)
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100"
        >
          ↓
        </button>

        <button
          type="button"
          title="Bring forward"
          onClick={() =>
            moveElement(1)
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100"
        >
          ↑
        </button>

        <button
          type="button"
          title="Duplicate"
          onClick={
            duplicateElement
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100"
        >
          <Copy size={14} />
        </button>

        <button
          type="button"
          title="Delete"
          onClick={deleteElement}
          className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default FloatingProperties;