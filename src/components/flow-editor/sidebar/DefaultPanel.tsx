"use client";

import React from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";

// The DefaultPanel doesn't add any additional fields beyond the base panel
const DefaultPanel: React.FC<BaseMetadataPanelProps> = (props) => {
  return (
    <div className="space-y-4">
      <div className="p-4 border border-zinc-800 rounded-md bg-zinc-900/50">
        <h3 className={`text-base font-medium mb-3 ${props.node.type === "trigger" ? "text-purple-300" : "text-yellow-300"}`}>
          Configuration
        </h3>
        <p className="text-zinc-500 text-sm">
          No additional configuration is needed for this {props.node.type === "trigger" ? "trigger" : "action"}.
        </p>
      </div>
    </div>
  );
};

export default DefaultPanel; 