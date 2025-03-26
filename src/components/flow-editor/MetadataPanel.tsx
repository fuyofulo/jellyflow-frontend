"use client";

import React, { useState, useEffect } from "react";
import { Node } from "reactflow";
import { apps } from "@/utils/apps";
import { PanelFactory } from "./sidebar";

interface MetadataPanelProps {
  node: Node;
  onBack: () => void;
  onMetadataChange?: (nodeId: string, metadata: Record<string, any>) => void;
}

const MetadataPanel: React.FC<MetadataPanelProps> = ({
  node,
  onBack,
  onMetadataChange,
}) => {
  const isTrigger = node.type === "trigger";
  const actionId = node.data?.actionId || "";

  // Find the app description from apps.ts
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
  const [metadataValue, setMetadataValue] = useState("");

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

      // Get message from the metadata object if it exists
      let message = "";
      if (node.data?.metadata) {
        if (typeof node.data.metadata === "object") {
          message = node.data.metadata.message || "";
        } else {
          // Handle legacy string metadata
          message = node.data.metadata;
        }
      }

      // Update message field with the extracted value
      setMetadataValue(message);
    }
  }, [node, node.id, appDescription, node.data?.metadata, node.data?.label]);

  // Define a metadata change handler that preserves the basic metadata fields
  const handleAppSpecificMetadataChange = (
    nodeId: string,
    updates: Record<string, any>
  ) => {
    if (onMetadataChange) {
      // Ensure we preserve the basic metadata structure
      const currentMetadata =
        typeof node.data?.metadata === "object"
          ? node.data.metadata
          : { description: descriptionValue, message: metadataValue };

      // Merge the app-specific updates with basic metadata
      const mergedUpdates = {
        metadata: {
          ...currentMetadata,
          ...(updates.metadata || {}),
        },
      };

      onMetadataChange(nodeId, mergedUpdates);
    }
  };

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
          onMetadataChange={handleAppSpecificMetadataChange}
        />
      </div>
    </div>
  );
};

export default MetadataPanel;
