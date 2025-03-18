import { useState, useEffect } from "react";
import {
  getBackendUrl,
  isBackendReachable,
  isDevelopment,
} from "@/utils/environment";

/**
 * Custom hook for environment variables and related utilities
 */
export const useEnvironment = () => {
  // Values derived from environment variables
  const backendUrl = getBackendUrl();
  const isDevMode = isDevelopment();

  // Always consider the backend online since we don't have a health endpoint
  const backendStatus = "online";

  return {
    backendUrl,
    isDevMode,
    backendStatus,
  };
};
