/**
 * Environment variable utilities to ensure consistent handling across the application
 */

/**
 * Get the backend API URL with proper fallbacks
 * @returns The configured backend URL or a default fallback
 */
export const getBackendUrl = (): string => {
  // Use environment variable with fallback
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3033";

  // Ensure URL doesn't have trailing slash for consistency in path concatenation
  return backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development";
};

/**
 * For features that should only be available in development
 */
export const devOnly = <T>(devValue: T, prodValue: T): T => {
  return isDevelopment() ? devValue : prodValue;
};

/**
 * Check if the backend API is reachable
 * This is intentionally disabled as the backend doesn't have a health endpoint
 * @returns Promise<boolean> - Always returns true for now
 */
export const isBackendReachable = async (): Promise<boolean> => {
  // Simply return true - we'll let actual API calls handle their own errors
  return true;
};
