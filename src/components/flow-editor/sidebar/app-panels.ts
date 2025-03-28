import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { WebhookPanel } from "./index";
import { EmailPanel } from "./index";
import { DatabasePanel } from "./index";
import { DefaultPanel } from "./index";

// Debug log to check if EmailPanel is imported correctly
console.log("EmailPanel imported:", !!EmailPanel);

/**
 * Map of app IDs to their specific panel components
 * This makes it easy to add new app-specific panels as they are created
 */
export const APP_PANELS: Record<string, React.FC<BaseMetadataPanelProps>> = {
  // Core integrations - include variations of webhooks IDs that might be used
  webhook: WebhookPanel,
  webhooks: WebhookPanel,
  "web-hook": WebhookPanel,
  "http-webhook": WebhookPanel,
  http: WebhookPanel,

  // Specific UUIDs for webhook from user's system
  "91877190-6508-490f-b445-f33ef7b308ce": WebhookPanel, // User's webhook UUID
  "103b134a-4dac-46a3-a4c3-621e9ffcfd79": WebhookPanel, // Example UUID

  // Email panels
  email: EmailPanel,
  gmail: EmailPanel,
  mail: EmailPanel,

  // Database panels
  database: DatabasePanel,
  db: DatabasePanel,
  postgres: DatabasePanel,
  mysql: DatabasePanel,
  mongodb: DatabasePanel,

  // Default panel used as fallback
  default: DefaultPanel,
};

// Debug log to check if EmailPanel is registered correctly
console.log("Email panel registration:", APP_PANELS["email"] === EmailPanel);

/**
 * Function to get the appropriate panel for an app
 * @param appId The ID of the app
 * @returns The panel component to use
 */
export function getPanelForApp(
  appId: string,
  nodeData?: any
): React.FC<BaseMetadataPanelProps> {
  console.log(`Getting panel for app ID: ${appId}`);

  // First try direct mapping with the appId
  let panel = APP_PANELS[appId];

  // If panel not found directly, try to normalize the name
  if (!panel && nodeData) {
    // Try to get panel by actionId or name if present in node data
    const actionId = nodeData.actionId?.toLowerCase() || "";
    const name = nodeData.name?.toLowerCase() || "";
    const actionName = nodeData.actionName?.toLowerCase() || "";
    const label = nodeData.label?.toLowerCase() || "";

    console.log(
      `Trying to find panel by normalized name: actionId=${actionId}, name=${name}, actionName=${actionName}, label=${label}`
    );
    console.log("Node data for panel selection:", nodeData);

    // Check if we can find a match using these normalized names
    if (actionId && APP_PANELS[actionId]) {
      panel = APP_PANELS[actionId];
      console.log(`Panel found using actionId: ${actionId}`);
    } else if (name && APP_PANELS[name]) {
      panel = APP_PANELS[name];
      console.log(`Panel found using name: ${name}`);
    } else if (actionName && APP_PANELS[actionName]) {
      panel = APP_PANELS[actionName];
      console.log(`Panel found using actionName: ${actionName}`);
    } else if (label && APP_PANELS[label]) {
      panel = APP_PANELS[label];
      console.log(`Panel found using label: ${label}`);
    } else if (
      actionId.includes("email") ||
      name.includes("email") ||
      actionName.includes("email") ||
      label.includes("email")
    ) {
      panel = APP_PANELS["email"];
      console.log(`Panel found using email keyword match in one of the fields`);
    } else if (
      actionId.includes("webhook") ||
      name.includes("webhook") ||
      actionName.includes("webhook") ||
      label.includes("webhook")
    ) {
      panel = APP_PANELS["webhook"];
      console.log(
        `Panel found using webhook keyword match in one of the fields`
      );
    }
    // Add other specific mappings as needed
  }

  // Fall back to default panel if no match found
  if (!panel) {
    panel = APP_PANELS.default;
  }

  console.log(
    `Panel found for ${appId}:`,
    panel === EmailPanel
      ? "EmailPanel"
      : panel === WebhookPanel
      ? "WebhookPanel"
      : panel === APP_PANELS.default
      ? "DefaultPanel"
      : "Other panel"
  );

  return panel;
}
