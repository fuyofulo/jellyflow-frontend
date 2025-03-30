import React, { useEffect, useState } from "react";
import ChatGPTSVG from "../components/logos/ChatGPTSVG";
import { DriveSVG } from "../components/logos/DriveSVG";
import { EthereumSVG } from "../components/logos/EthereumSVG";
import { GitHubSVG } from "../components/logos/GitHubSVG";
import { OfficialGmailSVG } from "../components/logos/GmailSVG";
import GoogleSVG from "../components/logos/GoogleSVG";
import MailSVG from "../components/logos/MailSVG";
import { NotionSVG } from "../components/logos/NotionSVG";
import { SlackSVG } from "../components/logos/SlackSVG";
import { SolanaSVG } from "../components/logos/SolanaSVG";
import WebhookSVG from "../components/logos/WebhookSVG";
import { XSVG } from "../components/logos/XSVG";
import TelegramSVG from "../components/logos/TelegramSVG";
import { IconWrapper } from "../components/IconWrapper";
import {
  fetchAvailableActions,
  fetchAvailableTriggers,
  normalizeServiceName,
} from "./api/availableServices";

// Interface for the action type
export interface ActionType {
  id: string;
  name: string;
  description?: string;
}

// Define icon components dictionary
// Use more generic type that doesn't require SVGProps<SVGSVGElement>
type IconComponent = React.ComponentType<any>;

// Map of standard action names to their corresponding SVG components
export const IconMapping: Record<string, IconComponent> = {
  // Communication/Email
  email: MailSVG,
  gmail: OfficialGmailSVG,
  telegram: TelegramSVG,

  // AI Services
  chatgpt: ChatGPTSVG,

  // Social Media
  twitter: XSVG,
  x: XSVG,

  // Developer Tools
  github: GitHubSVG,
  webhook: WebhookSVG,

  // Productivity
  notion: NotionSVG,
  slack: SlackSVG,
  "google-drive": DriveSVG,
  drive: DriveSVG,

  // Authentication
  "google-auth": GoogleSVG,

  // Blockchain/Crypto
  ethereum: EthereumSVG,
  solana: SolanaSVG,
};

// Dynamic ActionIdMapping that will be populated from the backend
export let ActionIdMapping: Record<string, string> = {};

// Initialize the mapping with some fallback values
// This will be updated with real values from the backend at runtime
const initializeActionIdMapping = () => {
  // Default fallbacks, will be overwritten with backend data
  ActionIdMapping = {
    // These are just placeholders for initial rendering and will be replaced
    webhook: "webhook",
    github: "github",
    gmail: "gmail",
    slack: "slack",
    discord: "discord",
    "google-drive": "drive",
    drive: "drive",
    chatgpt: "chatgpt",
    ethereum: "ethereum",
    solana: "solana",
    notion: "notion",
    twitter: "x",
    x: "x",
    email: "email",
    telegram: "telegram",
    // Add common UUIDs for services we know about
    "f4b74660-98e4-46b3-856a-1b4b1423c722": "email",
    "7fbe85fc-5a12-4103-8d00-264f117aaf37": "slack",
    "103b134a-4dac-46a3-a4c3-621e9ffcfd79": "ethereum",
  };
};

// Initialize with defaults
initializeActionIdMapping();

/**
 * Fetches available actions and triggers from the backend and updates the ActionIdMapping
 * This should be called on application initialization
 */
export const initializeServicesFromBackend = async () => {
  try {
    console.log("[IconMapping] Initializing services from backend...");

    // Fetch available actions and triggers
    const [actions, triggers] = await Promise.all([
      fetchAvailableActions(),
      fetchAvailableTriggers(),
    ]);

    // Create a new mapping from the fetched data
    const newMapping: Record<string, string> = {};

    // Add actions to the mapping
    actions.forEach((action) => {
      const normalizedName = normalizeServiceName(action.name);
      newMapping[action.id] = normalizedName;
      console.log(
        `[IconMapping] Mapped action: ${action.id} -> ${normalizedName}`
      );
    });

    // Add triggers to the mapping
    triggers.forEach((trigger) => {
      const normalizedName = normalizeServiceName(trigger.name);
      newMapping[trigger.id] = normalizedName;
      console.log(
        `[IconMapping] Mapped trigger: ${trigger.id} -> ${normalizedName}`
      );
    });

    // Update the global ActionIdMapping
    ActionIdMapping = {
      ...ActionIdMapping, // Keep any existing mappings
      ...newMapping, // Add new mappings from backend
    };

    console.log("[IconMapping] Services initialized:", ActionIdMapping);

    return true;
  } catch (error) {
    console.error("[IconMapping] Failed to initialize services:", error);
    return false;
  }
};

