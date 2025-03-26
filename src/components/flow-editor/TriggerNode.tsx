"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";

interface TriggerNodeData {
  label: string;
  actionId: string;
  actionName: string;
  metadata?:
    | {
        description?: string;
        message?: string;
      }
    | string;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onAddNodeBelow?: (nodeId: string, position: { x: number; y: number }) => void;
  isSelected?: boolean;
}

const TriggerNode = memo(
  ({ id, data, xPos, yPos }: NodeProps<TriggerNodeData>) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const description =
      typeof data.metadata === "object"
        ? data.metadata.description || data.label
        : data.label;
    const [editValue, setEditValue] = useState(description);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const currentDescription =
        typeof data.metadata === "object"
          ? data.metadata.description || data.label
          : data.label;
      setEditValue(currentDescription);
    }, [data.metadata, data.label]);

    // Close the menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setMenuOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    // Focus the input when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleRename = () => {
      setIsEditing(true);
      setMenuOpen(false);
    };

    const handleRenameSubmit = () => {
      if (data.onRename && editValue) {
        data.onRename(editValue);
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRenameSubmit();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setEditValue(description);
      }
    };

    const handleAddNodeClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent the node click event from firing
      console.log("Add node button clicked in TriggerNode", {
        id,
        xPos,
        yPos,
        hasCallback: !!data.onAddNodeBelow,
      });

      if (data.onAddNodeBelow) {
        // Make sure we pass the node ID and position correctly
        data.onAddNodeBelow(id, {
          x: xPos,
          y: yPos + 200, // Position 200px below the current node
        });
      } else {
        console.error("onAddNodeBelow callback not provided to TriggerNode");
      }
    };

    return (
      <div
        ref={nodeRef}
        className={`relative bg-purple-900 border-2 ${
          data.isSelected
            ? "border-purple-400"
            : "border-purple-700 hover:border-purple-600"
        } rounded-lg shadow-lg min-w-[280px]`}
      >
        {/* No target handle for trigger nodes since they're always first */}

        {/* Trigger Label Badge */}
        <div className="absolute -left-10 top-5 bg-purple-700 text-white text-xs px-2 py-1 rounded-l-md">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3 mr-1"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>Trigger</span>
          </div>
        </div>

        {/* App Header Section */}
        <div className="flex items-center px-4 py-2 bg-purple-800 rounded-t-lg border-b border-purple-700">
          <div className="mr-2">
            <ActionIcon
              actionId={data.actionId}
              actionName={data.actionName}
              width={20}
              height={20}
            />
          </div>
          <div className="text-sm font-medium text-white">
            {data.actionName}
          </div>
        </div>

        {/* Action Description Section */}
        <div className="px-4 py-3">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 bg-purple-800 border border-purple-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                {description}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-purple-800"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-200"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-6 w-48 bg-purple-900 border border-purple-700 rounded-md shadow-lg z-10">
                    <ul className="py-1">
                      <li
                        className="px-4 py-2 text-sm text-purple-200 hover:bg-purple-800 cursor-pointer flex items-center"
                        onClick={handleRename}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Rename
                      </li>
                      <li
                        className="px-4 py-2 text-sm text-red-400 hover:bg-purple-800 cursor-pointer flex items-center"
                        onClick={() => {
                          data.onDelete?.();
                          setMenuOpen(false);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Delete
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-purple-500"
        />

        {/* Add Node Button */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-10">
          <button
            onClick={handleAddNodeClick}
            className="flex items-center px-3 py-1.5 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 transition-colors shadow-md text-xs font-semibold"
            title="Add action below"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Action
          </button>
        </div>
      </div>
    );
  }
);

TriggerNode.displayName = "TriggerNode";

export default TriggerNode;
