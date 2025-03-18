"use client";

import React, { useMemo } from "react";
import { Node, Edge } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";

interface ZapFlowSidebarProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
  activeNodeId?: string | null;
  onAddNodeBelow?: (nodeId: string, position: { x: number; y: number }) => void;
  onCreateFlow?: () => void;
}

const ZapFlowSidebar: React.FC<ZapFlowSidebarProps> = ({
  nodes,
  edges,
  onNodeClick,
  activeNodeId,
  onAddNodeBelow,
  onCreateFlow,
}) => {
  // Sort nodes by their position in the flow
  const sortedNodes = useMemo(() => {
    if (nodes.length === 0) return [];

    // First find the trigger node (should be the only one with type="trigger")
    const trigger = nodes.find((node) => node.type === "trigger");
    if (!trigger) return nodes;

    const orderedNodes = [trigger];
    let currentNodeId = trigger.id;

    // Keep finding next nodes in the chain until we've included all nodes
    while (orderedNodes.length < nodes.length) {
      // Find an edge that has the current node as its source
      const nextEdge = edges.find((edge) => edge.source === currentNodeId);
      if (!nextEdge) break;

      // Find the node that corresponds to this edge's target
      const nextNode = nodes.find((node) => node.id === nextEdge.target);
      if (!nextNode || orderedNodes.includes(nextNode)) break;

      orderedNodes.push(nextNode);
      currentNodeId = nextNode.id;
    }

    return orderedNodes;
  }, [nodes, edges]);

  // Handler for the Add Action button
  const handleAddAction = () => {
    if (!sortedNodes.length || !onAddNodeBelow) return;

    // Get the last node in the flow
    const lastNode = sortedNodes[sortedNodes.length - 1];

    // Call the same handler that's used in the canvas
    onAddNodeBelow(lastNode.id, {
      x: 0, // These position values don't matter for the modal
      y: 0, // The modal will appear centered on screen
    });
  };

  return (
    <div className="bg-black border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <h2 className="text-lg font-medium text-white">Zap Flow</h2>
      </div>

      <div
        className="p-3 overflow-y-auto flex-1 min-h-0
        [&::-webkit-scrollbar]:w-2 
        [&::-webkit-scrollbar-track]:bg-black 
        [&::-webkit-scrollbar-thumb]:bg-zinc-700
        [&::-webkit-scrollbar-thumb:hover]:bg-yellow-600
        scrollbar-thin scrollbar-track-black scrollbar-thumb-zinc-700 hover:scrollbar-thumb-yellow-600"
      >
        {sortedNodes.map((node, index) => {
          const isTrigger = node.type === "trigger";
          const isActive = node.id === activeNodeId;

          return (
            <button
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              className={`w-full flex items-center px-4 py-3 border rounded-md text-left mb-3 transition-all ${
                isActive
                  ? `${
                      isTrigger
                        ? "bg-purple-900/20 border-purple-700"
                        : "bg-zinc-800 border-zinc-700"
                    }`
                  : `border-zinc-800 hover:bg-zinc-900/50 ${
                      isTrigger
                        ? "hover:border-purple-800/50"
                        : "hover:border-zinc-700/50"
                    }`
              }`}
            >
              <div className="flex items-center w-full">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs mr-3 bg-black ${
                    isTrigger
                      ? "border-purple-500 text-purple-400"
                      : "border-zinc-600 text-zinc-400"
                  }`}
                >
                  {index + 1}
                </div>
                <ActionIcon
                  actionId={node.data.actionId}
                  width={18}
                  height={18}
                  className={`mr-3 ${
                    isTrigger ? "text-purple-400" : "text-white"
                  }`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm truncate ${
                      isTrigger ? "text-purple-200 font-medium" : "text-white"
                    }`}
                  >
                    {node.data.actionName}
                  </span>
                  {node.data.label &&
                    node.data.label !== node.data.actionName && (
                      <span className="text-xs text-zinc-500 truncate mt-1">
                        {node.data.label}
                      </span>
                    )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Add Action button at the end of the flow */}
        {sortedNodes.length > 0 && (
          <div className="flex justify-center mt-3 mb-2">
            <button
              className="flex items-center px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
              onClick={handleAddAction}
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
                className="text-yellow-500 mr-2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm text-white">Add Action</span>
            </button>
          </div>
        )}
      </div>

      {sortedNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center py-6 text-zinc-500 overflow-hidden shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-purple-700 mb-3"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p>Start by adding a trigger to your flow</p>

          {/* Add Trigger Button */}
          <button
            className="flex items-center mt-4 px-4 py-2 bg-purple-900/30 border border-purple-700 rounded-md hover:bg-purple-900/50 transition-colors"
            onClick={onCreateFlow}
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
              className="text-purple-400 mr-2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-sm text-white font-medium">Add Trigger</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ZapFlowSidebar;
