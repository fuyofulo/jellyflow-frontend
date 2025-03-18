"use client";

import React, {
  useCallback,
  useState,
  useRef,
  FC,
  useEffect,
  useTransition,
} from "react";
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  MarkerType,
  applyNodeChanges,
} from "reactflow";
import {
  FlowEditor,
  TriggerNode,
  ActionNode,
  ZapFlowSidebar,
  MetadataPanel,
} from "../flow-editor";
import { Modal } from "../ui/Modal";
import { AppCard } from "../ui/AppCard";
import { apps, App } from "@/utils/apps";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getToken, isAuthenticated, getAuthHeaders } from "@/utils/auth";
import { useRouter } from "next/navigation";

// Node types for React Flow
const nodeTypes = {
  action: ActionNode,
  trigger: TriggerNode,
};

// Initial nodes for testing
const initialNodes: Node[] = [];

// Initial edges for testing
const initialEdges: Edge[] = [];

// Sample actions for quick access
const quickActions = [
  {
    id: "aac0e619-2094-4589-badc-fe487834f705",
    name: "Webhook",
    category: "Triggers",
  },
  {
    id: "f4b74660-98e4-46b3-856a-1b4b1423c722",
    name: "Email",
    category: "Actions",
  },
  {
    id: "7fbe85fc-5a12-4103-8d00-264f117aaf37",
    name: "Slack",
    category: "Actions",
  },
  {
    id: "103b134a-4dac-46a3-a4c3-621e9ffcfd79",
    name: "Ethereum",
    category: "Actions",
  },
  {
    id: "f14c5d53-4563-41a2-9cdb-fcf5d184deda",
    name: "Drive",
    category: "Actions",
  },
  {
    id: "9a4793d2-3125-4ed1-9da2-0499edb6bdd0",
    name: "ChatGPT",
    category: "Actions",
  },
];

// Add this interface near the top of the file after imports
interface ZapData {
  zapName: string;
  availableTriggerId: string;
  triggerMetadata: Record<string, any>;
  actions: {
    availableActionId: string;
    actionMetadata: Record<string, any>;
  }[];
}

// Add a constant for the localStorage key
const LOCAL_STORAGE_KEY = "zap_draft_data";

