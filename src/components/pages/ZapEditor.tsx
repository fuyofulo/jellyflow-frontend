"use client";

import React, {
  useCallback,
  useState,
  useRef,
  FC,
  useEffect,
  useTransition,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
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
import { getBackendUrl, getWebhookUrl } from "@/utils/environment";

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

// Update the component to use forwardRef
const ZapEditor = forwardRef<
  { handleCustomNavigation: (url: string) => void },
  ZapEditorProps
>(
  (
    {
      isEditMode: initialIsEditMode = false,
      zapId: initialZapId = "",
      initialZapData = null,
    },
    ref
  ) => {
    // Define zapId here, at the top level of the component
    let zapId = initialZapId;

    // Add logging for props
    console.log("ZapEditor initialized with props:", {
      initialIsEditMode,
      initialZapId,
      initialZapData,
    });

    // State declarations
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
    // Add a state to track the created zap ID from webhook trigger selection
    const [createdZapId, setCreatedZapId] = useState<string | null>(null);

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

    // First, add a useRef to store the last valid selected node
    const selectedNodeIdRef = useRef<string | null>(null);

    // Add new state variables for navigation confirmation
    const [showNavigationDialog, setShowNavigationDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(
      null
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Add a state to keep track of whether the zap has been published
    const [isZapPublished, setIsZapPublished] = useState(false);

    // Expose the navigation handler via the ref
    useImperativeHandle(
      ref,
      () => ({
        handleCustomNavigation: (url: string) => {
          if (hasUnsavedChanges) {
            setPendingNavigation(url);
            setShowNavigationDialog(true);
          } else {
            router.push(url);
          }
        },
      }),
      [hasUnsavedChanges, router]
    );

    // Add a special handler that will be called when the app modal is opened
    const openAppModalWithNode = useCallback(
      (nodeId: string) => {
        console.log(`Opening app modal with node ID: ${nodeId}`, {
          nodeExists: !!nodes.find((node) => node.id === nodeId),
          currentShowAppModal: showAppModal,
        });

        try {
          // Store the node ID in both state and ref
          setSelectedNodeId(nodeId);
          selectedNodeIdRef.current = nodeId;

          // Open the modal - make sure this comes after setting the node ID
          setShowAppModal(true);

          console.log(
            "App modal opened successfully, selectedNodeId set to:",
            nodeId
          );
        } catch (error) {
          console.error("Error opening app modal:", error);
        }
      },
      [nodes, showAppModal]
    );

    // Initialize editor with existing zap data if in edit mode
    useEffect(() => {
      if (isEditMode && initialZapData) {
        console.log("Initializing editor with zap data:", initialZapData);
        console.log("Initial actions:", initialZapData.actions);

        // Set the zap name
        setZapName(initialZapData.zapName || "Untitled Zap");

        // Initialize nodes and edges
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Add trigger node if it exists
        if (initialZapData.trigger) {
          const triggerId = "trigger";
          const triggerMetadata = initialZapData.trigger.metadata || {};

          const triggerNode: Node = {
            id: triggerId,
            type: "trigger",
            position: { x: 250, y: 50 },
            data: {
              label: initialZapData.trigger.type?.name || "Webhook Trigger",
              actionId: initialZapData.AvailableTriggerId || "",
              actionName: initialZapData.trigger.type?.name || "Webhook",
              metadata: {
                description:
                  triggerMetadata.description ||
                  initialZapData.trigger.type?.name ||
                  "",
                message: triggerMetadata.message || "",
              },
              onRename: (newName: string) =>
                handleRenameNode(triggerId, newName),
              onDelete: () => handleDeleteNode(triggerId),
              onAddNodeBelow: handleAddNodeBelow,
              isSelected: triggerId === activeNodeId,
            },
          };
          newNodes.push(triggerNode);
          console.log("Added trigger node:", triggerId, triggerNode);
        }

        // Add action nodes with increased spacing
        if (initialZapData.actions && initialZapData.actions.length > 0) {
          console.log("Processing actions:", initialZapData.actions);

          // Filter out any actions with null or undefined actionId or type
          const validActions = initialZapData.actions.filter(
            (action: any) => action && action.actionId && action.type
          );

          if (validActions.length !== initialZapData.actions.length) {
            console.warn(
              `Filtered out ${
                initialZapData.actions.length - validActions.length
              } invalid actions`
            );
          }

          const sortedActions = [...validActions].sort(
            (a: any, b: any) => a.sortingOrder - b.sortingOrder
          );
          console.log("Sorted actions:", sortedActions);

          let previousNodeId = "trigger";

          sortedActions.forEach((action: any, index: number) => {
            const actionId = `action-${index}`;
            const yPosition = 250 + index * 200;
            const actionMetadata = action.metadata || {};
            console.log(`Processing action ${index}:`, action);

            // Make sure we have a valid actionId and type.name before adding the node
            if (!action.actionId || !action.type?.name) {
              console.warn(
                `Skipping action ${index} due to missing actionId or type.name:`,
                action
              );
              return;
            }

            const actionNode: Node = {
              id: actionId,
              type: "action",
              position: { x: 250, y: yPosition },
              data: {
                number: index + 1,
                label: action.type?.name || `Action ${index + 1}`,
                actionId: action.actionId || "",
                actionName: action.type?.name || `Action ${index + 1}`,
                metadata: {
                  description:
                    actionMetadata.description || action.type?.name || "",
                  message: actionMetadata.message || "",
                },
                onRename: (newName: string) =>
                  handleRenameNode(actionId, newName),
                onDelete: () => handleDeleteNode(actionId),
                onDuplicate: () => handleDuplicateNode(actionId),
                onAddNodeBelow: handleAddNodeBelow,
                isSelected: actionId === activeNodeId,
              },
            };
            newNodes.push(actionNode);
            console.log(`Added action node ${actionId}:`, actionNode);

            // Create edge connecting to previous node
            if (previousNodeId) {
              const edgeId = `e${previousNodeId}-${actionId}`;
              const edge: Edge = {
                id: edgeId,
                source: previousNodeId,
                target: actionId,
                type: "custom",
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
                data: {
                  onAddNode: handleAddNode,
                },
              };
              newEdges.push(edge);
              console.log(`Added edge ${edgeId}:`, edge);
            }

            previousNodeId = actionId;
          });
        }

        // Set the nodes and edges
        console.log("Final newNodes:", newNodes);
        console.log("Final newEdges:", newEdges);
        setNodes(newNodes);
        setEdges(newEdges);

        // Set the zapData with the initial values
        setZapData({
          zapName: initialZapData.zapName || "Untitled Zap",
          availableTriggerId: initialZapData.AvailableTriggerId,
          triggerMetadata: initialZapData.trigger?.metadata || {},
          actions:
            initialZapData.actions
              ?.filter((action: any) => action && action.actionId)
              .map((action: any) => ({
                availableActionId: action.actionId,
                actionMetadata: action.metadata || {},
              })) || [],
        });
      }
    }, [isEditMode, initialZapData, activeNodeId]);

    // Load available actions and triggers from backend
    useEffect(() => {
      const loadServices = async () => {
        try {
          console.log("Starting to load services...");
          const [actions, triggers] = await Promise.all([
            fetchAvailableActions(),
            fetchAvailableTriggers(),
          ]);

          console.log("Raw actions from backend:", actions);
          console.log("Raw triggers from backend:", triggers);

          // Update available actions and triggers
          setAvailableActions(actions);
          setAvailableTriggers(triggers);

          // Update apps list
          updateApps(actions, triggers);

          // Log to verify we have data
          console.log("Loaded services:", {
            actions: actions.map((a) => ({ id: a.id, name: a.name })),
            triggers: triggers.map((t) => ({ id: t.id, name: t.name })),
          });
        } catch (error) {
          console.error("Failed to load services:", error);
        }
      };

      loadServices();
    }, []);

    // Combine available actions and triggers for the quick actions panel
    const quickActions = useMemo(() => {
      console.log("Recalculating quickActions...");
      console.log("Available triggers for quickActions:", availableTriggers);
      console.log("Available actions for quickActions:", availableActions);

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
        console.log("Using fallback quickActions");
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
      const result = [...formattedTriggers, ...formattedActions];
      console.log("Final quickActions:", result);
      return result;
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
        allTriggers = apps.filter(
          (app) => app.category === "trigger"
        ) as Array<{
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
      console.log("Recalculating filteredActions...");

      // Start with the backend actions if available
      let allActions = availableActions.map((action) => ({
        id: action.id,
        name: action.name.charAt(0).toUpperCase() + action.name.slice(1),
        description: `${action.name} action for your workflow`,
        category: "action" as const,
      }));

      // If no backend actions, fall back to the apps array
      if (allActions.length === 0) {
        console.log("No backend actions available, falling back to apps array");
        allActions = apps.filter((app) => app.category === "action") as Array<{
          id: string;
          name: string;
          description: string;
          category: "action";
        }>;
        console.log("Fallback actions from apps array:", allActions);
      } else {
        console.log("Using backend actions:", allActions);
      }

      // Apply search filtering
      if (!searchTerm.trim()) {
        console.log("No search term, returning all actions:", allActions);
        return allActions;
      }

      const term = searchTerm.toLowerCase();
      const filtered = allActions.filter(
        (app) =>
          app.name.toLowerCase().includes(term) ||
          (app.description && app.description.toLowerCase().includes(term)) ||
          app.category.toLowerCase().includes(term)
      );
      console.log("Filtered actions:", filtered);
      return filtered;
    }, [searchTerm, availableActions, apps]);

    // Helper function to get the ordered nodes based on connections
    const getOrderedNodes = useCallback(() => {
      console.log("Getting ordered nodes...");

      // Find starting node (trigger)
      const triggerNode = nodes.find((node) => node.type === "trigger");

      if (!triggerNode) {
        console.log("No trigger node found, returning empty array");
        return [];
      }

      // Start with the trigger node
      const orderedNodes = [triggerNode];

      // Find next node
      let currentNodeId = triggerNode.id;
      let visited = new Set([currentNodeId]);

      while (true) {
        // Find edge starting from current node
        const nextEdge = edges.find((edge) => edge.source === currentNodeId);

        if (!nextEdge) {
          // No more edges, we're done
          break;
        }

        // Get the target node
        const nextNodeId = nextEdge.target;

        // Check if we've already visited this node (cycle detection)
        if (visited.has(nextNodeId)) {
          console.warn("Cycle detected in flow, breaking the loop");
          break;
        }

        // Mark as visited
        visited.add(nextNodeId);

        // Find the node
        const nextNode = nodes.find((node) => node.id === nextNodeId);

        if (!nextNode) {
          console.warn(
            `Node with ID ${nextNodeId} not found, breaking the loop`
          );
          break;
        }

        // Add to ordered list
        orderedNodes.push(nextNode);

        // Move to next node
        currentNodeId = nextNodeId;
      }

      console.log("Final ordered nodes:", orderedNodes);

      // Log any nodes that aren't connected in the ordered flow
      const unconnectedNodes = nodes.filter(
        (node) =>
          !orderedNodes.some((orderedNode) => orderedNode.id === node.id)
      );

      if (unconnectedNodes.length > 0) {
        console.warn("Unconnected nodes found:", unconnectedNodes);
      }

      return orderedNodes;
    }, [nodes, edges]);

    // Update the useEffect hook that manages the zapData based on ordered nodes
    useEffect(() => {
      console.log("Nodes or edges changed, updating zapData...");

      const orderedNodes = getOrderedNodes();
      console.log("Ordered nodes:", orderedNodes);

      // Skip if there are no nodes
      if (orderedNodes.length === 0) {
        console.log("No nodes in the flow, skipping zapData update");
        return;
      }

      // Find the trigger node first
      const triggerNode = orderedNodes.find((node) => node.type === "trigger");

      if (!triggerNode) {
        console.log("No trigger node found, skipping zapData update");
        return;
      }

      const triggerId = triggerNode.data.actionId;
      console.log("Trigger node found with ID:", triggerId);

      // Get only action nodes (filter out the trigger)
      const actionNodes = orderedNodes.filter(
        (node) => node.type !== "trigger"
      );
      console.log("Action nodes:", actionNodes);

      // Create actions array, ensuring no action uses the trigger ID
      const actions = actionNodes.map((node) => {
        let actionId = node.data.actionId;

        // If action ID matches trigger ID, generate a new UUID
        if (actionId === triggerId) {
          console.warn(
            `Found action ID ${actionId} matching trigger ID. Generating new UUID.`
          );
          actionId = uuidv4();
          console.log(`Generated new action ID: ${actionId}`);

          // Update the node itself with the new ID to maintain consistency
          setNodes((prevNodes) =>
            prevNodes.map((n) => {
              if (n.id === node.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    actionId,
                  },
                };
              }
              return n;
            })
          );
        }

        return {
          availableActionId: actionId,
          actionMetadata: node.data.metadata || {
            description: node.data.label || "",
            message: "",
          },
        };
      });

      console.log("Final actions array for zapData:", actions);

      setZapData((prev) => ({
        ...prev,
        zapName: zapName,
        availableTriggerId: triggerId,
        triggerMetadata: triggerNode.data.metadata || {
          description: triggerNode.data.label || "",
          message: "",
        },
        actions,
      }));
    }, [nodes, edges]);

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

    // Update handleNodesChange to not automatically open the metadata panel
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
      // Process the changes
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
    }, []);

    // Update handleEdgesChange to not affect the metadata panel
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      // Mark that we have unsaved changes
      setHasUnsavedChanges(true);
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

          // Create the new node with proper metadata structure
          const newNode: Node = {
            id: `${app.id}-${nodeCountRef.current[app.id]}`,
            type: app.category === "trigger" ? "trigger" : "action",
            position,
            data: {
              label: app.name,
              actionId: app.id,
              actionName: app.name,
              metadata: {
                description: app.description || app.name,
                message: "",
              },
            },
          };

          setNodes((nds) => [...nds, newNode]);

          // If this is the first node (a trigger), update the zapData
          if (nodes.length === 0) {
            setZapData({
              zapName: zapName,
              availableTriggerId: app.id,
              triggerMetadata: {
                description: app.description || app.name,
                message: "",
              },
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
            metadata: {
              description: "",
              message: "",
            },
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
          data: {
            onAddNode: handleAddNode,
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
          data: {
            onAddNode: handleAddNode,
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
          data: {
            ...nodeToClone.data,
            metadata: {
              description:
                nodeToClone.data.metadata?.description ||
                nodeToClone.data.label ||
                "",
              message:
                nodeToClone.data.metadata?.message ||
                nodeToClone.data.label ||
                "",
            },
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

    const handleRenameNode = useCallback(
      (nodeId: string, newName: string) => {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    label: newName,
                    metadata: {
                      description: newName,
                      message:
                        typeof node.data.metadata === "object"
                          ? node.data.metadata.message || ""
                          : "",
                    },
                  },
                }
              : node
          )
        );

        // Update the zapData for this node as well if needed
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          if (node.type === "trigger") {
            // Update trigger metadata in zapData
            setZapData((prevData) => ({
              ...prevData,
              triggerMetadata: {
                ...prevData.triggerMetadata,
                description: newName,
              },
            }));
          } else {
            // For actions, find its position in the ordered list and update
            const orderedNodes = getOrderedNodes();
            const nodeIndex = orderedNodes.findIndex((n) => n.id === nodeId);

            if (nodeIndex !== -1) {
              setZapData((prevData) => {
                const updatedActions = [...prevData.actions];
                if (updatedActions[nodeIndex]) {
                  updatedActions[nodeIndex] = {
                    ...updatedActions[nodeIndex],
                    actionMetadata: {
                      ...updatedActions[nodeIndex].actionMetadata,
                      description: newName,
                    },
                  };
                }
                return {
                  ...prevData,
                  actions: updatedActions,
                };
              });
            }
          }
        }
      },
      [nodes, getOrderedNodes]
    );

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
            data: {
              onAddNode: handleAddNode,
            },
          };

          // Remove old edges and add the new connection
          setEdges((edges) =>
            edges
              .filter(
                (edge) => edge.source !== nodeId && edge.target !== nodeId
              )
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

    // Fix the handleAddNodeBelow function to use the new opener
    const handleAddNodeBelow = (
      nodeId: string,
      position: { x: number; y: number }
    ) => {
      // Check if this is the first node - if so, we can only add actions
      const node = nodes.find((n) => n.id === nodeId);

      if (!node) {
        console.error(
          `Cannot add node below ${nodeId} - node not found in nodes array`
        );
        // If the node doesn't exist and we have any nodes, use the last node as fallback
        if (nodes.length > 0) {
          const lastNode = nodes[nodes.length - 1];
          console.log(`Using last node ${lastNode.id} as fallback`);
          nodeId = lastNode.id;
        } else {
          console.error("No nodes available to add below");
          return;
        }
      }

      const isFirstNode = node?.type === "trigger";

      console.log(`handleAddNodeBelow: Setting selectedNodeId to: ${nodeId}`);

      // Use the new opener function
      openAppModalWithNode(nodeId);
    };

    // Fix the handleAppSelect function to handle the case when parent node is not found
    const handleAppSelect = async (appId: string) => {
      console.log("App selected:", appId);
      console.log(
        "All available actions:",
        availableActions.map((a) => ({ id: a.id, name: a.name }))
      );

      // Get the selectedNodeId from state or ref
      const nodeId = selectedNodeId || selectedNodeIdRef.current;

      console.log(
        "Current nodes:",
        nodes.map((n) => ({ id: n.id, type: n.type }))
      );
      console.log(`Selected node ID before fallback: ${nodeId}`);

      // Make sure we have a selectedNodeId
      if (!nodeId) {
        console.error("No selected node ID when selecting app");

        // Try using activeNodeId as a fallback if available
        if (activeNodeId) {
          console.log(
            `Using activeNodeId ${activeNodeId} as fallback for selectedNodeId`
          );
          setSelectedNodeId(activeNodeId);
          selectedNodeIdRef.current = activeNodeId;
        } else if (nodes.length > 0) {
          // If we have any nodes, use the last one
          const lastNodeId = nodes[nodes.length - 1].id;
          console.log(
            `Using last node ${lastNodeId} as fallback for selectedNodeId`
          );
          setSelectedNodeId(lastNodeId);
          selectedNodeIdRef.current = lastNodeId;
        } else {
          console.error("No nodes available to add an action to");
          setShowAppModal(false);
          return;
        }
      }

      // Re-get the selectedNodeId in case we just set it from a fallback
      const currentSelectedNodeId =
        nodeId ||
        activeNodeId ||
        (nodes.length > 0 ? nodes[nodes.length - 1].id : "");

      // If we still don't have a valid node ID, we can't proceed
      if (!currentSelectedNodeId) {
        console.error("No valid node ID available to add a node below");
        setShowAppModal(false);
        return;
      }

      // Log all node IDs for debugging
      console.log(
        "All node IDs:",
        nodes.map((n) => n.id)
      );
      console.log(`Looking for node with ID: ${currentSelectedNodeId}`);

      // Find the parent node
      let parentNode = nodes.find((node) => node.id === currentSelectedNodeId);

      // If parent node is not found, try to recover
      if (!parentNode) {
        console.error("Parent node not found:", currentSelectedNodeId);

        // Try to find a node that starts with the same prefix
        const nodePrefix = currentSelectedNodeId.split("-")[0]; // Get prefix like "node"
        const similarNodes = nodes.filter((n) => n.id.startsWith(nodePrefix));

        if (similarNodes.length > 0) {
          // Use the first similar node found
          parentNode = similarNodes[0];
          console.log(`Using similar node instead: ${parentNode.id}`);
          // Update the refs
          setSelectedNodeId(parentNode.id);
          selectedNodeIdRef.current = parentNode.id;
        } else if (nodes.length > 0) {
          // If no similar nodes, fall back to the last node
          parentNode = nodes[nodes.length - 1];
          console.log(`Falling back to last node: ${parentNode.id}`);
          // Update the refs
          setSelectedNodeId(parentNode.id);
          selectedNodeIdRef.current = parentNode.id;
        } else {
          console.error(
            "No nodes available to recover from missing parent node"
          );
          setShowAppModal(false);
          return;
        }
      }

      console.log(`Using parent node:`, parentNode);

      // Get the trigger node and ID
      const triggerNode = nodes.find((node) => node.type === "trigger");
      const triggerId = triggerNode?.data?.actionId;

      console.log("Trigger ID to avoid:", triggerId);

      // Check if the selected app ID matches the trigger ID
      let appIdToUse = appId;
      if (triggerId && appIdToUse === triggerId) {
        console.warn(
          "Selected app ID matches trigger ID. Generating a new UUID..."
        );
        // If it's the same as trigger ID, explicitly generate a new ID
        appIdToUse = uuidv4();
        console.log("Generated new app ID to avoid conflict:", appIdToUse);
      }

      // Find the app details first in availableActions
      let app = availableActions.find((action) => action.id === appIdToUse);
      let appData;

      if (app) {
        // Convert from AvailableAction to App format
        appData = {
          id: app.id, // This is already the correct UUID from backend
          name: app.name.charAt(0).toUpperCase() + app.name.slice(1),
          description: `${app.name} action`,
          category: "action",
        };
        console.log("Using backend action data:", appData);
      } else {
        // If not found in availableActions, check if it's a hardcoded action ID
        console.log(
          "Could not find app in availableActions, checking hardcoded IDs..."
        );
        // Fallback to apps array
        appData = apps.find((a) => a.id === appIdToUse);

        // Try selecting a different action if needed
        if (!appData && availableActions.length > 0) {
          // Select any action that isn't the trigger
          const differentAction = availableActions.find(
            (action) => action.id !== triggerId
          );

          if (differentAction) {
            console.log("Selected alternative action:", differentAction);
            appData = {
              id: differentAction.id,
              name:
                differentAction.name.charAt(0).toUpperCase() +
                differentAction.name.slice(1),
              description: `${differentAction.name} action`,
              category: "action",
            };
          }
        }

        if (!appData) {
          // Create a generic app with the provided ID if nothing found
          console.log(
            "No matching app found, creating generic app with ID:",
            appIdToUse
          );
          appData = {
            id: appIdToUse,
            name: "Custom Action",
            description: "Custom action for your workflow",
            category: "action",
          };
        }
      }

      // Double check that we're not using the trigger ID for the action
      // Safety check to ensure the final appData doesn't have the same ID as trigger
      if (triggerId && appData.id === triggerId) {
        console.warn(
          "Final app ID still matches trigger ID. Generating new UUID."
        );
        const newId = uuidv4();
        appData = {
          ...appData,
          id: newId,
        };
        console.log("Using generated ID to avoid conflict:", newId);
      }

      // Get ordered nodes for index calculations
      const orderedNodes = getOrderedNodes();
      const parentIndex = orderedNodes.findIndex(
        (node) => node.id === currentSelectedNodeId
      );

      // Create new node position with fallback if parentNode is still not valid
      let newNodePosition;
      try {
        if (parentNode && parentNode.position) {
          newNodePosition = {
            x: parentNode.position.x,
            y: parentNode.position.y + 200,
          };
        } else {
          throw new Error("Invalid parent node or position");
        }
      } catch (error) {
        console.error(
          "Error accessing parent node position, using default:",
          error
        );
        // Use a default position in the middle of the screen if we can't get the parent position
        newNodePosition = {
          x: 350,
          y: 350,
        };
      }

      // Generate a simple unique ID for the node - shorter is less error-prone
      const nodeUniqueId = `node-${uuidv4().substring(0, 8)}`;
      console.log(`Generated unique node ID: ${nodeUniqueId}`);

      // Create new node with proper metadata structure
      const newNode: Node = {
        id: nodeUniqueId,
        type: "action",
        position: newNodePosition,
        data: {
          label: appData.name,
          actionId: appData.id,
          actionName: appData.name,
          metadata: {
            description: appData.description || appData.name,
            message: "",
          },
        },
      };

      console.log("Creating new node with actionId:", newNode.data.actionId);
      console.log("New node complete data:", newNode);

      // Update nodes and edges state
      let updatedNodes = [...nodes, newNode];
      let newEdges = [];

      // Create edge from parent to new node
      const newEdge1: Edge = {
        id: `${currentSelectedNodeId}-${newNode.id}`,
        source: currentSelectedNodeId,
        target: newNode.id,
        type: "custom",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      newEdges.push(newEdge1);

      // Find any existing child node
      const childEdge = edges.find(
        (edge) => edge.source === currentSelectedNodeId
      );
      const childNodeId = childEdge?.target;

      console.log(`Child edge found: ${childEdge ? "true" : "false"}`);
      if (childNodeId) {
        console.log(`Existing child node ID: ${childNodeId}`);

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
        newEdges.push(newEdge2);

        // Remove the original edge between parent and child
        const edgesToKeep = edges.filter(
          (edge) =>
            !(
              edge.source === currentSelectedNodeId &&
              edge.target === childNodeId
            )
        );

        // Shift all nodes below the insertion point down
        updatedNodes = nodes.map((node) => {
          if (
            node.position.y > parentNode.position.y &&
            node.id !== newNode.id
          ) {
            return {
              ...node,
              position: {
                x: node.position.x,
                y: node.position.y + 200,
              },
            };
          }
          return node;
        });
        updatedNodes.push(newNode);

        // Update edges state
        setEdges([...edgesToKeep, ...newEdges]);
      } else {
        // If there's no child node, just add the new edge
        setEdges((prevEdges) => [...prevEdges, ...newEdges]);
      }

      // Update nodes state
      setNodes(updatedNodes);

      // Update zapData state with the new action
      const updatedZapData = (prev: any) => {
        const updatedActions = [...prev.actions];
        const newAction = {
          availableActionId: appData.id,
          actionMetadata: {
            description: appData.description || appData.name,
            message: "",
          },
        };

        console.log("Adding new action with ID:", newAction.availableActionId);

        // Verify one more time that this action ID is not a duplicate of the trigger ID
        if (triggerId && newAction.availableActionId === triggerId) {
          console.warn(
            "Still found action ID matching trigger. Generating final UUID."
          );
          newAction.availableActionId = uuidv4();
          console.log("Final action ID:", newAction.availableActionId);
        }

        // Insert the new action after the parent node's index
        updatedActions.splice(parentIndex + 1, 0, newAction);

        return {
          ...prev,
          actions: updatedActions,
        };
      };

      setZapData(updatedZapData);

      // Close the app modal and reset selection
      setShowAppModal(false);
      setSelectedNodeId(null);
      setActiveNodeId(null);
      setSelectedNode(null);
      setIsEditingMetadata(false);

      console.log("Node added, returned to flow sidebar");
    };

    const handleCreateFlow = () => {
      // Ask for confirmation if there are existing nodes
      if (nodes.length > 0) {
        setConfirmDialogProps({
          title: "Create New Flow",
          message:
            "Starting a new flow will clear your current work. Continue?",
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

    const handleTriggerSelect = async (triggerId: string) => {
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

      // Special handling for webhook triggers - create a zap with a webhook URL
      let webhookUrl = null;
      let newZapId = null;

      if (
        triggerId === "webhook" ||
        triggerApp.name.toLowerCase().includes("webhook")
      ) {
        try {
          // Get the webhook URL
          const webhookBaseUrl = getWebhookUrl();

          // Get auth token
          const token = getToken();
          if (!token) {
            throw new Error("Please log in to generate a webhook URL");
          }

          // Find the correct trigger ID for webhook
          const webhookTriggerId =
            backendTrigger?.id ||
            availableTriggers.find((t) =>
              t.name.toLowerCase().includes("webhook")
            )?.id ||
            "91877190-6508-490f-b445-f33ef7b308ce"; // Fallback ID

          // Create a new zap with webhook trigger to get a webhook URL
          const response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_CREATE), {
            method: "POST",
            headers: getAuthHeaders(false),
            body: JSON.stringify({
              zapName: zapName || "Webhook Zap",
              availableTriggerId: webhookTriggerId,
              triggerMetadata: {
                description: triggerApp.description || "Webhook trigger",
                message: "",
              },
              actions: [],
              isPublished: false, // Set the zap as unpublished
            }),
          });

          if (!response.ok) {
            console.error("Failed to create webhook zap:", response.statusText);
          } else {
            const data = await response.json();
            console.log("Webhook zap created:", data);

            // Extract zapId and userId from the response
            newZapId = data.zap?.id;
            const userId = data.zap?.userId;

            // Store the created zapId
            if (newZapId) {
              setCreatedZapId(newZapId);
              // Also set the zapId variable for later use
              zapId = newZapId;
              // Update to edit mode since we now have a real zap
              setIsEditMode(true);
              // Update URL without navigation
              window.history.pushState({}, "", `/edit/${newZapId}`);
            }

            if (newZapId && userId) {
              // Ensure the webhook URL doesn't end with a slash
              const cleanWebhookUrl = webhookBaseUrl.replace(/\/$/, "");

              // Construct the webhook URL
              webhookUrl = `${cleanWebhookUrl}/webhook/catch/${userId}/${newZapId}`;
              console.log("Generated webhook URL:", webhookUrl);
            }
          }
        } catch (error) {
          console.error("Error creating webhook zap:", error);
        }
      } else {
        // For non-webhook triggers, we'll create the zap on publish
        setCreatedZapId(null);
        setIsEditMode(false);
      }

      // Create a new trigger node with proper metadata structure
      const newTriggerNode: Node = {
        id: `${triggerId}-${Date.now()}`,
        type: "trigger",
        position: { x: 250, y: 100 },
        data: {
          label: triggerApp.name,
          actionId: triggerId,
          actionName: triggerApp.name,
          metadata: {
            description:
              triggerApp.description || `Trigger: ${triggerApp.name}`,
            message: "",
            // Add webhook configuration if a URL was generated
            ...(webhookUrl && {
              webhook: {
                url: webhookUrl,
                method: "POST",
                headers: {},
                requireAuthToken: false,
                description: triggerApp.description || "Webhook trigger",
                urlGenerated: true,
                setupCompleted: true,
                testCompleted: false,
                requiresAuth: false,
                authToken: "",
              },
            }),
          },
        },
      };

      console.log("Creating new trigger node:", newTriggerNode);

      // Clear existing nodes and start with just the new trigger
      setNodes([newTriggerNode]);
      setEdges([]);

      // Update zapData with proper metadata
      setZapData({
        zapName: zapName,
        availableTriggerId: triggerId,
        triggerMetadata: {
          description: triggerApp.description || `Trigger: ${triggerApp.name}`,
          message: "",
          // Include webhook data in triggerMetadata if available
          ...(webhookUrl && {
            webhook: {
              url: webhookUrl,
              method: "POST",
              requireAuthToken: false,
              urlGenerated: true,
            },
          }),
        },
        actions: [],
      });

      setShowTriggerModal(false);
    };

    // Handler for updating node metadata
    const handleMetadataChange = useCallback(
      (nodeId: string, newMetadata: Record<string, any>) => {
        // Update the node data
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

        // Also update the zapData structure with the updated metadata
        // Find the node to determine if it's a trigger or action
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          if (node.type === "trigger") {
            // Update trigger metadata
            setZapData((prevData) => ({
              ...prevData,
              triggerMetadata: {
                ...prevData.triggerMetadata,
                description: newMetadata.description || newMetadata.label || "",
                message: newMetadata.message || "",
              },
            }));
          } else {
            // For actions, find its position in the ordered list and update the corresponding action
            const orderedNodes = getOrderedNodes();
            const nodeIndex = orderedNodes.findIndex((n) => n.id === nodeId);

            if (nodeIndex !== -1) {
              setZapData((prevData) => {
                const updatedActions = [...prevData.actions];
                if (updatedActions[nodeIndex]) {
                  updatedActions[nodeIndex] = {
                    ...updatedActions[nodeIndex],
                    actionMetadata: {
                      ...updatedActions[nodeIndex].actionMetadata,
                      description:
                        newMetadata.description || newMetadata.label || "",
                      message: newMetadata.message || "",
                    },
                  };
                }
                return {
                  ...prevData,
                  actions: updatedActions,
                };
              });
            }
          }
        }
      },
      [nodes, getOrderedNodes]
    );

    // Fix the handleNodeClick function to explicitly show metadata panel only when clicked
    const handleNodeClick = useCallback(
      (event: React.MouseEvent, node: Node) => {
        const nodeId = node.id;
        console.log(`Node clicked: ${nodeId}`);

        // Set this node as the active node
        setActiveNodeId(nodeId);

        // Also store in selectedNode ref for potential use later
        selectedNodeIdRef.current = nodeId;

        // Store the full node object for metadata editing
        setSelectedNode(node);
        setIsEditingMetadata(true);

        console.log(`Set activeNodeId to: ${nodeId}, metadata panel opened`);
      },
      []
    );

    // Handler for when a node is clicked in the sidebar
    const handleSidebarNodeClick = useCallback(
      (nodeId: string) => {
        console.log(`Sidebar node clicked: ${nodeId}`);

        // Find the node to ensure it exists
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) {
          console.error(
            `Node with ID ${nodeId} not found when clicked in sidebar`
          );
          return;
        }

        // Set this node as the active node
        setActiveNodeId(nodeId);

        // Also store in selectedNode ref for potential use later
        selectedNodeIdRef.current = nodeId;

        // Store the full node object for metadata editing
        setSelectedNode(node);
        setIsEditingMetadata(true);

        console.log(`Set activeNodeId to: ${nodeId}, metadata panel opened`);
      },
      [nodes]
    );

    // Go back to flow view from metadata panel
    const handleBackToFlow = useCallback(() => {
      setIsEditingMetadata(false);
      console.log("Returned to flow sidebar view");
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
      console.log(`Mapping actionId: ${actionId} to backend ID`);

      // Map string-based IDs to valid UUIDs
      switch (actionId) {
        case "gmail":
          return "7fbe85fc-5a12-4103-8d00-264f117aaf37"; // Gmail UUID
        case "discord":
          return "f4b74660-98e4-46b3-856a-1b4b1423c722"; // Discord UUID
        case "slack":
          return "7d43f025-4326-4fe0-b0f0-de07263bb81a"; // Slack UUID
        case "email":
          return "38e06a55-35de-4bdc-92ad-7a25f1d19b9d"; // Email UUID
        case "webhook":
          return "91877190-6508-490f-b445-f33ef7b308ce"; // Webhook UUID
        case "ethereum":
          return "103b134a-4dac-46a3-a4c3-621e9ffcfd79"; // Ethereum UUID
        // Add more mappings as needed
        default:
          // If it's already a UUID format (contains hyphens), return as is
          if (actionId.includes("-")) {
            console.log(
              `ActionId ${actionId} is already a UUID format, using as is`
            );
            return actionId;
          }

          // For any unmapped IDs, generate a new UUID instead of using a default
          // This prevents potential conflicts with other actions
          console.warn(`No UUID mapping found for actionId: ${actionId}`);
          const newUuid = uuidv4();
          console.log(
            `Generated new UUID ${newUuid} for unmapped actionId: ${actionId}`
          );
          return newUuid;
      }
    };

    // Function to clear localStorage draft
    const clearLocalStorageDraft = useCallback(() => {
      // No longer storing drafts in localStorage
    }, []);

    // Update the clearDraft function to better handle errors
    const clearDraft = useCallback(() => {
      setConfirmDialogProps({
        title: "Clear Draft",
        message:
          "Are you sure you want to clear your current work? This cannot be undone.",
        onConfirm: async () => {
          setIsClearing(true);
          try {
            // First check if we have a zap ID (either from props or created during this session)
            const currentZapId = zapId || createdZapId;

            if (currentZapId) {
              console.log(`Deleting zap with ID: ${currentZapId} from backend`);

              // Log the exact API URL for debugging
              const apiUrl = buildApiUrl(
                API_ENDPOINTS.ZAP_DELETE(currentZapId)
              );
              console.log("DELETE API URL:", apiUrl);

              // Delete from backend
              const response = await fetch(apiUrl, {
                method: "POST",
                headers: getAuthHeaders(false),
              });

              // Capture the raw response text for debugging
              const responseText = await response.text();
              console.log("DELETE Response status:", response.status);
              console.log(
                "DELETE Response headers:",
                Object.fromEntries([...response.headers.entries()])
              );
              console.log("DELETE Response text:", responseText);

              if (!response.ok) {
                throw new Error(
                  `Failed to delete zap: ${
                    response.status
                  } ${responseText.substring(0, 100)}...`
                );
              }

              console.log("Zap deleted successfully from backend");

              // Navigate to dashboard after successful deletion
              router.push("/dashboard");
              return; // Exit early after redirection
            }

            // If no zapId, just clear the local state
            console.log("No zapId available, just clearing local state");

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
          } catch (error: any) {
            console.error("Error clearing/deleting draft:", error);
            setSaveError(`Failed to clear draft: ${error.message}`);
            setTimeout(() => setSaveError(null), 5000);

            // Even on error, clear the local state and redirect to dashboard
            setShowConfirmDialog(false);
            router.push("/dashboard");
          } finally {
            setIsClearing(false);
          }
        },
      });
      setShowConfirmDialog(true);
    }, [zapId, createdZapId, router]);

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

        // Get the current nodes and edges
        console.log("Current nodes before save:", nodes);

        // Make sure we have a trigger node
        const triggerNode = nodes.find((node) => node.type === "trigger");
        if (!triggerNode) {
          throw new Error("No trigger node found in the flow");
        }

        // Get ordered nodes (to ensure proper action order)
        const orderedNodes = getOrderedNodes();
        console.log("Ordered nodes before save:", orderedNodes);

        // Get only the action nodes
        const actionNodes = orderedNodes.filter(
          (node) => node.type !== "trigger"
        );
        console.log("Action nodes to be saved:", actionNodes);

        // Get the trigger ID that will be used
        const mappedTriggerId = triggerNode.data.actionId;
        console.log("Using trigger ID for save:", mappedTriggerId);

        // Handle both object and string metadata formats for trigger
        const triggerMetadata =
          typeof triggerNode.data.metadata === "object"
            ? triggerNode.data.metadata
            : {
                description: triggerNode.data.label || "",
                message: triggerNode.data.metadata || "",
              };

        // Create the actions array, ensuring no action uses the trigger ID
        const actionsWithUniqueIds = actionNodes.map((node) => {
          let mappedActionId = node.data.actionId;

          // If action ID matches trigger ID, generate a new UUID
          if (mappedActionId === mappedTriggerId) {
            console.warn(
              `Found action ID ${mappedActionId} matching trigger ID during save. Generating new UUID.`
            );
            mappedActionId = uuidv4();
            console.log(`Generated new action ID for save: ${mappedActionId}`);
          }

          // Handle both object and string metadata formats for actions
          const actionMetadata =
            typeof node.data.metadata === "object"
              ? node.data.metadata
              : {
                  description: node.data.label || "",
                  message: node.data.metadata || "",
                };

          return {
            availableActionId: mappedActionId,
            actionMetadata: {
              description: actionMetadata.description || node.data.label || "",
              message: actionMetadata.message || "",
            },
          };
        });

        // Properly include the metadata with both description and message
        const payload = {
          zapName: zapName,
          availableTriggerId: mappedTriggerId,
          triggerMetadata: {
            description:
              triggerMetadata.description || triggerNode.data.label || "",
            message: triggerMetadata.message || "",
          },
          actions: actionsWithUniqueIds,
          // Add isPublished flag to the payload
          isPublished: true,
        };

        // Double-check once more for any duplicate IDs between trigger and actions
        const actionIds = payload.actions.map((a) => a.availableActionId);
        if (actionIds.includes(payload.availableTriggerId)) {
          console.error(
            "CRITICAL: Still found duplicate IDs between trigger and actions. Fixing..."
          );

          // Replace any actions that have the trigger ID with a new UUID
          payload.actions = payload.actions.map((action) => {
            if (action.availableActionId === payload.availableTriggerId) {
              const newId = uuidv4();
              console.log(
                `Fixing action with trigger ID by generating new ID: ${newId}`
              );
              return {
                ...action,
                availableActionId: newId,
              };
            }
            return action;
          });
        }

        console.log("Saving zap payload:", payload);
        console.log("Trigger ID in payload:", payload.availableTriggerId);
        console.log(
          "Action IDs in payload:",
          payload.actions.map((a) => a.availableActionId)
        );

        let response;
        let currentZapId = zapId || createdZapId;

        // If we're in edit mode or we have a createdZapId, use the EDIT endpoint
        if (isEditMode || currentZapId) {
          console.log(
            `Sending update to endpoint: ${API_ENDPOINTS.ZAP_EDIT(
              currentZapId!
            )}`
          );
          response = await fetch(
            buildApiUrl(API_ENDPOINTS.ZAP_EDIT(currentZapId!)),
            {
              method: "POST",
              headers: getAuthHeaders(false),
              body: JSON.stringify(payload),
            }
          );
        } else {
          // Only create a new zap if we don't have an ID yet (non-webhook triggers)
          console.log(
            `Sending create to endpoint: ${API_ENDPOINTS.ZAP_CREATE}`
          );
          response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_CREATE), {
            method: "POST",
            headers: getAuthHeaders(false),
            body: JSON.stringify(payload),
          });

          // If a new zap was created, extract its ID from the response
          if (response.ok) {
            try {
              const responseData = await response.json();
              if (responseData && responseData.data && responseData.data.id) {
                console.log(`New zap created with ID: ${responseData.data.id}`);
                setCreatedZapId(responseData.data.id);
              }
            } catch (parseError) {
              console.error("Error parsing response JSON:", parseError);
            }
          }
        }

        console.log("Response status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/signin");
            throw new Error("Authentication failed. Please log in again.");
          }

          // Try to get the error response
          let errorData;
          try {
            const errorText = await response.text();
            console.log("Raw error response:", errorText);
            errorData = JSON.parse(errorText);
          } catch (e) {
            console.log("Failed to parse error response");
            errorData = { message: "An unknown error occurred" };
          }

          const errorMessage =
            errorData.message ||
            (isEditMode || currentZapId
              ? "Failed to update the zap"
              : "Failed to create the zap");
          throw new Error(errorMessage);
        }

        // Store the response data including the new zap ID
        const responseData = await response.json();
        console.log("Response data:", responseData);
        const newZapId = responseData.zap?.id;

        // Update the published status if available in the response
        if (responseData.zap && responseData.zap.isPublished !== undefined) {
          setIsZapPublished(responseData.zap.isPublished);
          console.log(
            "Updated published status:",
            responseData.zap.isPublished
          );
        }

        // If this was our first time saving, update state to reflect we're in edit mode
        if (!isEditMode && newZapId) {
          setIsEditMode(true);
          setCreatedZapId(newZapId);
          window.history.pushState({}, "", `/edit/${newZapId}`);
        }

        setSaveDialogState((prev) => ({
          ...prev,
          isSuccess: true,
          newZapId: newZapId, // Store the new zap ID
        }));

        // After successful save
        setHasUnsavedChanges(false);

        // If it was published, update the state
        if (payload.isPublished) {
          setIsZapPublished(true);
        }
      } catch (error) {
        console.error(
          isEditMode || createdZapId
            ? "Error updating zap:"
            : "Error creating zap:",
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

    // Update the handleCloseSaveDialog function with endpoint logging
    const handleCloseSaveDialog = useCallback(
      (action?: "dashboard" | "stay") => {
        if (saveDialogState.isSuccess) {
          if (action === "dashboard") {
            // Use our custom navigation handler instead of direct router.push
            handleCustomNavigation("/dashboard");
          } else {
            // Staying on page - if we just created a new zap, transition to edit mode
            if (!isEditMode && saveDialogState.newZapId) {
              // Use async IIFE to handle async code within the callback
              (async () => {
                try {
                  // Fetch the newly created zap details
                  if (!saveDialogState.newZapId) {
                    throw new Error("No zap ID received from the server");
                  }

                  const zapDetailUrl = buildApiUrl(
                    API_ENDPOINTS.ZAP_DETAIL(saveDialogState.newZapId)
                  );
                  console.log("Fetching zap details from:", zapDetailUrl);

                  const response = await fetch(zapDetailUrl, {
                    headers: getAuthHeaders(false),
                  });

                  if (!response.ok) {
                    if (response.status === 401) {
                      handleCustomNavigation("/signin");
                      throw new Error(
                        "Authentication failed. Please log in again."
                      );
                    }
                    throw new Error("Failed to fetch new zap details");
                  }

                  const data = await response.json();
                  console.log("Raw API response for zap details:", data);

                  const zapData = data.zap; // The response includes the zap in a 'zap' property
                  console.log("Fetched zap data after save:", zapData);
                  console.log("Zap actions from API:", zapData.actions);

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
                  if (saveDialogState.newZapId) {
                    zapId = saveDialogState.newZapId;
                  }

                  // Initialize editor with the new zap data
                  const newNodes: Node[] = [];
                  const newEdges: Edge[] = [];

                  // Add trigger node if it exists
                  if (zapData.trigger) {
                    const triggerId = "trigger";
                    const triggerMetadata = zapData.trigger.metadata || {};

                    const triggerNode: Node = {
                      id: triggerId,
                      type: "trigger",
                      position: { x: 250, y: 50 },
                      data: {
                        label: zapData.trigger.type?.name || "Webhook Trigger",
                        actionId: zapData.AvailableTriggerId || "",
                        actionName: zapData.trigger.type?.name || "Webhook",
                        metadata: {
                          description:
                            triggerMetadata.description ||
                            zapData.trigger.type?.name ||
                            "",
                          message: triggerMetadata.message || "",
                        },
                        onRename: (newName: string) =>
                          handleRenameNode(triggerId, newName),
                        onDelete: () => handleDeleteNode(triggerId),
                        onAddNodeBelow: handleAddNodeBelow,
                        isSelected: triggerId === activeNodeId,
                      },
                    };
                    newNodes.push(triggerNode);
                    console.log(
                      "Added trigger node after save:",
                      triggerId,
                      triggerNode
                    );
                  }

                  // Add action nodes with proper sorting
                  if (zapData.actions && zapData.actions.length > 0) {
                    console.log(
                      "Processing actions after save:",
                      zapData.actions
                    );
                    const sortedActions = [...zapData.actions].sort(
                      (a, b) => a.sortingOrder - b.sortingOrder
                    );
                    console.log("Sorted actions after save:", sortedActions);

                    let previousNodeId = "trigger";
                    sortedActions.forEach((action, index) => {
                      const actionId = `action-${index}`;
                      const actionMetadata = action.metadata || {};
                      console.log(
                        `Processing action ${index} after save:`,
                        action
                      );

                      const actionNode: Node = {
                        id: actionId,
                        type: "action",
                        position: { x: 250, y: 250 + index * 200 },
                        data: {
                          number: index + 1,
                          label: action.type?.name || `Action ${index + 1}`,
                          actionId: action.actionId || "",
                          actionName:
                            action.type?.name || `Action ${index + 1}`,
                          metadata: {
                            description:
                              actionMetadata.description ||
                              action.type?.name ||
                              "",
                            message: actionMetadata.message || "",
                          },
                          onRename: (newName: string) =>
                            handleRenameNode(actionId, newName),
                          onDelete: () => handleDeleteNode(actionId),
                          onDuplicate: () => handleDuplicateNode(actionId),
                          onAddNodeBelow: handleAddNodeBelow,
                          isSelected: actionId === activeNodeId,
                        },
                      };
                      newNodes.push(actionNode);
                      console.log(
                        `Added action node ${actionId} after save:`,
                        actionNode
                      );

                      // Create edge connecting to previous node
                      const edge: Edge = {
                        id: `e${previousNodeId}-${actionId}`,
                        source: previousNodeId,
                        target: actionId,
                        type: "custom",
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
                        data: {
                          onAddNode: handleAddNode,
                        },
                      };
                      newEdges.push(edge);
                      console.log(`Added edge ${edge.id} after save:`, edge);
                      previousNodeId = actionId;
                    });
                  }

                  // Update the editor state
                  console.log("Final newNodes after save:", newNodes);
                  console.log("Final newEdges after save:", newEdges);
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

                  // Reset unsaved changes flag
                  setHasUnsavedChanges(false);
                } catch (error) {
                  console.error("Error fetching new zap details:", error);
                  setSaveError(
                    error instanceof Error
                      ? error.message
                      : "Failed to load the new zap details"
                  );
                }
              })();
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
        isEditMode,
        zapId,
        activeNodeId,
        handleRenameNode,
        handleDeleteNode,
        handleAddNodeBelow,
        handleDuplicateNode,
        setHasUnsavedChanges,
      ]
    );

    // ... existing code ...

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

    // Add the handleConfirmDelete function with improved error handling
    const handleConfirmDelete = useCallback(async () => {
      setDeleteDialogState((prev) => ({ ...prev, isLoading: true }));
      try {
        // Check for any available zap ID (either from props or created during this session)
        const currentZapId = zapId || createdZapId;

        if (!currentZapId) {
          console.log(
            "No zapId available - this zap likely only exists locally"
          );
          // Mark as success anyway so we can navigate back to dashboard
          setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));
          return;
        }

        // Log the exact API URL for debugging
        const apiUrl = buildApiUrl(API_ENDPOINTS.ZAP_DELETE(currentZapId));
        console.log("DELETE API URL:", apiUrl);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: getAuthHeaders(false),
        });

        // Capture the raw response text for debugging
        const responseText = await response.text();
        console.log("DELETE Response status:", response.status);
        console.log(
          "DELETE Response headers:",
          Object.fromEntries([...response.headers.entries()])
        );
        console.log("DELETE Response text:", responseText);

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/signin");
            throw new Error("Authentication failed. Please log in again.");
          }
          throw new Error(
            `Failed to delete zap: ${response.status} ${responseText.substring(
              0,
              100
            )}...`
          );
        }

        setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));
      } catch (error: any) {
        console.error("Error deleting zap:", error);
        setDeleteError(error.message || "Failed to delete zap");
        setShowDeleteDialog(false);

        // Even on error, redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } finally {
        setDeleteDialogState((prev) => ({ ...prev, isLoading: false }));
      }
    }, [zapId, createdZapId, router]);

    // Fix the handleCloseDeleteDialog function to always navigate to dashboard after successful deletion
    const handleCloseDeleteDialog = useCallback(
      (action?: "dashboard" | "stay") => {
        // If deletion was successful, always navigate to dashboard regardless of action parameter
        if (deleteDialogState.isSuccess) {
          setShowDeleteDialog(false);
          setDeleteDialogState({ isSuccess: false, isLoading: false });
          // Force navigation to dashboard
          router.push("/dashboard");
          return;
        }

        // Normal close behavior when not successful
        setShowDeleteDialog(false);
        setDeleteDialogState({ isSuccess: false, isLoading: false });

        if (action === "dashboard") {
          // Navigate directly instead of using handleCustomNavigation
          router.push("/dashboard");
        }
      },
      [deleteDialogState.isSuccess, router]
    );

    // Add logging to apps to check what might be used as fallback
    useEffect(() => {
      console.log("Current available hardcoded apps:", apps);
    }, []);

    // Add effect to restore selectedNodeId from ref if it gets cleared unexpectedly
    useEffect(() => {
      if (!selectedNodeId && selectedNodeIdRef.current) {
        console.log(
          `Restoring selectedNodeId from ref: ${selectedNodeIdRef.current}`
        );
        setSelectedNodeId(selectedNodeIdRef.current);
      }
    }, [selectedNodeId, showAppModal]);

    // Add a function to get diagnostic info for debugging
    const getDiagnosticInfo = useCallback(() => {
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        selectedNodeId,
        selectedNodeIdRef: selectedNodeIdRef.current,
        activeNodeId,
        showAppModal,
        isAddingNode,
        selectedNode: selectedNode?.id,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          actionId: n.data.actionId,
        })),
      };
    }, [
      nodes,
      edges,
      selectedNodeId,
      activeNodeId,
      showAppModal,
      isAddingNode,
      selectedNode,
    ]);

    // Log diagnostic info whenever showAppModal changes
    useEffect(() => {
      console.log("Modal visibility changed:", showAppModal);
      console.log("Diagnostic info:", getDiagnosticInfo());
    }, [showAppModal, getDiagnosticInfo]);

    // Add a useEffect to close metadata panel when nodes or edges change
    // This prevents metadata panel from staying open after a node is deleted
    useEffect(() => {
      if (isEditingMetadata) {
        // If the selected node no longer exists, close the metadata panel
        if (selectedNode && !nodes.some((n) => n.id === selectedNode.id)) {
          console.log("Selected node no longer exists, closing metadata panel");
          setIsEditingMetadata(false);
          setSelectedNode(null);
        }
      }
    }, [nodes, isEditingMetadata, selectedNode]);

    // Replace the useEffect for navigation handling with a cleaner approach
    useEffect(() => {
      // Add beforeunload event for browser close/refresh
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = ""; // This is needed for Chrome
          return "";
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      // Handle browser back/forward button with popstate
      const handlePopState = (event: PopStateEvent) => {
        if (hasUnsavedChanges) {
          // Prevent the navigation
          window.history.pushState(null, "", window.location.href);
          setShowNavigationDialog(true);
          setPendingNavigation(null); // We'll handle it manually
        }
      };
      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
      };
    }, [hasUnsavedChanges]);

    // Handle capturing click events on links
    useEffect(() => {
      // Function to handle document clicks
      const handleDocumentClick = (e: MouseEvent) => {
        // Check if the click was on an anchor tag
        let target = e.target as HTMLElement;

        // Try to find the closest anchor tag
        while (target && target.tagName !== "A") {
          if (target.parentElement) {
            target = target.parentElement;
          } else {
            break;
          }
        }

        // If we found an anchor tag and it's not an external link or a download
        if (
          target &&
          target.tagName === "A" &&
          target instanceof HTMLAnchorElement &&
          target.href &&
          target.href.startsWith(window.location.origin) &&
          !target.download &&
          !target.target
        ) {
          // This is an internal link, we should intercept it
          if (hasUnsavedChanges) {
            e.preventDefault();
            const url = target.href.replace(window.location.origin, "");

            // Don't block navigation to the same page
            if (
              (isEditMode && url === `/edit/${zapId}`) ||
              (!isEditMode && url === "/create")
            ) {
              return true;
            }

            setPendingNavigation(url);
            setShowNavigationDialog(true);
          }
        }
      };

      // Add the click event listener to the document
      document.addEventListener("click", handleDocumentClick);

      return () => {
        document.removeEventListener("click", handleDocumentClick);
      };
    }, [hasUnsavedChanges, isEditMode, zapId]);

    // Update the navigation attempt handler to be more robust
    const handleNavigationAttempt = (url: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(url);
        setShowNavigationDialog(true);
      } else {
        // No unsaved changes, navigate directly
        router.push(url);
      }
    };

    // Update the custom navigation handler to use our improved approach
    const handleCustomNavigation = (url: string) => {
      if (hasUnsavedChanges) {
        handleNavigationAttempt(url);
      } else {
        router.push(url);
      }
    };

    // Handler to confirm navigation with improved error handling
    const handleConfirmNavigation = async (
      action: "publish" | "discard" | "delete" | "save" | "cancel"
    ) => {
      try {
        if (action === "cancel") {
          // Just close the dialog, don't navigate
          setShowNavigationDialog(false);
          setPendingNavigation(null);
          return;
        }

        if (action === "publish") {
          // Publish the zap
          await saveZapToBackend();
          setHasUnsavedChanges(false);
        } else if (action === "save") {
          // Save as draft
          await saveZapToBackend();
          setHasUnsavedChanges(false);
        } else if (action === "delete") {
          // If we have a zapId, we need to delete it from the backend
          if (zapId || createdZapId) {
            const currentZapId = zapId || createdZapId;
            console.log(`Deleting zap with ID: ${currentZapId}`);

            // Log the exact API URL for debugging
            const apiUrl = buildApiUrl(API_ENDPOINTS.ZAP_DELETE(currentZapId!));
            console.log("DELETE API URL (navigation):", apiUrl);

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: getAuthHeaders(false),
            });

            // Capture the raw response text for debugging
            const responseText = await response.text();
            console.log("DELETE Response status:", response.status);
            console.log(
              "DELETE Response headers:",
              Object.fromEntries([...response.headers.entries()])
            );
            console.log("DELETE Response text:", responseText);

            if (!response.ok) {
              console.error(
                `Delete failed with status ${
                  response.status
                }: ${responseText.substring(0, 100)}...`
              );
            } else {
              console.log("Zap deleted successfully from navigation dialog");
            }
          } else {
            // If no zapId, just clear the local state
            console.log(
              "No zapId available in navigation dialog, just clearing local state"
            );
          }
          // Mark as no unsaved changes to allow navigation
          setHasUnsavedChanges(false);
        } else if (action === "discard") {
          // Do nothing, just allow navigation
          setHasUnsavedChanges(false);
        }

        // Now proceed with navigation if we have a pending URL
        if (pendingNavigation) {
          router.push(pendingNavigation);
        } else {
          // If no pending navigation, default to dashboard
          router.push("/dashboard");
        }

        // Clear the dialog and pending navigation
        setShowNavigationDialog(false);
        setPendingNavigation(null);
      } catch (error: any) {
        console.error("Error during navigation confirmation action:", error);
        alert(`Error: ${error.message || "An unknown error occurred"}`);

        // Even on error, we should close the dialog and redirect to dashboard
        setShowNavigationDialog(false);
        setPendingNavigation(null);
        router.push("/dashboard");
      }
    };

    // Add useEffect to detect if zap is published
    useEffect(() => {
      if (initialZapData) {
        // If we have initial data and it has a published status, use it
        setIsZapPublished(!!initialZapData.isPublished);
        console.log("Zap published status:", initialZapData.isPublished);
      }
    }, [initialZapData]);

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
                onClick={zapId || createdZapId ? handleDeleteZap : clearDraft}
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
                onClick={() => handleCustomNavigation("/dashboard")}
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
                  Publishing...
                </>
              ) : isSaving ? (
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
                  Publishing...
                </>
              ) : (
                <>Publish Zap</>
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
              onNodeClick={handleNodeClick} // This is now explicitly used to show metadata panel
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
                onClose={() => {
                  console.log(
                    "Closing app modal, selectedNodeId was:",
                    selectedNodeId
                  );
                  console.log(
                    "Ref selectedNodeId was:",
                    selectedNodeIdRef.current
                  );
                  setShowAppModal(false);
                  // Don't clear the selected node ID when closing - we may need it again
                  // setSelectedNodeId(null);
                }}
                className="w-[700px]"
              >
                <div className="p-6">
                  {/* Debug info */}
                  <div className="mb-2 p-2 bg-zinc-900 rounded text-xs text-yellow-500">
                    <div>
                      Selected Node:{" "}
                      {selectedNodeId || selectedNodeIdRef.current || "None"}
                    </div>
                    <div>Active Node: {activeNodeId || "None"}</div>
                    <div>Node Count: {nodes.length}</div>
                    <div>Node IDs: {nodes.map((n) => n.id).join(", ")}</div>
                  </div>

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
                          onClick={() => {
                            try {
                              // Get the full diagnostic state
                              const diagnostics = getDiagnosticInfo();
                              console.log(
                                "App card clicked, diagnostics:",
                                diagnostics
                              );

                              // Make sure we have a valid selectedNodeId before calling handleAppSelect
                              if (
                                !selectedNodeId &&
                                selectedNodeIdRef.current
                              ) {
                                console.log(
                                  `Restoring selectedNodeId before app selection: ${selectedNodeIdRef.current}`
                                );
                                setSelectedNodeId(selectedNodeIdRef.current);
                              }

                              // Verify that the selectedNodeId actually exists in nodes array
                              const nodeExists = nodes.some(
                                (n) =>
                                  n.id ===
                                  (selectedNodeId || selectedNodeIdRef.current)
                              );
                              if (!nodeExists) {
                                console.warn(
                                  "Selected node does not exist in nodes array!"
                                );

                                // Find a fallback node
                                if (nodes.length > 0) {
                                  const fallbackId = nodes[nodes.length - 1].id;
                                  console.log(
                                    `Using fallback node: ${fallbackId}`
                                  );
                                  setSelectedNodeId(fallbackId);
                                  selectedNodeIdRef.current = fallbackId;
                                }
                              }

                              console.log(
                                `App card clicked: ${app.id}, selectedNodeId: ${
                                  selectedNodeId || selectedNodeIdRef.current
                                }`
                              );
                              // Add a small delay to ensure state is updated
                              setTimeout(() => {
                                handleAppSelect(app.id);
                              }, 50); // Use a slightly longer delay to ensure state updates have propagated
                            } catch (error) {
                              console.error(
                                "Error in app card click handler:",
                                error
                              );
                              // Still try to proceed with app selection
                              handleAppSelect(app.id);
                            }
                          }}
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
          <div className="w-1/3 h-full overflow-hidden">
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
                onNodeClick={handleSidebarNodeClick} // This will show metadata on click
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
          onConfirm={
            deleteDialogState.isSuccess
              ? () => handleCloseDeleteDialog("dashboard")
              : handleConfirmDelete
          }
          onClose={() => handleCloseDeleteDialog()}
          confirmButtonText={
            deleteDialogState.isSuccess ? "Go to Dashboard" : "Delete"
          }
          closeButtonText="Cancel"
          showCloseButton={!deleteDialogState.isSuccess}
        />

        {/* Update the save confirmation dialog */}
        <ConfirmationDialog
          isOpen={showSaveDialog}
          title={saveDialogState.isSuccess ? "Success" : "Publishing Zap"}
          message={
            saveDialogState.isSuccess
              ? "Zap has been published successfully! What would you like to do next?"
              : "Publishing your zap..."
          }
          isSuccess={saveDialogState.isSuccess}
          isLoading={saveDialogState.isLoading}
          onConfirm={
            saveDialogState.isSuccess
              ? () => handleCloseSaveDialog("dashboard")
              : () => handleCloseSaveDialog()
          }
          onClose={() => handleCloseSaveDialog("stay")}
          confirmButtonText={
            saveDialogState.isSuccess ? "Go to Dashboard" : "OK"
          }
          closeButtonText={
            saveDialogState.isSuccess ? "Stay Here" : "Go to Dashboard"
          }
          showCloseButton={true}
        />

        {/* Navigation Confirmation Dialog */}
        {showNavigationDialog && (
          <Modal
            title={isZapPublished ? "Unsaved Changes" : "Save Draft?"}
            onClose={() => setShowNavigationDialog(false)}
            className="w-[500px]"
          >
            <div className="p-6">
              <p className="text-white mb-6">
                {isZapPublished
                  ? "You have unsaved changes to your published zap. What would you like to do?"
                  : "You haven't saved your draft. What would you like to do?"}
              </p>

              <div className="flex items-center justify-end space-x-4">
                <button
                  className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors"
                  onClick={() => setShowNavigationDialog(false)}
                >
                  Cancel
                </button>

                {isZapPublished ? (
                  <>
                    <button
                      className="px-4 py-2 bg-yellow-600 text-black rounded hover:bg-yellow-500"
                      onClick={() => handleConfirmNavigation("publish")}
                    >
                      Publish Changes
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                      onClick={() => handleConfirmNavigation("discard")}
                    >
                      Discard Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="px-4 py-2 bg-yellow-600 text-black rounded hover:bg-yellow-500"
                      onClick={() => handleConfirmNavigation("save")}
                    >
                      Save Draft
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                      onClick={() => handleConfirmNavigation("delete")}
                    >
                      Delete Draft
                    </button>
                  </>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }
);

export default ZapEditor;
