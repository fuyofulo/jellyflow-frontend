"use client";

import React, { useState, useEffect } from "react";
import { Node } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";

export interface BaseMetadataPanelProps {
  node: Node;
  onBack: () => void;
  onMetadataChange?: (nodeId: string, metadata: Record<string, any>) => void;
}

const BaseMetadataPanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onBack,
  onMetadataChange,
}) => {
  const isTrigger = node.type === "trigger";
  const actionId = node.data?.actionId || "";
  const actionName = node.data?.actionName || "";

  // Get description from metadata if available
  const nodeDescription =
    typeof node.data?.metadata === "object"
      ? node.data.metadata.description
      : undefined;

  // Use metadata.description first, then fall back to label
  const description = nodeDescription || node.data?.label || "";

  // Create local state to track input values
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [metadataValue, setMetadataValue] = useState("");

  // Update values if node changes
  useEffect(() => {
    if (node) {
      // Get description from metadata if available, then fall back to label
      let currentDescription = node.data?.label || "";
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
  }, [node, node.id, node.data?.metadata, node.data?.label]);

  // Handle description input change - updates label and adds description to metadata
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    setDescriptionValue(newDescription);

    if (onMetadataChange) {
      // Update both label and set description in metadata
      const updates = {
        label: newDescription,
        // Update metadata with description, preserving any existing message
        metadata: {
          description: newDescription,
          message: metadataValue,
        },
      };
      onMetadataChange(node.id, updates);
    }
  };

  // Handle metadata input change - updates the message field in metadata
  const handleMetadataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMetadataValue(newMessage);

    // Update only the message field in metadata, preserving description
    if (onMetadataChange) {
      const metadataUpdate = {
        metadata: {
          description: descriptionValue,
          message: newMessage,
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  // Method to update metadata with custom fields (to be used by child components)
  const updateMetadata = (fields: Record<string, any>) => {
    if (onMetadataChange) {
      const metadataUpdate = {
        metadata: {
          description: descriptionValue,
          message: metadataValue,
          ...fields,
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  return (
    <div className="bg-black border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center text-zinc-400 hover:text-white transition-colors mb-2"
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

        <div className="flex items-center mt-2">
          <div
            className={`p-2 rounded-md mr-3 ${
              isTrigger ? "bg-purple-900/20" : "bg-zinc-800"
            }`}
          >
            <ActionIcon
              actionId={actionId}
              width={24}
              height={24}
              className={isTrigger ? "text-purple-400" : "text-white"}
            />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">{actionName}</h2>
            <p className="text-sm text-zinc-400">
              Configure settings for this {isTrigger ? "trigger" : "action"}
            </p>
          </div>
        </div>
      </div>

      <div
        className="p-4 overflow-y-auto flex-1 min-h-0
        [&::-webkit-scrollbar]:w-2 
        [&::-webkit-scrollbar-track]:bg-black 
        [&::-webkit-scrollbar-thumb]:bg-zinc-700
        [&::-webkit-scrollbar-thumb:hover]:bg-yellow-600
        scrollbar-thin scrollbar-track-black scrollbar-thumb-zinc-700 hover:scrollbar-thumb-yellow-600"
      >
        <div className="space-y-4">
          <div className="p-4 border border-zinc-800 rounded-md bg-zinc-900/50">
            <h3
              className={`text-base font-medium mb-3 ${
                isTrigger ? "text-purple-300" : "text-yellow-300"
              }`}
            >
              Basic Settings
            </h3>

            {/* Basic fields - common to all panels */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={descriptionValue}
                  onChange={handleDescriptionChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="Enter a description for this step"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This appears on the node and is saved as the primary
                  description.
                </p>
              </div>

              {/* Metadata field */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Additional Message
                </label>
                <textarea
                  rows={6}
                  value={metadataValue}
                  onChange={handleMetadataChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="Enter additional details or instructions for this step..."
                />
                <p className="text-xs text-zinc-500 mt-1">
                  This will be saved as a message in the metadata but doesn't
                  appear on the node.
                </p>
              </div>
            </div>
          </div>

          {/* This is where app-specific settings will be rendered by child components */}
          {/* Note: children should be passed directly as a prop to functional components */}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              className={`px-4 py-2 rounded text-black font-medium ${
                isTrigger
                  ? "bg-purple-500 hover:bg-purple-600"
                  : "bg-yellow-500 hover:bg-yellow-600"
              } transition-colors`}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseMetadataPanel;