/**
 * Get icon component by action ID (UUID)
 */
export const getIconByActionId = (actionId: string): IconComponent | null => {
  // First check if we have a direct UUID mapping
  if (ActionIdMapping[actionId]) {
    const iconKey = ActionIdMapping[actionId];
    return IconMapping[iconKey];
  }

  // If it's not a UUID in our mapping, try direct lookup
  if (IconMapping[actionId]) {
    return IconMapping[actionId];
  }

  // Try fuzzy matching - normalize both sides
  const normalizedActionId = actionId.toLowerCase();

  // Try case-insensitive exact match for icon keys
  const iconKey = Object.keys(IconMapping).find(
    (key) => key.toLowerCase() === normalizedActionId
  );

  if (iconKey) {
    return IconMapping[iconKey];
  }

  // Try partial match for icon names
  const partialIconKey = Object.keys(IconMapping).find(
    (key) =>
      normalizedActionId.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(normalizedActionId)
  );

  if (partialIconKey) {
    return IconMapping[partialIconKey];
  }

  return null;
};

/**
 * Get icon component by action name
 */
export const getIconByActionName = (name: string): IconComponent | null => {
  const normalizedName = name.toLowerCase();

  // Try exact match with keys
  if (IconMapping[normalizedName]) {
    return IconMapping[normalizedName];
  }

  // Try finding a key that's contained in the name
  const key = Object.keys(IconMapping).find((key) =>
    normalizedName.includes(key.toLowerCase())
  );

  if (key) {
    return IconMapping[key];
  }

  return null;
};

// Props for the ActionIcon component
interface ActionIconProps {
  actionName?: string;
  actionId?: string; // Add support for direct actionId
  width?: number;
  height?: number;
  className?: string;
}

