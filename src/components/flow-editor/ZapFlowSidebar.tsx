"use client";

import React, { useMemo } from "react";
import { Node, Edge } from "reactflow";
import { ActionIcon } from "@/utils/iconMapping";

// Define a helper function to validate node configuration
const isNodeFullyConfigured = (node: Node): boolean => {
  // Check if node has basic metadata
  if (!node.data?.metadata) {
    return false;
  }

  const metadata = node.data.metadata || {};
  const actionId = node.data?.actionId;

  // For trigger nodes, check if it's a webhook and has received data
  if (node.type === "trigger") {
    // If it's a webhook trigger, check if there's webhook response data
    if (
      actionId === "ed63b01b-87ca-45a3-86f0-ba37d2c40235" ||
      node.data?.actionName?.toLowerCase().includes("webhook")
    ) {
      // Check if this node has a webhookDataReceived flag or webhookTestCompleted flag
      return !!(
        metadata.webhookDataReceived ||
        metadata.webhookTestCompleted ||
        (metadata.webhook && metadata.webhook.testCompleted)
      );
    }

    // For other triggers, check if they have description
    return !!metadata.description;
  }

  // Email action validation
  if (
    actionId === "34e430af-d860-4cb9-b71a-a26fa89f396c" ||
    node.data?.actionName?.toLowerCase().includes("email")
  ) {
    const data = metadata.data || {};

    // Check if email has required fields
    const hasRecipients =
      Array.isArray(data.recipients) &&
      data.recipients.length > 0 &&
      data.recipients.every((r: string) => r.trim() !== "");
    const hasSubject = !!data.subject && data.subject.trim() !== "";
    const hasBody = !!data.body && data.body.trim() !== "";

    return hasRecipients && hasSubject && hasBody;
  }

  // Telegram action validation
  if (
    actionId === "telegram" ||
    node.data?.actionName?.toLowerCase().includes("telegram")
  ) {
    // Check if Telegram is verified and has a message
    const isVerified = !!metadata.isVerified;
    const hasUsername =
      !!metadata.username &&
      typeof metadata.username === "string" &&
      metadata.username.trim() !== "";
    const hasUserId = !!metadata.userId; // userId might be a number or other non-string type
    const hasMessage =
      !!metadata.updateMessage &&
      typeof metadata.updateMessage === "string" &&
      metadata.updateMessage.trim() !== "";

    console.log("Telegram node check:", {
      isVerified,
      hasUsername,
      hasUserId,
      hasMessage,
    });

    return isVerified && hasUsername && hasUserId && hasMessage;
  }

  // Database action validation
  if (
    actionId === "database" ||
    node.data?.actionName?.toLowerCase().includes("database")
  ) {
    // Check if database configuration is complete
    const hasConnectionString =
      !!metadata.connectionString && metadata.connectionString.trim() !== "";
    const hasQuery = !!metadata.query && metadata.query.trim() !== "";

    return hasConnectionString && hasQuery;
  }

  // Default check for other action types - at minimum they should have a description
  return !!metadata.description;
};

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

    // Call the same handler that's used for the plus buttons in edges
    onAddNodeBelow(lastNode.id, {
      x: 250, // Use a sensible default x position
      y: lastNode.position.y + 200, // Position it below the last node
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
          const isConfigured = isNodeFullyConfigured(node);

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
                <div className="flex flex-col flex-1">
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

                {/* Status indicator */}
                <div className="ml-2 flex-shrink-0">
                  {isConfigured ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center bg-orange-500/20 text-orange-400"
                      title="Configuration required"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M12 9v2m0 4h.01" />
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Add Action button at the end of the flow */}
        {sortedNodes.length > 0 && (
          <div className="flex justify-center mt-6 mb-2">
            <button
              className="flex items-center px-4 py-2 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 transition-colors shadow-md"
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
                className="mr-2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm font-bold">Add Action</span>
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