// Custom confirmation dialog component
const ConfirmDialog: FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <div className="bg-zinc-900 border border-yellow-600/30 rounded-lg shadow-2xl w-[400px] overflow-hidden">
        <div className="p-4 border-b border-yellow-600/30">
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="p-6 text-zinc-300">
          <p>{message}</p>
        </div>
        <div className="flex justify-end gap-2 p-4 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const ZapEditor: FC = () => {
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [zapName, setZapName] = useState("Untitled Zap");
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [newEdges, setNewEdges] = useState<Edge[]>([]);
  const nodeCountRef = useRef<Record<string, number>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Add this state for structured data
  const [zapData, setZapData] = useState<ZapData>({
    zapName: "Untitled Zap",
    availableTriggerId: "aac0e619-2094-4589-badc-fe487834f705", // Default trigger ID
    triggerMetadata: {},
    actions: [],
  });

  // Add a state for tracking save operations
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add the React concurrent mode transition hook
  const [isPending, startTransition] = useTransition();

  // Add state for the confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Filter apps based on search term and category
  const filteredTriggers = React.useMemo(() => {
    const triggers = apps.filter((app) => app.category === "trigger");
    if (!searchTerm.trim()) return triggers;

    const term = searchTerm.toLowerCase();
    return triggers.filter(
      (app) =>
        app.name.toLowerCase().includes(term) ||
        app.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const filteredActions = React.useMemo(() => {
    const actions = apps.filter((app) => app.category === "action");
    if (!searchTerm.trim()) return actions;

    const term = searchTerm.toLowerCase();
    return actions.filter(
      (app) =>
        app.name.toLowerCase().includes(term) ||
        app.description.toLowerCase().includes(term) ||
        app.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Helper function to get the ordered nodes based on connections
  const getOrderedNodes = useCallback(() => {
    // If no nodes or edges, return empty array
    if (nodes.length === 0) return [];

    // Find the first node (no incoming edges)
    const firstNodeId = nodes.find(
      (node) => !edges.some((edge) => edge.target === node.id)
    )?.id;

    if (!firstNodeId) return nodes; // Fallback if can't find first node

    // Build the ordered list
    const orderedIds: string[] = [firstNodeId];
    let currentId = firstNodeId;

    // Follow the edges to build the complete path
    while (orderedIds.length < nodes.length) {
      const nextEdge = edges.find((edge) => edge.source === currentId);
      if (!nextEdge) break; // No more connections

      orderedIds.push(nextEdge.target);
      currentId = nextEdge.target;
    }

    // Map IDs to actual nodes
    return orderedIds
      .map((id) => nodes.find((node) => node.id === id))
      .filter(Boolean) as Node[];
  }, [nodes, edges]);

  // Update the ordered nodes whenever nodes or edges change
  React.useEffect(() => {
    const orderedNodes = getOrderedNodes();

    // Update zapData with the new order of actions
    if (orderedNodes.length > 0) {
      const actions = orderedNodes.map((node) => {
        // Map node data to action IDs and metadata
        const actionId = mapActionIdToBackendId(node.data.actionId);
        return {
          availableActionId: actionId,
          actionMetadata: {
            message: node.data.metadata || node.data.label || "",
          },
        };
      });

      setZapData((prev) => ({
        ...prev,
        actions,
      }));
    }
  }, [nodes, edges, getOrderedNodes]);

  // Initialize node count reference
  React.useEffect(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      const actionId = node.data.actionId;
      if (!counts[actionId]) {
        counts[actionId] = 0;
      }
      counts[actionId]++;
    });
    nodeCountRef.current = counts;
  }, []);

  // Find all instances of handleNodesChange and keep only the final version
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Only handle select changes, filter out all position changes
    const selectChanges = changes.filter((c) => c.type === "select");
    if (selectChanges.length > 0) {
      setNodes((nds) => applyNodeChanges(selectChanges, nds));
    }
  }, []);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      // Apply the changes to the edges
      return changes.reduce(
        (acc, change) => {
          if (change.type === "remove") {
            return acc.filter((edge) => edge.id !== change.id);
          }
          return acc;
        },
        [...eds]
      );
    });
  }, []);

  const onDragStart = useCallback((event: React.DragEvent, app: App) => {
    // Set the drag data
    event.dataTransfer.setData("application/reactflow", JSON.stringify(app));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      try {
        const app = JSON.parse(
          event.dataTransfer.getData("application/reactflow")
        ) as App;

        // Check if the dropped element is valid
        if (typeof app === "undefined" || !app) {
          return;
        }

        // Get the position of the drop
        const reactFlowBounds = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect();
        if (!reactFlowBounds) return;

        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        // Validation: if no nodes, only allow triggers
        if (nodes.length === 0 && app.category !== "trigger") {
          console.error("The first node must be a trigger");
          // Could show a toast notification here
          return;
        }

        // Validation: if nodes exist, only allow actions
        if (nodes.length > 0 && app.category === "trigger") {
          console.error("Only one trigger is allowed per flow");
          // Could show a toast notification here
          return;
        }

        // Get the next count for this action type
        if (!nodeCountRef.current[app.id]) {
          nodeCountRef.current[app.id] = 0;
        }
        nodeCountRef.current[app.id]++;

        // Create the new node
        const newNode: Node = {
          id: `${app.id}-${nodeCountRef.current[app.id]}`,
          type: app.category === "trigger" ? "trigger" : "action",
          position,
          data: {
            label: app.name,
            actionId: app.id,
            actionName: app.name,
          },
        };

        setNodes((nds) => [...nds, newNode]);

        // If this is the first node (a trigger), update the zapData
        if (nodes.length === 0) {
          setZapData({
            zapName: zapName,
            availableTriggerId: app.id, // Use the proper UUID directly from the app object
            triggerMetadata: { message: app.name },
            actions: [],
          });
        }
      } catch (error) {
        console.error("Error processing the drop:", error);
      }
    },
    [nodes, zapName]
  );

  const handleAddNode = useCallback(
    (
      sourceId: string,
      targetId: string,
      position: { x: number; y: number }
    ) => {
      // Show a modal or some UI to select which node to add
      setIsAddingNode(true);
      setAddNodePosition(position);
      setSourceNodeId(sourceId);
      setTargetNodeId(targetId);

      // Save the existing edge that we'll need to remove
      const existingEdge = edges.find(
        (edge) => edge.source === sourceId && edge.target === targetId
      );
      if (existingEdge) {
        setNewEdges([existingEdge]);
      }
    },
    [edges]
  );

  const handleAddQuickAction = useCallback(
    (actionId: string, actionName: string) => {
      if (!sourceNodeId || !targetNodeId || !addNodePosition) return;

      // Get the next count for this action type
      if (!nodeCountRef.current[actionId]) {
        nodeCountRef.current[actionId] = 0;
      }
      nodeCountRef.current[actionId]++;

      // Create a new node at the position of the "+" button
      const newNodeId = `${actionId}-${nodeCountRef.current[actionId]}`;
      const newNode: Node = {
        id: newNodeId,
        type: "action",
        position: {
          x: addNodePosition.x - 140, // Center the node horizontally
          y: addNodePosition.y - 40, // Position above the plus button
        },
        data: {
          label: actionName,
          actionId: actionId,
          actionName: actionName,
        },
      };

      // Create two new edges to connect the source -> new node -> target
      const newEdge1: Edge = {
        id: `e-${sourceNodeId}-${newNodeId}`,
        source: sourceNodeId,
        target: newNodeId,
        type: "custom",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      const newEdge2: Edge = {
        id: `e-${newNodeId}-${targetNodeId}`,
        source: newNodeId,
        target: targetNodeId,
        type: "custom",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      // Delete the old edge that connected source directly to target
      setEdges((edges) =>
        edges
          .filter(
            (edge) =>
              !(edge.source === sourceNodeId && edge.target === targetNodeId)
          )
          .concat([newEdge1, newEdge2])
      );

      // Add the new node
      setNodes((nodes) => [...nodes, newNode]);

      // Reset state
      setIsAddingNode(false);
      setSourceNodeId(null);
      setTargetNodeId(null);
      setNewEdges([]);
    },
    [sourceNodeId, targetNodeId, addNodePosition]
  );

  const handleDuplicateNode = useCallback((nodeId: string) => {
    setNodes((nodes) => {
      const nodeIndex = nodes.findIndex((node) => node.id === nodeId);
      if (nodeIndex === -1) return nodes;

      const nodeToClone = nodes[nodeIndex];

      // Get the next count for this action type
      const actionId = nodeToClone.data.actionId;
      if (!nodeCountRef.current[actionId]) {
        nodeCountRef.current[actionId] = 0;
      }
      nodeCountRef.current[actionId]++;

      const newNode = {
        ...nodeToClone,
        id: `${actionId}-${nodeCountRef.current[actionId]}`,
        position: {
          x: nodeToClone.position.x,
          // Position it below the existing node with some offset
          y: nodeToClone.position.y + 150,
        },
      };

      // Insert the new node after the cloned node
      const newNodes = [...nodes];
      newNodes.splice(nodeIndex + 1, 0, newNode);

      // Shift down any nodes that are below the cloned node
      for (let i = nodeIndex + 2; i < newNodes.length; i++) {
        if (newNodes[i].position.y >= nodeToClone.position.y) {
          newNodes[i] = {
            ...newNodes[i],
            position: {
              ...newNodes[i].position,
              y: newNodes[i].position.y + 150,
            },
          };
        }
      }

      return newNodes;
    });
  }, []);

  const handleRenameNode = useCallback((nodeId: string, newName: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newName } }
          : node
      )
    );
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      // Get the ordered nodes to find the position of the node being deleted
      const orderedNodes = getOrderedNodes();
      const nodeIndex = orderedNodes.findIndex((node) => node.id === nodeId);

      // Find incoming and outgoing edges
      const incomingEdge = edges.find((edge) => edge.target === nodeId);
      const outgoingEdge = edges.find((edge) => edge.source === nodeId);

      // If we have both incoming and outgoing connections, reconnect them
      if (incomingEdge && outgoingEdge) {
        const newEdge: Edge = {
          id: `${incomingEdge.source}-${outgoingEdge.target}`,
          source: incomingEdge.source,
          target: outgoingEdge.target,
          type: "custom",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        };

        // Remove old edges and add the new connection
        setEdges((edges) =>
          edges
            .filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
            .concat(newEdge)
        );
      } else {
        // Just remove any connected edges
        setEdges((edges) =>
          edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          )
        );
      }

      // Remove the node
      setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));

      // Update zapData - remove the action at the corresponding index
      if (nodeIndex !== -1) {
        setZapData((prev) => {
          const updatedActions = [...prev.actions];
          updatedActions.splice(nodeIndex, 1); // Remove the action
          return {
            ...prev,
            actions: updatedActions,
          };
        });
      }
    },
    [edges, getOrderedNodes]
  );

  const handleSave = useCallback(() => {
    // Now we can use the structured zapData for saving
    console.log("Saving zap:", zapData);

    // Here you would make your API call with zapData
    // Example:
    // fetch('http://your-backend/api/zaps', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     name: zapName,
    //     ...zapData
    //   }),
    // });
  }, [zapName, zapData]);

  const handleAddNodeBelow = (
    nodeId: string,
    position: { x: number; y: number }
  ) => {
    // Check if this is the first node - if so, we can only add actions
    const node = nodes.find((n) => n.id === nodeId);
    const isFirstNode = node?.type === "trigger";

    setSelectedNodeId(nodeId);

    // Show the appropriate modal based on whether this is a trigger or action
    if (isFirstNode) {
      // If it's the trigger node, we can only add actions below it
      setShowAppModal(true);
    } else {
      setShowAppModal(true);
    }
  };

  const handleAppSelect = (appId: string) => {
    if (!selectedNodeId) return;

    // Find the parent node
    const parentNode = nodes.find((node) => node.id === selectedNodeId);
    if (!parentNode) return;

    // Find the app details
    const app = apps.find((app) => app.id === appId);
    if (!app) return;

    // Find the next node in the flow (if any)
    const childEdge = edges.find((edge) => edge.source === selectedNodeId);
    const childNodeId = childEdge?.target;

    // Get ordered nodes for index calculations
    const orderedNodes = getOrderedNodes();
    const parentIndex = orderedNodes.findIndex(
      (node) => node.id === selectedNodeId
    );

    // Create new node position (200 pixels below parent)
    const newNodePosition = {
      x: parentNode.position.x,
      y: parentNode.position.y + 200,
    };

    // Create new node
    const newNode: Node = {
      id: `${appId}-${Date.now()}`,
      type: app.category === "trigger" ? "trigger" : "action",
      position: newNodePosition,
      data: {
        label: app.name,
        actionId: app.id,
        actionName: app.name,
      },
    };

    // Create edge from parent to new node
    const newEdge1: Edge = {
      id: `${selectedNodeId}-${newNode.id}`,
      source: selectedNodeId,
      target: newNode.id,
      type: "custom",
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };

    let newEdges = [newEdge1];
    let updatedNodes = [...nodes, newNode];

    // If there's a child node, connect new node to it and shift all subsequent nodes down
    if (childNodeId) {
      // Create edge from new node to child node
      const newEdge2: Edge = {
        id: `${newNode.id}-${childNodeId}`,
        source: newNode.id,
        target: childNodeId,
        type: "custom",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      // Add the new edge
      newEdges.push(newEdge2);

      // Remove the original edge between parent and child
      const edgesToKeep = edges.filter(
        (edge) =>
          !(edge.source === selectedNodeId && edge.target === childNodeId)
      );

      // Shift all nodes below the insertion point down
      updatedNodes = nodes.map((node) => {
        // If this node is below the parent node, shift it down
        if (node.position.y > parentNode.position.y && node.id !== newNode.id) {
          return {
            ...node,
            position: {
              x: node.position.x,
              y: node.position.y + 200, // Shift down by the same amount as the spacing
            },
          };
        }
        return node;
      });
      updatedNodes.push(newNode);

      // Update edges state to include new edges and remove the original edge
      setEdges([...edgesToKeep, ...newEdges]);
    } else {
      // If there's no child node, just add the new edge
      setEdges((prevEdges) => [...prevEdges, ...newEdges]);
    }

    // Update nodes state
    setNodes(updatedNodes);

    // Update zapData state - insert the new action at the correct position
    setZapData((prev) => {
      const updatedActions = [...prev.actions];
      const newAction = {
        availableActionId: app.id, // Use the app ID directly
        actionMetadata: {
          message: app.name,
        },
      };

      // Insert the new action after the parent node's index
      updatedActions.splice(parentIndex + 1, 0, newAction);

      return {
        ...prev,
        actions: updatedActions,
      };
    });

    setShowAppModal(false);
    setSelectedNodeId(null);
  };

  const handleCreateFlow = () => {
    // Ask for confirmation if there are existing nodes
    if (nodes.length > 0) {
      setConfirmDialogProps({
        title: "Create New Flow",
        message: "Starting a new flow will clear your current work. Continue?",
        onConfirm: () => {
          // Clear the localStorage draft
          clearLocalStorageDraft();
          // Show the trigger selection modal to start a new flow
          setShowTriggerModal(true);
          setShowConfirmDialog(false);
        },
      });
      setShowConfirmDialog(true);
    } else {
      // Show the trigger selection modal to start a new flow
      setShowTriggerModal(true);
    }
  };

  const handleTriggerSelect = (triggerId: string) => {
    // Find the trigger app
    const triggerApp = apps.find((app) => app.id === triggerId);
    if (!triggerApp) return;

    // Create a new trigger node at a centered position
    const newTriggerNode: Node = {
      id: `${triggerId}-${Date.now()}`,
      type: "trigger",
      position: { x: 250, y: 100 },
      data: {
        label: triggerApp.name,
        actionId: triggerId,
        actionName: triggerApp.name,
      },
    };

    // Clear existing nodes and start with just the new trigger
    setNodes([newTriggerNode]);
    setEdges([]);

    // Update zapData
    setZapData({
      zapName: zapName,
      availableTriggerId: triggerId, // Use the actual selected trigger ID
      triggerMetadata: { message: triggerApp.name },
      actions: [],
    });

    setShowTriggerModal(false);
  };

  // Handler for updating node metadata
  const handleMetadataChange = useCallback(
    (nodeId: string, newMetadata: Record<string, any>) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            // Create a new data object with only the properties that are being updated
            const updatedData = { ...node.data };

            // Only update the properties that were passed in newMetadata
            Object.keys(newMetadata).forEach((key) => {
              updatedData[key] = newMetadata[key];
            });

            return {
              ...node,
              data: updatedData,
            };
          }
          return node;
        })
      );
    },
    []
  );

  // Add a handler for clicking a node in the sidebar
  const handleSidebarNodeClick = useCallback(
    (nodeId: string) => {
      setActiveNodeId(nodeId);

      // Find the node
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        // Set as selected node
        setSelectedNodeId(nodeId);
        setSelectedNode(node);

        // Enter metadata editing mode
        setIsEditingMetadata(true);

        // Update nodes to add highlight to the selected node
        setNodes(
          nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              isSelected: n.id === nodeId,
            },
          }))
        );
      }
    },
    [nodes, setNodes]
  );

  // Handler for node click in the canvas
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setActiveNodeId(node.id);
    setSelectedNodeId(node.id);
    setSelectedNode(node);
    setIsEditingMetadata(true);
  }, []);

  // Go back to flow view from metadata panel
  const handleBackToFlow = useCallback(() => {
    setIsEditingMetadata(false);
    setSelectedNode(null);
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push("/signin");
    }
  }, [router]);

  // Function to map action IDs to valid backend UUIDs
  const mapActionIdToBackendId = (actionId: string): string => {
    // Map string-based IDs to valid UUIDs
    switch (actionId) {
      case "gmail":
        return "7fbe85fc-5a12-4103-8d00-264f117aaf37"; // Using Slack's UUID as placeholder
      case "discord":
        return "f4b74660-98e4-46b3-856a-1b4b1423c722"; // Using Email's UUID as placeholder
      // Add more mappings as needed
      default:
        // If it's already a UUID format (contains hyphens), return as is
        if (actionId.includes("-")) {
          return actionId;
        }
        // For any other non-UUID action ID, use a default valid UUID
        // In a real implementation, you'd have a complete mapping for all possible actionIds
        console.warn(`No UUID mapping found for actionId: ${actionId}`);
        return "103b134a-4dac-46a3-a4c3-621e9ffcfd79"; // Ethereum as default fallback
    }
  };

  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);

        // Restore zap name
        if (parsedData.zapName) {
          setZapName(parsedData.zapName);
        }

        // Restore nodes and edges if they exist
        if (parsedData.nodes && parsedData.nodes.length > 0) {
          setNodes(parsedData.nodes);
        }

        if (parsedData.edges && parsedData.edges.length > 0) {
          setEdges(parsedData.edges);
        }

        // Restore zapData
        if (parsedData.zapData) {
          setZapData(parsedData.zapData);
        }

        // Set last saved time if available
        if (parsedData.lastModified) {
          const date = new Date(parsedData.lastModified);
          const formattedTime = `${date.getHours()}:${date
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
          setLastSaved(formattedTime);
        }

        console.log("Restored data from localStorage:", parsedData);
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  }, []);

  // Save zap data to localStorage whenever it changes
  useEffect(() => {
    try {
      // Skip saving if there are no nodes (empty flow)
      if (nodes.length === 0) return;

      const now = new Date();
      const lastModified = now.toISOString();
      const formattedTime = `${now.getHours()}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      setLastSaved(formattedTime);

      const dataToSave = {
        zapName,
        nodes,
        edges,
        zapData,
        lastModified,
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      console.log("Saved data to localStorage");
    } catch (error) {
      console.error("Error saving data to localStorage:", error);
    }
  }, [zapName, nodes, edges, zapData]);

  // Function to clear localStorage draft
  const clearLocalStorageDraft = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  // Function to save the zap to the backend
  const saveZapToBackend = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      // Get token directly to verify it exists
      const token = getToken();

      // Check if user is logged in
      if (!token) {
        router.push("/signin");
        throw new Error("Please log in to create a zap");
      }

      // Extract trigger node (first node)
      const triggerNode = nodes.find((node) => node.type === "trigger");

      if (!triggerNode) {
        throw new Error("No trigger node found in the flow");
      }

      // Get ordered nodes (actions only)
      const orderedNodes = getOrderedNodes();
      const actionNodes = orderedNodes.filter(
        (node) => node.type !== "trigger"
      );

      // Map trigger ID to ensure it's a valid UUID
      const mappedTriggerId = mapActionIdToBackendId(triggerNode.data.actionId);

      // Log for debugging
      console.log("Original trigger ID:", triggerNode.data.actionId);
      console.log("Mapped trigger ID:", mappedTriggerId);

      // Format the data according to the backend requirements
      const payload = {
        zapName: zapName,
        availableTriggerId: mappedTriggerId,
        triggerMetadata: {
          message: triggerNode.data.metadata || "",
        },
        actions: actionNodes.map((node) => {
          // Map each action ID to ensure it's a valid UUID
          const mappedActionId = mapActionIdToBackendId(node.data.actionId);

          // Log for debugging
          console.log("Node:", node.id);
          console.log("Original action ID:", node.data.actionId);
          console.log("Mapped action ID:", mappedActionId);

          return {
            availableActionId: mappedActionId,
            actionMetadata: {
              message: node.data.metadata || "",
            },
          };
        }),
      };

      console.log(
        "Sending payload to backend:",
        JSON.stringify(payload, null, 2)
      );

      // Make the API call using the auth headers utility
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_CREATE), {
        method: "POST",
        headers: getAuthHeaders(false), // Pass false to omit "Bearer" prefix
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401) {
          router.push("/signin");
          throw new Error("Authentication failed. Please log in again.");
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Failed to create the zap";
        console.error("Backend error:", errorData);
        throw new Error(errorMessage);
      }

      // Success - clear localStorage draft since it's now saved to backend
      clearLocalStorageDraft();

      // Success - show notification
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error creating zap:", error);
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Update zapData.zapName when zapName changes
  useEffect(() => {
    setZapData((prevData) => ({
      ...prevData,
      zapName: zapName,
    }));
  }, [zapName]);

  // Function to clear the current draft completely
  const clearDraft = useCallback(() => {
    setConfirmDialogProps({
      title: "Clear Draft",
      message:
        "Are you sure you want to clear your current work? This cannot be undone.",
      onConfirm: () => {
        // Clear localStorage
        clearLocalStorageDraft();

        // Reset editor state
        setNodes([]);
        setEdges([]);
        setZapName("Untitled Zap");
        setZapData({
          zapName: "Untitled Zap",
          availableTriggerId: "aac0e619-2094-4589-badc-fe487834f705",
          triggerMetadata: {},
          actions: [],
        });

        // Reset other state values
        setIsEditingMetadata(false);
        setSelectedNode(null);
        setActiveNodeId(null);
        setSelectedNodeId(null);
        setShowConfirmDialog(false);
      },
    });
    setShowConfirmDialog(true);
  }, [clearLocalStorageDraft]);

  return (
    <div className="flex flex-col h-[85vh] bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-yellow-600/30 shrink-0">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={zapName}
            onChange={(e) => setZapName(e.target.value)}
            className="bg-transparent border-none text-xl font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-yellow-600/50 rounded px-2"
            placeholder="Enter Zap Name"
          />
          {lastSaved && (
            <div className="text-xs text-zinc-500 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Draft saved at {lastSaved}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearDraft}
            className="px-4 py-1.5 bg-red-800/50 text-white font-mono font-bold rounded hover:bg-red-700/70 transition-colors"
          >
            Clear Draft
          </button>
          <button
            onClick={handleCreateFlow}
            className="px-4 py-1.5 bg-purple-600 text-white font-mono font-bold rounded hover:bg-purple-500 transition-colors"
          >
            New Flow
          </button>
          <div className="flex items-center">
            {/* Feedback messages */}
            {saveSuccess && (
              <div className="mr-4 py-1 px-3 bg-green-900/30 border border-green-700 rounded text-green-400 text-sm flex items-center">
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
                  className="mr-1.5"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Zap created successfully!
              </div>
            )}

            {saveError && (
              <div className="mr-4 py-1 px-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm flex items-center">
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
                  className="mr-1.5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {saveError}
              </div>
            )}

            <button
              onClick={saveZapToBackend}
              disabled={isSaving || nodes.length === 0}
              className={`px-4 py-1.5 bg-yellow-600 text-black font-mono font-bold rounded flex items-center ${
                isSaving || nodes.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-yellow-500"
              } transition-colors`}
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
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
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Create Zap
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Flow Editor */}
        <div className="flex-[3_3_0%] h-full overflow-hidden">
          <FlowEditor
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            onDuplicateNode={handleDuplicateNode}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onAddNodeBelow={handleAddNodeBelow}
            onNodeClick={handleNodeClick}
          />

          {/* Existing Node Selection Modal */}
          {isAddingNode && (
            <div
              className="absolute backdrop-blur-sm bg-black/30 inset-0 flex items-center justify-center z-10"
              onClick={() => setIsAddingNode(false)}
            >
              <div
                className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl w-[500px]"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Add Action
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      className="flex items-center p-4 border border-zinc-700 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                      onClick={() =>
                        handleAddQuickAction(action.id, action.name)
                      }
                    >
                      <div className="w-10 h-10 mr-3 bg-zinc-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-yellow-500">
                          {action.id.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {action.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    onClick={() => setIsAddingNode(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Modal */}
          {showAppModal && (
            <Modal
              title="Add an Action to Your Flow"
              onClose={() => setShowAppModal(false)}
              className="w-[700px]"
            >
              <div className="p-6">
                {/* Search Input */}
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Search actions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-full text-white px-6 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  />
                </div>

                {/* Apps Grid */}
                <div className="grid grid-cols-5 gap-3">
                  {filteredActions.length > 0 ? (
                    filteredActions.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        onClick={() => handleAppSelect(app.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-5 text-center py-8 text-zinc-400">
                      No actions match your search. Try a different term.
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {/* Trigger Modal */}
          {showTriggerModal && (
            <Modal
              title="Select a Trigger for Your Flow"
              onClose={() => setShowTriggerModal(false)}
              className="w-[700px]"
            >
              <div className="p-6">
                {/* Search Input */}
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Search triggers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-full text-white px-6 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                  />
                </div>

                {/* Trigger message */}
                <div className="mb-6 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
                  <div className="flex items-center text-purple-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 mr-2"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span>
                      A trigger is the first step in your flow that initiates
                      the automation
                    </span>
                  </div>
                </div>

                {/* Triggers Grid */}
                <div className="grid grid-cols-5 gap-3">
                  {filteredTriggers.length > 0 ? (
                    filteredTriggers.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        onClick={() => handleTriggerSelect(app.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-5 text-center py-8 text-zinc-400">
                      No triggers match your search. Try a different term.
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </div>

        {/* Right Sidebar - Conditionally show ZapFlowSidebar or MetadataPanel */}
        <div className="w-1/4 h-full overflow-hidden">
          {isEditingMetadata && selectedNode ? (
            <MetadataPanel
              node={selectedNode}
              onBack={handleBackToFlow}
              onMetadataChange={handleMetadataChange}
            />
          ) : (
            <ZapFlowSidebar
              nodes={nodes}
              edges={edges}
              onNodeClick={handleSidebarNodeClick}
              activeNodeId={activeNodeId}
              onAddNodeBelow={handleAddNodeBelow}
              onCreateFlow={handleCreateFlow}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmDialogProps.onConfirm}
        title={confirmDialogProps.title}
        message={confirmDialogProps.message}
      />
    </div>
  );
};

export default ZapEditor;