// Service-specific icon components for common services without SVGs
const getServiceSpecificIcon = (id: string): React.ReactNode | null => {
  // Special case for Discord
  if (id.toLowerCase().includes("discord")) {
    return (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19.54 0c1.356 0 2.46 1.104 2.46 2.472v21.528l-2.58-2.28-1.452-1.344-1.536-1.428.636 2.22h-13.608c-1.356 0-2.46-1.104-2.46-2.472v-16.224c0-1.368 1.104-2.472 2.46-2.472h16.08zm-4.632 15.672c2.652-.084 3.672-1.824 3.672-1.824 0-3.864-1.728-6.996-1.728-6.996-1.728-1.296-3.372-1.26-3.372-1.26l-.168.192c2.04.624 2.988 1.524 2.988 1.524-1.248-.684-2.472-1.02-3.612-1.152-.864-.096-1.692-.072-2.424.024l-.204.024c-.42.036-1.44.192-2.724.756-.444.204-.708.348-.708.348s.996-.948 3.156-1.572l-.12-.144s-1.644-.036-3.372 1.26c0 0-1.728 3.132-1.728 6.996 0 0 1.008 1.74 3.66 1.824 0 0 .444-.54.804-.996-1.524-.456-2.1-1.416-2.1-1.416l.336.204.048.036.047.027.014.006.047.027c.3.168.6.3.876.408.492.192 1.08.384 1.764.516.9.168 1.956.228 3.108.012.564-.096 1.14-.264 1.74-.516.42-.156.888-.384 1.38-.708 0 0-.6.984-2.172 1.428.36.456.792.972.792.972zm-5.58-5.604c-.684 0-1.224.6-1.224 1.332 0 .732.552 1.332 1.224 1.332.684 0 1.224-.6 1.224-1.332.012-.732-.54-1.332-1.224-1.332zm4.38 0c-.684 0-1.224.6-1.224 1.332 0 .732.552 1.332 1.224 1.332.684 0 1.224-.6 1.224-1.332 0-.732-.54-1.332-1.224-1.332z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return null;
};

/**
 * A React component that renders the appropriate icon for an action
 * Can be used with either actionName or actionId
 */
export const ActionIcon: React.FC<ActionIconProps> = ({
  actionName,
  actionId,
  width = 24,
  height = 24,
  className = "text-yellow-600",
}) => {
  // Debug: Log the attempts to get an icon
  console.log(
    `[ActionIcon] Attempting to get icon for: ID=${
      actionId || "no-id"
    } / Name=${actionName || "no-name"}`
  );

  let IconComponent = null;
  let customIcon = null;

  // First try using actionId if provided
  if (actionId) {
    // Try direct lookup first (most common case for well-known services)
    IconComponent = IconMapping[actionId.toLowerCase()];

    if (IconComponent) {
      console.log(`[ActionIcon] Found icon directly for ID: ${actionId}`);
    } else {
      // Try UUID mapping
      const iconKey = ActionIdMapping[actionId];
      if (iconKey && IconMapping[iconKey]) {
        IconComponent = IconMapping[iconKey];
        console.log(
          `[ActionIcon] Found icon via UUID mapping: ${actionId} -> ${iconKey}`
        );
      }

      // Try fuzzy matching with normalized id
      if (!IconComponent) {
        const normalizedActionId = actionId.toLowerCase();

        // Try all icon mappings to find a partial match
        for (const [key, component] of Object.entries(IconMapping)) {
          if (
            normalizedActionId.includes(key) ||
            key.includes(normalizedActionId)
          ) {
            IconComponent = component;
            console.log(
              `[ActionIcon] Found icon via fuzzy ID match: ${actionId} -> ${key}`
            );
            break;
          }
        }
      }
    }

    // If no icon found, try service-specific rendering
    if (!IconComponent) {
      customIcon = getServiceSpecificIcon(actionId);
      if (customIcon) {
        console.log(
          `[ActionIcon] Using service-specific icon for ID: ${actionId}`
        );
      }
    }
  }

  // If not found and actionName is provided, try using actionName
  if (!IconComponent && !customIcon && actionName) {
    const normalizedName = actionName.toLowerCase();

    // Try direct match with keys
    IconComponent = IconMapping[normalizedName];

    if (IconComponent) {
      console.log(`[ActionIcon] Found icon directly for name: ${actionName}`);
    } else {
      // Try finding a key that's contained in the name
      for (const [key, component] of Object.entries(IconMapping)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
          IconComponent = component;
          console.log(
            `[ActionIcon] Found icon via fuzzy name match: ${actionName} -> ${key}`
          );
          break;
        }
      }

      // If still no icon found, try service-specific rendering with action name
      if (!IconComponent) {
        customIcon = getServiceSpecificIcon(actionName);
        if (customIcon) {
          console.log(
            `[ActionIcon] Using service-specific icon for name: ${actionName}`
          );
        }
      }
    }
  }

  if (customIcon) {
    return (
      <div style={{ width, height }} className={className}>
        {customIcon}
      </div>
    );
  }

  if (!IconComponent) {
    // Debug when no icon is found
    console.log(
      `[ActionIcon] No icon found for: ID=${actionId} / Name=${actionName}`
    );

    // Create initial-based icon for services without icons
    let initial = "";
    if (actionName) {
      initial = actionName.charAt(0).toUpperCase();
    } else if (actionId) {
      // Handle specific cases
      if (actionId.toLowerCase().includes("discord")) {
        initial = "D";
      } else if (actionId.toLowerCase().includes("gmail")) {
        initial = "G";
      } else if (actionId.toLowerCase().includes("slack")) {
        initial = "S";
      } else if (actionId.toLowerCase().includes("webhook")) {
        initial = "W";
      } else {
        // Extract meaningful part from UUID if possible
        const parts = actionId.split("-");
        if (parts.length > 0 && parts[0].length > 0) {
          initial = parts[0].charAt(0).toUpperCase();
        } else {
          initial = actionId.charAt(0).toUpperCase();
        }
      }
    }

    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.floor(width * 0.6) + "px",
          fontWeight: "bold",
        }}
        className={className}
      >
        {initial}
      </div>
    );
  }

  // Use IconWrapper to properly scale the SVG
  return (
    <IconWrapper
      icon={<IconComponent />}
      width={width}
      height={height}
      className={className}
    />
  );
};

/**
 * Hook to initialize services when the component mounts
 * Usage:
 * ```
 * const MyComponent = () => {
 *   useInitializeServices();
 *   // rest of component...
 * }
 * ```
 */
export const useInitializeServices = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      console.log("[IconMapping] Starting service initialization...");
      initializeServicesFromBackend()
        .then((success) => {
          console.log(
            `[IconMapping] Service initialization ${
              success ? "completed" : "failed"
            }`
          );
          setIsInitialized(success);
        })
        .catch((error) => {
          console.error("[IconMapping] Error during initialization:", error);
          setIsInitialized(false);
        });
    }
  }, [isInitialized]);

  return isInitialized;
};
