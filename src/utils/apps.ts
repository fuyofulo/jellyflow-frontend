import { AvailableAction, AvailableTrigger } from "./api/availableServices";

export interface App {
  id: string;
  name: string;
  description: string;
  category: "trigger" | "action";
  // Optional fields for icons
  icon?: string;
  iconComponent?: React.ComponentType<any>;
}

// This is a legacy list that will be replaced by dynamic services
// It serves as a fallback in case services can't be loaded from the backend
export const fallbackApps: App[] = [
  {
    id: "webhook",
    name: "Webhook",
    description: "Trigger your flow with a webhook request",
    category: "trigger",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages and interact with Slack",
    category: "action",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Automate your GitHub workflows",
    category: "action",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive emails through Gmail",
    category: "action",
  },
  {
    id: "solana",
    name: "Solana",
    description: "Interact with Solana blockchain",
    category: "action",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    description: "Execute transactions on Ethereum blockchain",
    category: "action",
  },
  {
    id: "x",
    name: "X",
    description: "Post and interact with X (formerly Twitter)",
    category: "action",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create and update Notion pages",
    category: "action",
  },
  {
    id: "drive",
    name: "Drive",
    description: "Manage files in Google Drive",
    category: "action",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Generate text using OpenAI's ChatGPT",
    category: "action",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send messages and interact with Discord",
    category: "action",
  },
  {
    id: "email",
    name: "Email",
    description: "Send and receive emails",
    category: "action",
  },
];

// Start with the fallback list
export let apps: App[] = [...fallbackApps];

/**
 * Update the apps list with data from the backend
 * This converts AvailableAction and AvailableTrigger objects to App objects
 */
export const updateApps = (
  actions: AvailableAction[],
  triggers: AvailableTrigger[]
) => {
  // If we don't have any backend data, keep using the fallbacks
  if (actions.length === 0 && triggers.length === 0) {
    console.log("[apps] No backend services available, using fallbacks.");
    console.log(
      "[apps] Fallback email app:",
      fallbackApps.find((app) => app.id === "email")
    );
    return;
  }

  const newApps: App[] = [];

  // Convert triggers to App objects
  triggers.forEach((trigger) => {
    const app: App = {
      id: trigger.id,
      name: capitalize(trigger.name),
      description: `${trigger.name} trigger for your workflow`,
      category: "trigger",
    };
    newApps.push(app);
    console.log(`[apps] Added trigger app: ${app.id} (${app.name})`);
  });

  // Convert actions to App objects
  actions.forEach((action) => {
    const app: App = {
      id: action.id,
      name: capitalize(action.name),
      description: `${action.name} action for your workflow`,
      category: "action",
    };
    newApps.push(app);
    console.log(`[apps] Added action app: ${app.id} (${app.name})`);

    // Check specifically for email
    if (action.name.toLowerCase().includes("email")) {
      console.log(
        `[apps] Email action found in backend: ${action.id} - ${action.name}`
      );
    }
  });

  // If we have backend data but for some reason it's empty,
  // include the fallbacks to ensure we always have something to show
  if (newApps.length === 0) {
    console.log("[apps] Backend returned empty data, adding fallbacks");
    newApps.push(...fallbackApps);
  }

  // Ensure email is always available by adding it explicitly if not present
  if (
    !newApps.some(
      (app) => app.id === "email" || app.name.toLowerCase().includes("email")
    )
  ) {
    console.log("[apps] Email app not found in backend data, adding fallback");
    const emailApp = fallbackApps.find((app) => app.id === "email");
    if (emailApp) {
      newApps.push(emailApp);
    }
  }

  // Update the apps array
  apps = newApps;
  console.log(`[apps] Updated apps list with ${apps.length} items`);
  const emailApp = apps.find(
    (app) => app.id === "email" || app.name.toLowerCase().includes("email")
  );
  console.log("[apps] Final email app:", emailApp);
};

// Helper to capitalize first letter of a string
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
