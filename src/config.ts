import { getBackendUrl } from "./utils/environment";

/**
 * Backend API URL for all API calls
 */
export const BACKEND_URL = getBackendUrl();

/**
 * Configuration for API requests
 */
export const API_CONFIG = {
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
  TIMEOUT: 30000, // 30 seconds
};
