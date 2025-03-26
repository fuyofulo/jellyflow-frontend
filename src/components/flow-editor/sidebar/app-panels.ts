import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { WebhookPanel } from "./index";
import { EmailPanel } from "./index";
import { DatabasePanel } from "./index";
import { DefaultPanel } from "./index";

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

/**
 * Function to get the appropriate panel for an app
 * @param appId The ID of the app
 * @returns The panel component to use
 */
export function getPanelForApp(
  appId: string
): React.FC<BaseMetadataPanelProps> {
  return APP_PANELS[appId] || APP_PANELS.default;
}
