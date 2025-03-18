"use client";

import React, { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";

interface ActionNodeData {
  label: string;
  actionId: string;
  actionName: string;
  onDuplicate?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onAddNodeBelow?: (nodeId: string, position: { x: number; y: number }) => void;
  isSelected?: boolean;
  number?: number;
}

const ActionNode = memo(
  ({ id, data, xPos, yPos }: NodeProps<ActionNodeData>) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

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
        setEditValue(data.label);
      }
    };

    const handleAddNodeClick = () => {
      if (data.onAddNodeBelow && nodeRef.current) {
        data.onAddNodeBelow(id, {
          x: xPos,
          y: yPos + 200, // Position 200px below the current node
        });
      }
    };

    return (
      <div
        ref={nodeRef}
        className={`relative bg-zinc-800 border-2 ${
          data.isSelected
            ? "border-yellow-500"
            : "border-zinc-700 hover:border-zinc-500"
        } rounded-lg shadow-lg w-64`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-yellow-600"
        />

        {/* Node Number Indicator (if provided) */}
        {data.number !== undefined && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-yellow-600 flex items-center justify-center">
            <span className="text-xs font-bold text-black">{data.number}</span>
          </div>
        )}

        {/* App Header Section */}
        <div className="flex items-center px-4 py-2 bg-zinc-700 rounded-t-lg border-b border-zinc-600">
          <div className="mr-2">
            <ActionIcon
              actionId={data.actionId}
              actionName={data.actionName}
              width={20}
              height={20}
            />
          </div>
          <div className="text-sm font-medium text-zinc-100">
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
              className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">
                {data.label}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-700"
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
                    className="text-zinc-300"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-6 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10">
                    <ul className="py-1">
                      <li
                        className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 cursor-pointer flex items-center"
                        onClick={() => {
                          data.onDuplicate?.();
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
                          <rect
                            x="8"
                            y="8"
                            width="12"
                            height="12"
                            rx="2"
                            ry="2"
                          />
                          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                        </svg>
                        Duplicate
                      </li>
                      <li
                        className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 cursor-pointer flex items-center"
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
                        className="px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 cursor-pointer flex items-center"
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
          className="w-3 h-3 bg-yellow-600"
        />

        {/* Add Node Button - Now always visible with increased spacing */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-16">
          <button
            onClick={handleAddNodeClick}
            className="flex items-center px-2 py-1 bg-yellow-600 text-black text-xs rounded hover:bg-yellow-500 transition-colors shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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

ActionNode.displayName = "ActionNode";

export default ActionNode;
