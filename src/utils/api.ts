import { getBackendUrl } from "./environment";

/**
 * Utility to build API URLs consistently
 */
export const buildApiUrl = (path: string): string => {
  const backendUrl = getBackendUrl();

  // Ensure path starts with a slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${backendUrl}${normalizedPath}`;
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  SIGNIN: "/api/v1/user/signin",
  SIGNUP: "/api/v1/user/signup",

  // Zaps
  ZAPS: "/api/v1/zap/",
  ZAP_TOGGLE: (id: string) => `/api/v1/zap/${id}/toggle`,
  ZAP_DELETE: (id: string) => `/api/v1/zap/${id}`,
  ZAP_DETAIL: (id: string) => `/api/v1/zap/${id}`,

  // Health
  HEALTH: "/health",
};
