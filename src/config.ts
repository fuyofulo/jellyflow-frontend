import { getBackendUrl } from "./utils/environment";

/**
 * Backend API URL for all API calls
 */
// Temporarily hardcode backend URL to fix connection issues
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://jellyflow2.duckdns.org/api1";
console.log("[config] Using backend URL:", BACKEND_URL);

/**
 * Configuration for API requests
 */
export const API_CONFIG = {
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
  TIMEOUT: 30000, // 30 seconds
};
