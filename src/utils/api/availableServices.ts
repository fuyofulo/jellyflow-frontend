import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";

export interface AvailableTrigger {
  id: string;
  name: string;
}

export interface AvailableAction {
  id: string;
  name: string;
}

/**
 * Fetches all available triggers from the backend
 * @returns Promise containing available triggers
 */
export const fetchAvailableTriggers = async (): Promise<AvailableTrigger[]> => {
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AVAILABLE_TRIGGERS));

    if (!response.ok) {
      throw new Error(`Failed to fetch available triggers: ${response.status}`);
    }

    const data = await response.json();
    return data.availableTriggers || [];
  } catch (error) {
    console.error("Error fetching available triggers:", error);
    return [];
  }
};

/**
 * Fetches all available actions from the backend
 * @returns Promise containing available actions
 */
export const fetchAvailableActions = async (): Promise<AvailableAction[]> => {
  try {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AVAILABLE_ACTIONS));

    if (!response.ok) {
      throw new Error(`Failed to fetch available actions: ${response.status}`);
    }

    const data = await response.json();
    return data.availableActions || [];
  } catch (error) {
    console.error("Error fetching available actions:", error);
    return [];
  }
};

/**
 * Map to normalize service names from the backend to match our icon keys
 */
export const normalizeServiceNameMapping: Record<string, string> = {
  webhook: "webhook",
  "github-comment": "github",
  gmail: "gmail",
  slack: "slack",
  discord: "discord",
  "google-drive": "drive",
  chatgpt: "chatgpt",
  ethereum: "ethereum",
  solana: "solana",
  notion: "notion",
  twitter: "x",
  x: "x",
  email: "email",
};

/**
 * Normalizes a service name from the backend to match our icon keys
 * @param serviceName The service name from the backend
 * @returns Normalized service name for icon mapping
 */
export const normalizeServiceName = (serviceName: string): string => {
  const normalized = serviceName.toLowerCase().trim();
  return normalizeServiceNameMapping[normalized] || normalized;
};
