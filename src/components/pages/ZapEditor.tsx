"use client";

import React, {
  useCallback,
  useState,
  useRef,
  FC,
  useEffect,
  useTransition,
  useMemo,
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
import { apps, updateApps } from "@/utils/apps";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getToken, isAuthenticated, getAuthHeaders } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { useInitializeServices } from "@/utils/iconMapping";
import {
  fetchAvailableActions,
  fetchAvailableTriggers,
  AvailableAction,
  AvailableTrigger,
} from "@/utils/api/availableServices";
import { v4 as uuidv4 } from "uuid";
import ConfirmationDialog from "../ui/ConfirmationDialog";

// Define the App interface
interface App {
  id: string;
  name: string;
  description: string;
  category: "trigger" | "action";
}

// Node types for React Flow
const nodeTypes = {
  action: ActionNode,
  trigger: TriggerNode,
};

// Initial nodes for testing
const initialNodes: Node[] = [];

// Initial edges for testing
const initialEdges: Edge[] = [];

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

// Function to get default trigger ID - moved to top level
const getDefaultTriggerId = (availableTriggers: AvailableTrigger[]): string => {
  // If we already have triggers from the backend, use the first one
  if (availableTriggers.length > 0) {
    return availableTriggers[0].id;
  }

  // Otherwise use a placeholder that will be replaced when data is loaded
  return "webhook";
};

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
            Go to Dashboard
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

// Update the interface for Props
interface ZapEditorProps {
  isEditMode?: boolean;
  zapId?: string;
  initialZapData?: any;
}

