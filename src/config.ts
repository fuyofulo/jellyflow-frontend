import { getBackendUrl } from "./utils/environment";

/**
 * Backend API URL for all API calls
 */
// Temporarily hardcode backend URL to fix connection issues
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://13.49.77.29:3033";
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
