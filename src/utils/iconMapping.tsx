import React from "react";
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
import { WebhookSVG } from "../components/logos/WebhookSVG";
import { XSVG } from "../components/logos/XSVG";
import { IconWrapper } from "../components/IconWrapper";

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

// Map of UUID actionIds to their corresponding SVG component keys
// This maps the backend UUID to the key in the IconMapping
export const ActionIdMapping: Record<string, string> = {
  // Real UUIDs from the backend
  "103b134a-4dac-46a3-a4c3-621e9ffcfd79": "ethereum",
  "d7f14946-bd36-4daa-9dca-2bbea2cb19b8": "solana",
  "7fbe85fc-5a12-4103-8d00-264f117aaf37": "slack",
  "f14c5d53-4563-41a2-9cdb-fcf5d184deda": "google-drive",
  "aac0e619-2094-4589-badc-fe487834f705": "webhook",
  "f7d609d1-0adf-4487-b934-2a6b9f5ea88f": "github",
  "9549c50b-81b1-47c3-b0e0-754fd8c7acf8": "x",
  "51368c2c-47aa-4999-be7e-5e8dc354c87f": "notion",
  "9a4793d2-3125-4ed1-9da2-0499edb6bdd0": "chatgpt",
  discord: "discord", // Handle string ID for Discord
  "f4b74660-98e4-46b3-856a-1b4b1423c722": "email",
  gmail: "gmail", // Handle string ID for Gmail

  // Keep some of the previous mappings as fallbacks
  "1f4bf980-1811-4b70-bc93-aa4da7f5071b": "email",
  "2e5a8930-3922-5c81-dc04-bb5eb8f6182c": "gmail",
  "3f6ca041-4a33-6d92-ed15-cc6fc9f7293d": "chatgpt",
  "4g7db152-5b44-7e03-fe26-dd7gd0g8304e": "twitter",
  "5h8ec263-6c55-8f14-gf37-ee8he1h9415f": "x",
  "6i9fd374-7d66-9g25-hg48-ff9if2i0526g": "github",
  "7j0ge485-8e77-0h36-ih59-gg0jg3j1637h": "notion",
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
  let IconComponent = null;
  let customIcon = null;

  // First try using actionId if provided
  if (actionId) {
    IconComponent = getIconByActionId(actionId);
    // If no icon found, try service-specific rendering
    if (!IconComponent) {
      customIcon = getServiceSpecificIcon(actionId);
    }
  }

  // If not found and actionName is provided, try using actionName
  if (!IconComponent && !customIcon && actionName) {
    IconComponent = getIconByActionName(actionName);
    // If still no icon found, try service-specific rendering with action name
    if (!IconComponent) {
      customIcon = getServiceSpecificIcon(actionName);
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
    // Create initial-based icon for services without icons
    let initial = "";
    if (actionName) {
      initial = actionName.charAt(0).toUpperCase();
    } else if (actionId) {
      // Handle cases like 'discord', 'gmail', etc.
      if (actionId === "discord") {
        initial = "D";
      } else if (actionId === "gmail") {
        initial = "G";
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
