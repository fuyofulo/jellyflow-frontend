"use client";

import React, { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomEdge from "./CustomEdge";

// Types
interface FlowEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  nodeTypes?: NodeTypes;
  onDuplicateNode?: (nodeId: string) => void;
  onRenameNode?: (nodeId: string, newName: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddNode?: (
    sourceId: string,
    targetId: string,
    position: { x: number; y: number }
  ) => void;
  onAddNodeBelow?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onDragOver,
  onDrop,
  nodeTypes,
  onDuplicateNode,
  onRenameNode,
  onDeleteNode,
  onAddNode,
  onAddNodeBelow,
  onNodeClick,
}) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [addNodePosition, setAddNodePosition] = useState({ x: 0, y: 0 });
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);

  // Custom edge types
  const edgeTypes = {
    custom: CustomEdge,
  };

  const handleAddNode = useCallback(
    (
      sourceId: string,
      targetId: string,
      position: { x: number; y: number }
    ) => {
      if (onAddNode) {
        onAddNode(sourceId, targetId, position);
      }
    },
    [onAddNode]
  );

  const handleAddNodeBelow = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (onAddNodeBelow) {
        onAddNodeBelow(nodeId, position);
      }
    },
    [onAddNodeBelow]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (!params.source || !params.target) return;

      const newEdge: Edge = {
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        source: params.source,
        target: params.target,
        type: "custom",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: {
          onAddNode: handleAddNode,
        },
      };
      onEdgesChange?.([{ type: "add", item: newEdge }]);
    },
    [onEdgesChange, handleAddNode]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);

      // Pass the event to the parent component if provided
      if (onNodeClick) {
        onNodeClick(event, node);
      }
    },
    [onNodeClick]
  );

  // Augment nodes with additional props
  const augmentedNodes = React.useMemo(() => {
    // Get ordered nodes based on connections
    const getOrderedNodeIds = () => {
      // Find the first node (no incoming edges)
      const firstNodeId = initialNodes.find(
        (node) => !initialEdges.some((edge) => edge.target === node.id)
      )?.id;

      if (!firstNodeId) return initialNodes.map((n) => n.id); // Fallback to original order

      // Build the ordered list
      const orderedIds: string[] = [firstNodeId];
      let currentId = firstNodeId;

      // Follow the edges to build the complete path
      while (orderedIds.length < initialNodes.length) {
        const nextEdge = initialEdges.find((edge) => edge.source === currentId);
        if (!nextEdge) break; // No more connections

        orderedIds.push(nextEdge.target);
        currentId = nextEdge.target;
      }

      return orderedIds;
    };

    // Get the ordered IDs
    const orderedIds = getOrderedNodeIds();

    // Create a map of node ID to its position in the sequence
    const nodeOrderMap = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      nodeOrderMap.set(id, index + 1); // 1-based numbering
    });

    return initialNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDuplicate: () => onDuplicateNode?.(node.id),
        onRename: (newName: string) => onRenameNode?.(node.id, newName),
        onDelete: () => onDeleteNode?.(node.id),
        onAddNodeBelow: handleAddNodeBelow,
        isSelected: selectedNode?.id === node.id,
        // Use the node's position in the sequence for numbering
        number: nodeOrderMap.get(node.id) || 0,
      },
      xPos: node.position.x,
      yPos: node.position.y,
    }));
  }, [
    initialNodes,
    initialEdges,
    selectedNode,
    onDuplicateNode,
    onRenameNode,
    onDeleteNode,
    handleAddNodeBelow,
  ]);

  // Augment edges with the onAddNode handler
  const augmentedEdges = initialEdges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      onAddNode: handleAddNode,
    },
  }));

  return (
    <div className="w-full h-full bg-zinc-900 rounded border border-yellow-600/30 overflow-hidden">
      <ReactFlow
        nodes={augmentedNodes}
        edges={augmentedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "custom",
        }}
        style={{ width: "100%", height: "100%" }}
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        nodesDraggable={false}
      >
        <Background
          color="#333"
          gap={16}
          variant={"dots" as BackgroundVariant}
        />
        <Controls showInteractive={false} />

        <Background color="#333" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default FlowEditor;
