"use client";

import React, { useState, useEffect } from "react";
import { Node } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";
import { apps } from "@/utils/apps";

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
  const actionName = node.data?.actionName || "";

  // Find the app description from apps.ts
  const appInfo = apps.find((app) => app.id === actionId);
  const appDescription = appInfo?.description || "";

  // Use either the existing label or the app description as default
  const description = node.data?.label || appDescription || "";

  // Create local state to track input values
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [metadataValue, setMetadataValue] = useState(node.data?.metadata || "");

  // Update values if node changes
  useEffect(() => {
    if (node) {
      // Update description field
      setDescriptionValue(node.data?.label || appDescription || "");

      // Update metadata field explicitly
      setMetadataValue(node.data?.metadata || "");
    }
  }, [node, node.id, appDescription, node.data?.metadata, node.data?.label]);

  // Handle description input change - ONLY updates the label property
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    setDescriptionValue(newDescription);

    // Only update the label property, nothing else
    if (onMetadataChange) {
      // Create a specific update object for label only
      const labelOnlyUpdate = { label: newDescription };
      onMetadataChange(node.id, labelOnlyUpdate);
    }
  };

  // Handle metadata input change - ONLY updates the metadata property
  const handleMetadataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMetadata = e.target.value;
    setMetadataValue(newMetadata);

    // Only update the metadata property, nothing else
    if (onMetadataChange) {
      // Create a specific update object for metadata only
      const metadataOnlyUpdate = { metadata: newMetadata };
      onMetadataChange(node.id, metadataOnlyUpdate);
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
              {isTrigger ? "Trigger" : "Action"} Settings
            </h3>

            {/* Example metadata fields - these would be dynamic based on the action type */}
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
              </div>

              {/* Metadata field */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Metadata
                </label>
                <textarea
                  rows={6}
                  value={metadataValue}
                  onChange={handleMetadataChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="Enter additional metadata here..."
                />
              </div>

              {/* Placeholder for dynamic fields */}
              <div className="space-y-4 border-t border-zinc-800 pt-4 mt-4">
                <p className="text-zinc-500 text-sm">
                  Additional fields will be shown here based on the selected{" "}
                  {isTrigger ? "trigger" : "action"} type.
                </p>
              </div>
            </div>
          </div>

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

export default MetadataPanel;
