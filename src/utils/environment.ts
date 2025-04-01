/**
 * Environment variable utilities to ensure consistent handling across the application
 */

/**
 * Get the backend API URL with proper fallbacks
 * @returns The configured backend URL or a default fallback
 */
export const getBackendUrl = (): string => {
  // Temporarily hardcode URL to fix connection issues
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("Backend URL not configured");
  }

  // Debug log to see what URL is being used
  console.log("[ENV] Using hardcoded backend URL:", backendUrl);

  // Ensure URL doesn't have trailing slash for consistency in path concatenation
  return backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
};

/**
 * Get the webhook URL with proper fallbacks
 * @returns The configured webhook URL or a default fallback using port 4000
 */
export const getWebhookUrl = (): string => {
  // Temporarily hardcode URL to fix connection issues
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Webhook URL not configured");
  }

  // Debug log to see what URL is being used
  console.log("[ENV] Using hardcoded webhook URL:", webhookUrl);

  // Ensure URL doesn't have trailing slash for consistency in path concatenation
  return webhookUrl.endsWith("/") ? webhookUrl.slice(0, -1) : webhookUrl;
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