const ZapEditor: FC<ZapEditorProps> = ({
  isEditMode: initialIsEditMode = false,
  zapId = "",
  initialZapData = null,
}) => {
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
  const [isEditMode, setIsEditMode] = useState(initialIsEditMode);

  // Add this state for structured data
  const [zapData, setZapData] = useState<ZapData>({
    zapName: "Untitled Zap",
    availableTriggerId: getDefaultTriggerId([]), // Use dynamic ID
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

  // Add this near the other state declarations
  const [isClearing, setIsClearing] = useState(false);

  // Add this new state for zap deletion
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogState, setDeleteDialogState] = useState({
    isSuccess: false,
    isLoading: false,
  });

  // Add this state for save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogState, setSaveDialogState] = useState<{
    isSuccess: boolean;
    isLoading: boolean;
    newZapId?: string;
  }>({
    isSuccess: false,
    isLoading: false,
    newZapId: undefined,
  });

  // Initialize services from backend
  useInitializeServices();

  // State for available actions and triggers from backend
  const [availableActions, setAvailableActions] = useState<AvailableAction[]>(
    []
  );
  const [availableTriggers, setAvailableTriggers] = useState<
    AvailableTrigger[]
  >([]);

  // Initialize editor with existing zap data if in edit mode
  useEffect(() => {
    if (isEditMode && initialZapData) {
      console.log("Initializing editor with zap data:", initialZapData);

      // Set the zap name
      setZapName(initialZapData.zapName || "Untitled Zap");

      // Initialize nodes and edges
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Add trigger node if it exists
      if (initialZapData.trigger) {
        const triggerId = "trigger";
        const triggerNode: Node = {
          id: triggerId,
          type: "trigger",
          position: { x: 250, y: 50 },
          data: {
            label: initialZapData.zapName || "Webhook Trigger",
            actionId: initialZapData.AvailableTriggerId,
            actionName: initialZapData.trigger.type?.name || "Webhook",
            metadata: initialZapData.trigger.metadata?.message || "",
            onRename: (newName: string) => handleRenameNode(triggerId, newName),
            onDelete: () => handleDeleteNode(triggerId),
            onAddNodeBelow: handleAddNodeBelow,
            isSelected: triggerId === activeNodeId,
          },
        };
        newNodes.push(triggerNode);
      }

      // Add action nodes with increased spacing
      if (initialZapData.actions && initialZapData.actions.length > 0) {
        const sortedActions = [...initialZapData.actions].sort(
          (a, b) => a.sortingOrder - b.sortingOrder
        );

        let previousNodeId = "trigger";

        sortedActions.forEach((action, index) => {
          const actionId = `action-${index}`;
          const yPosition = 250 + index * 200; // Changed from 200 to 250 to account for trigger at y=50

          const actionNode: Node = {
            id: actionId,
            type: "action",
            position: { x: 250, y: yPosition },
            data: {
              number: index + 1,
              label: action.type?.name || `Action ${index + 1}`,
              actionId: action.actionId,
              actionName: action.type?.name || `Action ${index + 1}`,
              metadata: action.metadata?.message || "",
              onRename: (newName: string) =>
                handleRenameNode(actionId, newName),
              onDelete: () => handleDeleteNode(actionId),
              onDuplicate: () => handleDuplicateNode(actionId),
              onAddNodeBelow: handleAddNodeBelow,
              isSelected: actionId === activeNodeId,
            },
          };
          newNodes.push(actionNode);

          // Create edge connecting to previous node
          if (previousNodeId) {
            const edgeId = `e${previousNodeId}-${actionId}`;
            const edge: Edge = {
              id: edgeId,
              source: previousNodeId,
              target: actionId,
              type: "smoothstep",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: "#888",
              },
              style: {
                strokeWidth: 2,
                stroke: "#888",
              },
            };
            newEdges.push(edge);
          }

          previousNodeId = actionId;
        });
      }

      // Set the nodes and edges
      setNodes(newNodes);
      setEdges(newEdges);

      // Set the zapData with the initial values
      setZapData({
        zapName: initialZapData.zapName || "Untitled Zap",
        availableTriggerId: initialZapData.AvailableTriggerId,
        triggerMetadata: initialZapData.trigger?.metadata || {},
        actions:
          initialZapData.actions?.map((action: any) => ({
            availableActionId: action.actionId,
            actionMetadata: action.metadata || {},
          })) || [],
      });
    }
  }, [isEditMode, initialZapData]);

  // Load available actions and triggers from backend
  useEffect(() => {
    const loadServices = async () => {
      try {
        const [actions, triggers] = await Promise.all([
          fetchAvailableActions(),
          fetchAvailableTriggers(),
        ]);

        // Update available actions and triggers
        setAvailableActions(actions);
        setAvailableTriggers(triggers);

        // Update apps list
        updateApps(actions, triggers);

        // Log to verify we have data
        console.log("Loaded services:", { actions, triggers });
      } catch (error) {
        console.error("Failed to load services:", error);
      }
    };

    loadServices();
  }, []);

  // Combine available actions and triggers for the quick actions panel
  const quickActions = useMemo(() => {
    // Transform triggers to the expected format
    const formattedTriggers = availableTriggers.map((trigger) => ({
      id: trigger.id,
      name: trigger.name.charAt(0).toUpperCase() + trigger.name.slice(1), // Capitalize first letter
      category: "Triggers",
    }));

    // Transform actions to the expected format
    const formattedActions = availableActions.map((action) => ({
      id: action.id,
      name: action.name.charAt(0).toUpperCase() + action.name.slice(1), // Capitalize first letter
      category: "Actions",
    }));

    // If no actions or triggers are available yet, provide fallbacks
    if (formattedTriggers.length === 0 && formattedActions.length === 0) {
      return [
        {
          id: "webhook",
          name: "Webhook",
          category: "Triggers",
        },
        {
          id: "email",
          name: "Email",
          category: "Actions",
        },
        {
          id: "slack",
          name: "Slack",
          category: "Actions",
        },
      ];
    }

    // Combine triggers and actions
    return [...formattedTriggers, ...formattedActions];
  }, [availableTriggers, availableActions]);

  // Update the filteredTriggers mapping
  const filteredTriggers = React.useMemo(() => {
    // Start with the backend triggers if available
    let allTriggers = availableTriggers.map((trigger) => ({
      id: trigger.id,
      name: trigger.name.charAt(0).toUpperCase() + trigger.name.slice(1),
      description: `${trigger.name} trigger for your workflow`,
      category: "trigger" as const,
    }));

    // If no backend triggers, fall back to the apps array
    if (allTriggers.length === 0) {
      allTriggers = apps.filter((app) => app.category === "trigger") as Array<{
        id: string;
        name: string;
        description: string;
        category: "trigger";
      }>;
    }

    // Apply search filtering
    if (!searchTerm.trim()) return allTriggers;

    const term = searchTerm.toLowerCase();
    return allTriggers.filter(
      (app) =>
        app.name.toLowerCase().includes(term) ||
        (app.description && app.description.toLowerCase().includes(term))
    );
  }, [searchTerm, availableTriggers, apps]);

  // Update the filteredActions mapping
  const filteredActions = React.useMemo(() => {
    // Start with the backend actions if available
    let allActions = availableActions.map((action) => ({
      id: action.id,
      name: action.name.charAt(0).toUpperCase() + action.name.slice(1),
      description: `${action.name} action for your workflow`,
      category: "action" as const,
    }));

    // If no backend actions, fall back to the apps array
    if (allActions.length === 0) {
      allActions = apps.filter((app) => app.category === "action") as Array<{
        id: string;
        name: string;
        description: string;
        category: "action";
      }>;
    }

    // Apply search filtering
    if (!searchTerm.trim()) return allActions;

    const term = searchTerm.toLowerCase();
    return allActions.filter(
      (app) =>
        app.name.toLowerCase().includes(term) ||
        (app.description && app.description.toLowerCase().includes(term)) ||
        app.category.toLowerCase().includes(term)
    );
  }, [searchTerm, availableActions, apps]);

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
          y: nodeToClone.position.y + 150, // Position it below the existing node with some offset
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
    console.log("App selected:", appId);

    if (!selectedNodeId) {
      console.error("No selected node ID when selecting app");
      return;
    }

    // Find the parent node
    const parentNode = nodes.find((node) => node.id === selectedNodeId);
    if (!parentNode) {
      console.error("Parent node not found:", selectedNodeId);
      return;
    }

    // Find the app details first in availableActions
    let app = availableActions.find((action) => action.id === appId);
    let appData;

    if (app) {
      // Convert from AvailableAction to App format
      appData = {
        id: app.id,
        name: app.name.charAt(0).toUpperCase() + app.name.slice(1),
        description: `${app.name} action`,
        category: "action",
      };
      console.log("Using backend action data:", appData);
    } else {
      // Fall back to apps array
      appData = apps.find((a) => a.id === appId);
      if (!appData) {
        console.error("App not found:", appId);
        return;
      }
    }

    console.log("Found app data:", appData);

    // Find the next node in the flow (if any)
    const childEdge = edges.find((edge) => edge.source === selectedNodeId);
    const childNodeId = childEdge?.target;

    // Get ordered nodes for index calculations
    const orderedNodes = getOrderedNodes();
    const parentIndex = orderedNodes.findIndex(
      (node) => node.id === selectedNodeId
    );

    // Create new node position (increase spacing from 200 to 300 pixels below parent)
    const newNodePosition = {
      x: parentNode.position.x,
      y: parentNode.position.y + 200, // Keep at 200px for consistency
    };

    // Create new node
    const newNode: Node = {
      id: `${appId}-${Date.now()}`,
      type: appData.category === "trigger" ? "trigger" : "action",
      position: newNodePosition,
      data: {
        label: appData.name,
        actionId: appData.id,
        actionName: appData.name,
      },
    };

    console.log("Creating new node:", newNode);

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

      // Shift all nodes below the insertion point down with increased spacing
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
        availableActionId: appData.id, // Use the app ID directly
        actionMetadata: {
          message: appData.name,
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
    console.log("Trigger selected:", triggerId);
    console.log("Available triggers:", availableTriggers);
    console.log("Available actions:", availableActions);
    console.log("Apps:", apps);

    // Find the trigger app in availableTriggers first (backend data)
    const backendTrigger = availableTriggers.find(
      (trigger) => trigger.id === triggerId
    );

    // If not found in backend data, try to find in the apps array
    let triggerApp = apps.find((app) => app.id === triggerId);

    if (!triggerApp && backendTrigger) {
      // Create a temporary app object from the backend trigger
      triggerApp = {
        id: backendTrigger.id,
        name:
          backendTrigger.name.charAt(0).toUpperCase() +
          backendTrigger.name.slice(1),
        description: `${backendTrigger.name} trigger`,
        category: "trigger",
      };
      console.log("Using backend trigger data:", triggerApp);
    }

    if (!triggerApp) {
      console.error("Trigger app not found for ID:", triggerId);
      // Create a fallback trigger app to avoid getting stuck
      triggerApp = {
        id: triggerId,
        name: "Webhook",
        description: "Webhook trigger",
        category: "trigger",
      };
    }

    // Create a new trigger node at a centered position with more initial spacing
    const newTriggerNode: Node = {
      id: `${triggerId}-${Date.now()}`,
      type: "trigger",
      position: { x: 250, y: 100 }, // Center trigger node at y=100
      data: {
        label: triggerApp.name,
        actionId: triggerId,
        actionName: triggerApp.name,
      },
    };

    console.log("Creating new trigger node:", newTriggerNode);

    // Clear existing nodes and start with just the new trigger
    setNodes([newTriggerNode]);
    setEdges([]);

    // Update zapData
    setZapData({
      zapName: zapName,
      availableTriggerId: triggerId,
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

  // Function to clear localStorage draft
  const clearLocalStorageDraft = useCallback(() => {
    // No longer storing drafts in localStorage
  }, []);

  // Update the clearDraft function
  const clearDraft = useCallback(() => {
    setConfirmDialogProps({
      title: "Clear Draft",
      message:
        "Are you sure you want to clear your current work? This cannot be undone.",
      onConfirm: async () => {
        setIsClearing(true);
        try {
          // Reset editor state
          setNodes([]);
          setEdges([]);
          setZapName("Untitled Zap");
          setZapData({
            zapName: "Untitled Zap",
            availableTriggerId: getDefaultTriggerId([]),
            triggerMetadata: {},
            actions: [],
          });

          // Reset other state values
          setIsEditingMetadata(false);
          setSelectedNode(null);
          setActiveNodeId(null);
          setSelectedNodeId(null);
          setShowConfirmDialog(false);

          // Show success message
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
          console.error("Error clearing draft:", error);
          setSaveError("Failed to clear draft. Please try again.");
          setTimeout(() => setSaveError(null), 3000);
        } finally {
          setIsClearing(false);
        }
      },
    });
    setShowConfirmDialog(true);
  }, []);

  // Update the saveZapToBackend function
  const saveZapToBackend = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      setSaveDialogState({ isSuccess: false, isLoading: true });
      setShowSaveDialog(true);

      const token = getToken();

      if (!token) {
        router.push("/signin");
        throw new Error("Please log in to create a zap");
      }

      const triggerNode = nodes.find((node) => node.type === "trigger");

      if (!triggerNode) {
        throw new Error("No trigger node found in the flow");
      }

      const orderedNodes = getOrderedNodes();
      const actionNodes = orderedNodes.filter(
        (node) => node.type !== "trigger"
      );

      const mappedTriggerId = mapActionIdToBackendId(triggerNode.data.actionId);

      const payload = {
        zapName: zapName,
        availableTriggerId: mappedTriggerId,
        triggerMetadata: {
          message: triggerNode.data.metadata || "",
        },
        actions: actionNodes.map((node) => {
          const mappedActionId = mapActionIdToBackendId(node.data.actionId);
          return {
            availableActionId: mappedActionId,
            actionMetadata: {
              message: node.data.metadata || "",
            },
          };
        }),
      };

      let response;

      if (isEditMode) {
        response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_EDIT(zapId)), {
          method: "POST",
          headers: getAuthHeaders(false),
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_CREATE), {
          method: "POST",
          headers: getAuthHeaders(false),
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/signin");
          throw new Error("Authentication failed. Please log in again.");
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          (isEditMode
            ? "Failed to update the zap"
            : "Failed to create the zap");
        throw new Error(errorMessage);
      }

      // Store the response data including the new zap ID
      const responseData = await response.json();
      const newZapId = responseData.zap?.id;

      setSaveDialogState((prev) => ({
        ...prev,
        isSuccess: true,
        newZapId: newZapId, // Store the new zap ID
      }));
    } catch (error) {
      console.error(
        isEditMode ? "Error updating zap:" : "Error creating zap:",
        error
      );
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setShowSaveDialog(false);
    } finally {
      setIsSaving(false);
      setSaveDialogState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Update the handleCloseSaveDialog function
  const handleCloseSaveDialog = useCallback(
    async (action?: "dashboard" | "stay") => {
      if (saveDialogState.isSuccess) {
        if (action === "dashboard") {
          router.push("/dashboard");
        } else {
          // If staying, and we just created a new zap, transition to edit mode
          if (!isEditMode && saveDialogState.newZapId) {
            try {
              // Fetch the newly created zap details
              const response = await fetch(
                buildApiUrl(API_ENDPOINTS.ZAP_DETAIL(saveDialogState.newZapId)),
                {
                  headers: getAuthHeaders(false),
                }
              );

              if (!response.ok) {
                if (response.status === 401) {
                  router.push("/signin");
                  throw new Error(
                    "Authentication failed. Please log in again."
                  );
                }
                throw new Error("Failed to fetch new zap details");
              }

              const data = await response.json();
              const zapData = data.zap; // The response includes the zap in a 'zap' property

              if (!zapData) {
                throw new Error("No zap data received from the server");
              }

              // Update the URL without triggering a navigation
              window.history.pushState(
                {},
                "",
                `/edit/${saveDialogState.newZapId}`
              );

              // Set edit mode and zap ID
              setIsEditMode(true);
              zapId = saveDialogState.newZapId;

              // Initialize editor with the new zap data
              const newNodes: Node[] = [];
              const newEdges: Edge[] = [];

              // Add trigger node if it exists
              if (zapData.trigger) {
                const triggerId = "trigger";
                const triggerNode: Node = {
                  id: triggerId,
                  type: "trigger",
                  position: { x: 250, y: 50 },
                  data: {
                    label: zapData.trigger.type?.name || "Webhook Trigger",
                    actionId: zapData.AvailableTriggerId,
                    actionName: zapData.trigger.type?.name || "Webhook",
                    metadata: zapData.trigger.metadata?.message || "",
                    onRename: (newName: string) =>
                      handleRenameNode(triggerId, newName),
                    onDelete: () => handleDeleteNode(triggerId),
                    onAddNodeBelow: handleAddNodeBelow,
                    isSelected: triggerId === activeNodeId,
                  },
                };
                newNodes.push(triggerNode);
              }

              // Add action nodes with proper sorting
              if (zapData.actions && zapData.actions.length > 0) {
                const sortedActions = [...zapData.actions].sort(
                  (a, b) => a.sortingOrder - b.sortingOrder
                );

                let previousNodeId = "trigger";
                sortedActions.forEach((action, index) => {
                  const actionId = `action-${index}`;
                  const actionNode: Node = {
                    id: actionId,
                    type: "action",
                    position: { x: 250, y: 250 + index * 200 },
                    data: {
                      number: index + 1,
                      label: action.type?.name || `Action ${index + 1}`,
                      actionId: action.actionId,
                      actionName: action.type?.name || `Action ${index + 1}`,
                      metadata: action.metadata?.message || "",
                      onRename: (newName: string) =>
                        handleRenameNode(actionId, newName),
                      onDelete: () => handleDeleteNode(actionId),
                      onDuplicate: () => handleDuplicateNode(actionId),
                      onAddNodeBelow: handleAddNodeBelow,
                      isSelected: actionId === activeNodeId,
                    },
                  };
                  newNodes.push(actionNode);

                  // Create edge connecting to previous node
                  const edge: Edge = {
                    id: `e${previousNodeId}-${actionId}`,
                    source: previousNodeId,
                    target: actionId,
                    type: "smoothstep",
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                      width: 20,
                      height: 20,
                      color: "#888",
                    },
                    style: {
                      strokeWidth: 2,
                      stroke: "#888",
                    },
                  };
                  newEdges.push(edge);
                  previousNodeId = actionId;
                });
              }

              // Update the editor state
              setNodes(newNodes);
              setEdges(newEdges);

              // Update zapData state
              setZapData({
                zapName: zapData.zapName || "Untitled Zap",
                availableTriggerId: zapData.AvailableTriggerId,
                triggerMetadata: zapData.trigger?.metadata || {},
                actions:
                  zapData.actions?.map((action: any) => ({
                    availableActionId: action.actionId,
                    actionMetadata: action.metadata || {},
                  })) || [],
              });
            } catch (error) {
              console.error("Error fetching new zap details:", error);
              setSaveError(
                error instanceof Error
                  ? error.message
                  : "Failed to load the new zap details"
              );
            }
          }

          // Close the dialog
          setShowSaveDialog(false);
          setSaveDialogState({
            isSuccess: false,
            isLoading: false,
            newZapId: undefined,
          });
        }
      } else {
        // If not success state, just close the dialog
        setShowSaveDialog(false);
        setSaveDialogState({
          isSuccess: false,
          isLoading: false,
          newZapId: undefined,
        });
      }
    },
    [
      saveDialogState.isSuccess,
      saveDialogState.newZapId,
      router,
      isEditMode,
      zapId,
      activeNodeId,
    ]
  );

  // Update zapData.zapName when zapName changes
  useEffect(() => {
    setZapData((prevData) => ({
      ...prevData,
      zapName: zapName,
    }));
  }, [zapName]);

  // Add this useEffect to update zapData.availableTriggerId when availableTriggers changes
  useEffect(() => {
    if (availableTriggers.length > 0) {
      setZapData((prevData) => ({
        ...prevData,
        availableTriggerId: getDefaultTriggerId(availableTriggers),
      }));
    }
  }, [availableTriggers]);

  // Add this at the beginning of the component to track renders
  useEffect(() => {
    console.log("ZapEditor rendering with:", {
      showTriggerModal,
      filteredTriggers: filteredTriggers.length,
      showAppModal,
      availableTriggers: availableTriggers.length,
      availableActions: availableActions.length,
    });
  }, [
    showTriggerModal,
    filteredTriggers,
    showAppModal,
    availableTriggers,
    availableActions,
  ]);

  // Add effect to update lastSaved timestamp when flow changes
  useEffect(() => {
    // Skip if there are no nodes (empty flow)
    if (nodes.length === 0) return;

    // Update the last saved indicator with current time
    const now = new Date();
    const formattedTime = `${now.getHours()}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // This now tracks "last modified" time rather than "last saved to localStorage"
    setLastSaved(formattedTime);
  }, [zapName, nodes, edges]);

  // Return to dashboard
  const handleCancelEdit = () => {
    router.push("/dashboard");
  };

  // Update the handleDeleteZap function
  const handleDeleteZap = useCallback(() => {
    setShowDeleteDialog(true);
    setDeleteDialogState({
      isSuccess: false,
      isLoading: false,
    });
  }, []);

  // Add the handleConfirmDelete function
  const handleConfirmDelete = useCallback(async () => {
    setDeleteDialogState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.ZAP_DELETE(zapId)),
        {
          method: "POST",
          headers: getAuthHeaders(false),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/signin");
          throw new Error("Authentication failed. Please log in again.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete zap");
      }

      setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));
    } catch (error) {
      console.error("Error deleting zap:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete zap"
      );
      setShowDeleteDialog(false);
    } finally {
      setDeleteDialogState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [zapId, router]);

  // Add the handleCloseDeleteDialog function
  const handleCloseDeleteDialog = useCallback(() => {
    if (deleteDialogState.isSuccess) {
      router.push("/dashboard");
    }
    setShowDeleteDialog(false);
    setDeleteDialogState({
      isSuccess: false,
      isLoading: false,
    });
  }, [deleteDialogState.isSuccess, router]);

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
                <path d="M12 6v6l4 2" />
              </svg>
              <span>Last saved: {lastSaved}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          {isEditMode && (
            <button
              className="px-4 py-2 border border-red-500 bg-zinc-800 text-red-500 rounded-md font-mono font-medium hover:bg-red-500/10 transition-colors flex items-center"
              onClick={handleDeleteZap}
              disabled={isDeleting || isSaving || isClearing}
            >
              {deleteDialogState.isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500"
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
                  Deleting...
                </>
              ) : (
                "Delete Zap"
              )}
            </button>
          )}
          {!isEditMode && (
            <button
              className="px-4 py-2 border border-red-500 bg-zinc-800 text-red-500 rounded-md font-mono font-medium hover:bg-red-500/10 transition-colors flex items-center"
              onClick={clearDraft}
              disabled={isClearing || isSaving}
            >
              {isClearing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500"
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
                  Clearing...
                </>
              ) : (
                "Clear Zap"
              )}
            </button>
          )}
          {isEditMode && (
            <button
              className="px-4 py-2 border border-gray-600 bg-zinc-800 text-gray-300 rounded-md font-mono font-medium hover:bg-zinc-700 transition-colors"
              onClick={() => router.push("/dashboard")}
              disabled={isSaving || isClearing || deleteDialogState.isLoading}
            >
              Go to Dashboard
            </button>
          )}
          <button
            className="px-4 py-2 bg-yellow-600 text-black rounded-md font-mono font-bold hover:bg-yellow-500 transition-colors flex items-center"
            onClick={saveZapToBackend}
            disabled={isSaving || isClearing || deleteDialogState.isLoading}
          >
            {deleteDialogState.isLoading ? (
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
                Updating...
              </>
            ) : (
              <>{isEditMode ? "Update Zap" : "Create Zap"}</>
            )}
          </button>
        </div>
      </div>

      {/* Success/Error Messages - Remove or keep only for non-save errors */}
      {saveError && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 bg-red-500 text-white font-mono">
          {saveError}
        </div>
      )}

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
                    Go to Dashboard
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
                        onClick={() => {
                          console.log(
                            "Trigger card clicked:",
                            app.id,
                            app.name
                          );
                          handleTriggerSelect(app.id);
                        }}
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

      {/* Add the confirmation dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title={deleteDialogState.isSuccess ? "Success" : "Delete Zap"}
        message={
          deleteDialogState.isSuccess
            ? "Zap has been deleted successfully!"
            : "Are you sure you want to delete this zap? This action cannot be undone."
        }
        isSuccess={deleteDialogState.isSuccess}
        isLoading={deleteDialogState.isLoading}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteDialog}
      />

      {/* Update the save confirmation dialog */}
      <ConfirmationDialog
        isOpen={showSaveDialog}
        title={
          saveDialogState.isSuccess
            ? "Success"
            : isEditMode
            ? "Updating Zap"
            : "Creating Zap"
        }
        message={
          saveDialogState.isSuccess
            ? isEditMode
              ? "Zap has been updated successfully!"
              : "Zap has been created successfully! What would you like to do next?"
            : isEditMode
            ? "Updating your zap..."
            : "Creating your zap..."
        }
        isSuccess={saveDialogState.isSuccess}
        isLoading={saveDialogState.isLoading}
        onConfirm={
          saveDialogState.isSuccess
            ? () => handleCloseSaveDialog("dashboard")
            : () => handleCloseSaveDialog()
        }
        onClose={() => handleCloseSaveDialog("stay")}
        confirmButtonText={saveDialogState.isSuccess ? "Go to Dashboard" : "OK"}
        closeButtonText={
          saveDialogState.isSuccess ? "Stay Here" : "Go to Dashboard"
        }
        showCloseButton={true}
      />
    </div>
  );
};

export default ZapEditor;
