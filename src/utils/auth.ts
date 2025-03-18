// Auth utilities for handling tokens and authentication

/**
 * Get the authentication token from localStorage
 */
export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token;
};

/**
 * Set the authentication token in localStorage
 */
export const setToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
};

/**
 * Remove the authentication token from localStorage
 */
export const removeToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
};

/**
 * Get the authorization headers for API requests
 * @param useBearer - Whether to include 'Bearer ' prefix (default: true)
 */
export const getAuthHeaders = (useBearer: boolean = true): HeadersInit => {
  const token = getToken();
  if (!token) return { "Content-Type": "application/json" };

  return {
    "Content-Type": "application/json",
    Authorization: useBearer ? `Bearer ${token}` : token,
  };
};

/**
 * Handle API error responses
 * @param error - Optional error object
 * @param router - Optional router object for redirect
 */
export const handleAuthError = (error?: any, router?: any): void => {
  console.error("Auth error:", error || "Authentication required");

  // Remove the token
  removeToken();

  // If router is provided, redirect to signin
  if (router) {
    router.push("/signin");
  } else if (typeof window !== "undefined") {
    // Fallback to window.location if router is not available
    window.location.href = "/signin";
  }
};
