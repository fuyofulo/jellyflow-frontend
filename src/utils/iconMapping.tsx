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

  // First try using actionId if provided
  if (actionId) {
    IconComponent = getIconByActionId(actionId);
  }

  // If not found and actionName is provided, try using actionName
  if (!IconComponent && actionName) {
    IconComponent = getIconByActionName(actionName);
  }

  if (!IconComponent) {
    // Default icon if no matching icon found
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={className}
      >
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      </svg>
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
