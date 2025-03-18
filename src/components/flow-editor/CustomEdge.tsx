"use client";

import React from "react";
import { EdgeProps, getBezierPath } from "reactflow";

interface CustomEdgeProps extends EdgeProps {
  data?: {
    onAddNode?: (
      sourceId: string,
      targetId: string,
      position: { x: number; y: number }
    ) => void;
  };
}

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  data,
}: CustomEdgeProps) => {
  const [edgePath, centerX, centerY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <path
      id={id}
      style={{
        stroke: "#f59e0b",
        strokeWidth: 2,
        ...style,
      }}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
    />
  );
};

export default CustomEdge;
