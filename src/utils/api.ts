// Environment variables in Next.js client components are automatically loaded
// and don't require dotenv for client-side code
// Client components can only access NEXT_PUBLIC_ prefixed variables

/**
 * Utility to build API URLs consistently
 */
export const buildApiUrl = (path: string): string => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    console.error(
      "Backend URL not configured. Please check your environment variables."
    );
    // Return a default that will clearly fail to indicate the missing config
    return `/api-url-not-configured${path}`;
  }

  console.log("[API] Building URL with backend:", backendUrl);

  // Ensure path starts with a slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Ensure URL doesn't have trailing slash for consistency
  const cleanBackendUrl = backendUrl.endsWith("/")
    ? backendUrl.slice(0, -1)
    : backendUrl;

  return `${cleanBackendUrl}${normalizedPath}`;
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  SIGNIN: "/api/v1/user/signin",
  SIGNUP: "/api/v1/user/signup",
  VERIFY_EMAIL: "/api/v1/verify/verify-email",
  RESEND_VERIFICATION: "/api/v1/verify/resend-verification",

  // Zaps
  ZAPS: "/api/v1/zap/",
  ZAPS_PUBLISHED: "/api/v1/zap/published",
  ZAPS_UNPUBLISHED: "/api/v1/zap/unpublished",
  ZAP_CREATE: "/api/v1/zap",
  ZAP_TOGGLE: (zapId: string) => `/api/v1/zap/${zapId}/toggle-active`,
  ZAP_DELETE: (zapId: string) => `/api/v1/zap/${zapId}/delete`,
  ZAP_DETAIL: (id: string) => `/api/v1/zap/${id}`,
  ZAP_EDIT: (id: string) => `/api/v1/zap/${id}/edit`,
  ZAP_RUNS: (zapId: string, limit: number = 3) =>
    `/api/v1/zap/${zapId}/runs/${limit}`,

  // Services
  AVAILABLE_TRIGGERS: "/api/v1/trigger/available",
  AVAILABLE_ACTIONS: "/api/v1/action/available",
};
