"use client";

import React from "react";
import { WebhookPanel } from "./index";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { getPanelForApp } from "./app-panels";

interface PanelFactoryProps extends BaseMetadataPanelProps {
  // No additional props needed beyond BaseMetadataPanelProps
}

/**
 * Factory component that selects the appropriate panel based on the app ID
 */
const PanelFactory: React.FC<PanelFactoryProps> = (props) => {
  const { node } = props;

  if (!node) {
    return null;
  }

  // Get the app ID from the node data
  const appId = node.data?.actionId || "";
  const nodeType = node.type || "";

  // For trigger nodes, force WebhookPanel
  if (nodeType === "trigger") {
    return <WebhookPanel {...props} />;
  }

  // For other nodes, use normal panel selection
  const PanelComponent = getPanelForApp(appId);

  return <PanelComponent {...props} />;
};

export default PanelFactory;
