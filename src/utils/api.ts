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
  ZAP_CREATE: "/api/v1/zap",
  ZAP_TOGGLE: (zapId: string) => `/api/v1/zap/${zapId}/toggle-active`,
  ZAP_DELETE: (zapId: string) => `/api/v1/zap/${zapId}/delete`,
  ZAP_DETAIL: (id: string) => `/api/v1/zap/${id}`,
  ZAP_EDIT: (id: string) => `/api/v1/zap/${id}/edit`,

  // Services
  AVAILABLE_TRIGGERS: "/api/v1/trigger/available",
  AVAILABLE_ACTIONS: "/api/v1/action/available",

  // Health
  HEALTH: "/health",
};
