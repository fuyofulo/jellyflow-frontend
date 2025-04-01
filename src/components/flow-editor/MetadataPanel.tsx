"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Node, useReactFlow } from "reactflow";
import { ZapNodeData } from "@/types/zap";
import ZapEditor from "@/components/pages/ZapEditor";
import { ZapData } from "@/types/zap";
import { apps } from "@/utils/apps";
import { PanelFactory } from "./sidebar";

interface MetadataPanelProps {
  node: Node;
  onBack: () => void;
  onMetadataChange?: (
    nodeId: string,
    metadata: Record<string, unknown>
  ) => void;
}

export function MetadataPanel({
  node,
  onBack,
  onMetadataChange,
}: MetadataPanelProps) {
  // Find the app description from apps.ts
  const actionId = node.data?.actionId || "";
  const appInfo = apps.find((app) => app.id === actionId);
  const appDescription = appInfo?.description || "";

  // Get description from metadata if available
  const nodeDescription =
    typeof node.data?.metadata === "object"
      ? node.data.metadata.description
      : undefined;

  // Use metadata.description first, then fall back to label or app description
  const description =
    nodeDescription || node.data?.label || appDescription || "";

  // Create local state to track input values
  const [descriptionValue, setDescriptionValue] = useState(description);

  // Update values if node changes
  useEffect(() => {
    if (node) {
      // Get description from metadata if available, then fall back to label
      let currentDescription = node.data?.label || appDescription || "";
      if (node.data?.metadata && typeof node.data.metadata === "object") {
        currentDescription =
          node.data.metadata.description || currentDescription;
      }

      // Update description field
      setDescriptionValue(currentDescription);
    }
  }, [node, node.id, appDescription, node.data?.metadata, node.data?.label]);

  return (
    <div className="bg-black border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center text-zinc-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back to Flow</span>
        </button>
      </div>

      <div
        className="overflow-y-auto flex-1 min-h-0
        [&::-webkit-scrollbar]:w-2 
        [&::-webkit-scrollbar-track]:bg-black 
        [&::-webkit-scrollbar-thumb]:bg-zinc-700
        [&::-webkit-scrollbar-thumb:hover]:bg-yellow-600
        scrollbar-thin scrollbar-track-black scrollbar-thumb-zinc-700 hover:scrollbar-thumb-yellow-600"
      >
        {/* App-specific settings using PanelFactory */}
        <PanelFactory
          node={node}
          onMetadataChange={onMetadataChange}
          onBack={onBack}
        />
      </div>
    </div>
  );
}
