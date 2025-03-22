"use client";

import { useEffect } from "react";
import { initializeServicesFromBackend } from "@/utils/iconMapping";

/**
 * Component that initializes services when the app starts
 * Add this to the layout or app root component
 */
export function ServicesInitializer() {
  useEffect(() => {
    // Initialize services on the client side when the app starts
    initializeServicesFromBackend()
      .then(() => {
        console.log("Services initialized at app startup");
      })
      .catch((error) => {
        console.error("Failed to initialize services at app startup:", error);
      });
  }, []);

  // This component doesn't render anything
  return null;
}
