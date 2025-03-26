"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getToken, getAuthHeaders } from "@/utils/auth";
import { getBackendUrl, getWebhookUrl } from "@/utils/environment";

// Type for webhook-specific configuration
interface WebhookConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  requireAuthToken?: boolean;
  activeTab?: "setup" | "test" | "response";
  description?: string;
  setupCompleted?: boolean;
  testCompleted?: boolean;
  urlGenerated?: boolean;
  requiresAuth: boolean;
  authToken: string;
}

const WebhookPanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onMetadataChange,
}) => {
  // Initialize webhook configurations
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: "",
    method: "POST",
    headers: {},
    requireAuthToken: false,
    activeTab: "setup",
    description: "",
    setupCompleted: false,
    testCompleted: false,
    urlGenerated: false,
    requiresAuth: false,
    authToken: "",
  });

  // States for URL generation
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-fetch webhook URL if needed
  const autoFetchWebhookUrl = useCallback(
    async (zapId: string) => {
      if (!node || webhookConfig.url) return; // Don't fetch if we already have a URL

      console.log("Auto-fetching webhook URL for zap:", zapId);
      setIsGeneratingUrl(true);
      setError(null);

      try {
        // Check if this is a webhook trigger
        const isWebhookTrigger =
          node?.data?.actionId === "webhook" ||
          (node?.type === "trigger" &&
            (node?.data?.actionName?.toLowerCase().includes("webhook") ||
              node?.data?.label?.toLowerCase().includes("webhook")));

        if (!isWebhookTrigger) {
          console.log("Not a webhook trigger, skipping auto-fetch");
          return;
        }

        // Get auth token and webhook URL
        const token = getToken();
        if (!token) return;

        const webhookUrl = getWebhookUrl();
        if (!webhookUrl) return;

        // For an existing zap, we need the user ID
        let userId;

        // Try to get user ID directly
        try {
          const userResponse = await fetch(buildApiUrl("/api/v1/user/me"), {
            method: "GET",
            headers: getAuthHeaders(false),
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id;
          }
        } catch (e) {
          console.error("Error fetching user details:", e);
        }

        // If that fails, try to get from zap details
        if (!userId) {
          try {
            const zapResponse = await fetch(
              buildApiUrl(API_ENDPOINTS.ZAP_DETAIL(zapId)),
              {
                method: "GET",
                headers: getAuthHeaders(false),
              }
            );

            if (zapResponse.ok) {
              const zapData = await zapResponse.json();
              userId = zapData.zap?.userId;
            }
          } catch (e) {
            console.error("Error fetching zap details:", e);
            return;
          }
        }

        if (!userId) return;

        // Construct webhook URL
        const cleanWebhookUrl = webhookUrl.replace(/\/$/, "");
        const fullWebhookUrl = `${cleanWebhookUrl}/webhook/catch/${userId}/${zapId}`;

        // Update webhook config
        const newConfig = {
          ...webhookConfig,
          url: fullWebhookUrl,
          urlGenerated: true,
          setupCompleted: true,
        };

        setWebhookConfig(newConfig);

        // Update metadata
        if (onMetadataChange) {
          onMetadataChange(node.id, {
            ...node.data?.metadata,
            webhook: newConfig,
          });
        }

        console.log("Auto-generated webhook URL:", fullWebhookUrl);
      } catch (error) {
        console.error("Error auto-fetching webhook URL:", error);
      } finally {
        setIsGeneratingUrl(false);
      }
    },
    [node, webhookConfig.url, onMetadataChange]
  );

  // Load existing webhook configuration from node metadata
  useEffect(() => {
    console.log("WebhookPanel: Node data received:", node?.data);

    // Check if there's webhook data in node.data.metadata.webhook
    if (node?.data?.metadata?.webhook) {
      console.log("WebhookPanel: Found webhook data in node metadata");
      setWebhookConfig({
        ...webhookConfig,
        ...node.data.metadata.webhook,
      });
    }
    // Check for webhook URL in triggerMetadata (from existing zap data)
    else if (node?.data?.metadata?.triggerMetadata?.webhook?.url) {
      console.log("WebhookPanel: Found webhook URL in triggerMetadata");
      setWebhookConfig({
        ...webhookConfig,
        url: node.data.metadata.triggerMetadata.webhook.url,
        urlGenerated: true,
        setupCompleted: true,
      });
    }
    // Check for webhook URL directly in the node's data (from ZapEditor)
    else if (node?.data?.webhookUrl) {
      console.log("WebhookPanel: Found webhook URL directly in node data");
      setWebhookConfig({
        ...webhookConfig,
        url: node.data.webhookUrl,
        urlGenerated: true,
        setupCompleted: true,
      });
    }
    // If not found in any of those places, try to generate one from the URL path
    else {
      const currentUrlPath = window.location.pathname;
      const isEditMode = currentUrlPath.includes("/edit/");

      if (isEditMode) {
        const pathParts = currentUrlPath.split("/");
        const existingZapId = pathParts[pathParts.length - 1];

        if (existingZapId) {
          console.log(
            "WebhookPanel: In edit mode, checking if we need to fetch webhook details for zapId:",
            existingZapId
          );

          // Check if the node is a webhook trigger
          const isWebhookTrigger =
            node?.data?.actionId === "webhook" ||
            (node?.type === "trigger" &&
              (node?.data?.actionName?.toLowerCase().includes("webhook") ||
                node?.data?.label?.toLowerCase().includes("webhook")));

          if (isWebhookTrigger) {
            console.log(
              "WebhookPanel: This appears to be a webhook trigger, will attempt to generate URL"
            );
            autoFetchWebhookUrl(existingZapId);
          }
        }
      }
    }

    // Initialize description from node metadata if not in webhook config
    if (
      typeof node?.data?.metadata === "object" &&
      node.data.metadata.description
    ) {
      setWebhookConfig((prev) => ({
        ...prev,
        description: prev.description || node.data.metadata.description,
      }));
    }
  }, [node, autoFetchWebhookUrl]);

  // Update webhook description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    const newConfig = { ...webhookConfig, description: newDescription };
    setWebhookConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Generate webhook URL manually if needed
  const generateWebhookUrl = async () => {
    try {
      setIsGeneratingUrl(true);
      setError(null);

      // Check for authentication
      const token = getToken();
      if (!token) {
        throw new Error("Please log in to generate a webhook URL");
      }

      // Get webhook URL
      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error("Webhook URL not configured");
      }
      const cleanWebhookUrl = webhookUrl.replace(/\/$/, "");

      // Check if we're in edit mode
      const currentUrlPath = window.location.pathname;
      const isEditMode = currentUrlPath.includes("/edit/");
      let zapId, userId;

      // Determine zapId and userId
      if (isEditMode) {
        // Extract zapId from URL
        const pathParts = currentUrlPath.split("/");
        zapId = pathParts[pathParts.length - 1];
        console.log("Using existing zap ID:", zapId);

        // Fetch userId from the server
        try {
          const userResponse = await fetch(buildApiUrl("/api/v1/user/me"), {
            method: "GET",
            headers: getAuthHeaders(false),
          });

          if (!userResponse.ok) {
            throw new Error("Failed to get user details");
          }

          const userData = await userResponse.json();
          userId = userData.id;
          console.log("User ID retrieved:", userId);
        } catch (error) {
          console.error("Error fetching user details:", error);
          // Fallback to checking zap details
          try {
            const zapResponse = await fetch(
              buildApiUrl(API_ENDPOINTS.ZAP_DETAIL(zapId)),
              {
                method: "GET",
                headers: getAuthHeaders(false),
              }
            );

            if (!zapResponse.ok) {
              throw new Error("Failed to get zap details");
            }

            const zapData = await zapResponse.json();
            userId = zapData.zap?.userId;
          } catch (zapError) {
            throw new Error("Could not determine user ID");
          }
        }
      } else {
        // For new zaps, create a zap with webhook trigger
        try {
          // Find webhook trigger ID
          let webhookTriggerId;
          try {
            const triggersResponse = await fetch(
              buildApiUrl(API_ENDPOINTS.AVAILABLE_TRIGGERS),
              {
                method: "GET",
                headers: getAuthHeaders(false),
              }
            );

            if (triggersResponse.ok) {
              const triggers = await triggersResponse.json();
              const webhookTrigger = triggers.find((t: any) =>
                t.name.toLowerCase().includes("webhook")
              );

              if (webhookTrigger) {
                webhookTriggerId = webhookTrigger.id;
              }
            }
          } catch (e) {
            console.error("Error fetching triggers:", e);
          }

          // Use fallback if needed
          if (!webhookTriggerId) {
            webhookTriggerId = "91877190-6508-490f-b445-f33ef7b308ce";
          }

          // Create zap
          const response = await fetch(buildApiUrl(API_ENDPOINTS.ZAP_CREATE), {
            method: "POST",
            headers: getAuthHeaders(false),
            body: JSON.stringify({
              zapName: "Webhook Zap",
              availableTriggerId: webhookTriggerId,
              triggerMetadata: {
                description: "Webhook trigger",
                message: "",
              },
              actions: [],
              isPublished: false,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to create zap");
          }

          const data = await response.json();
          zapId = data.zap?.id;
          userId = data.zap?.userId;
        } catch (error) {
          throw new Error(
            `Failed to create webhook zap: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      if (!zapId || !userId) {
        throw new Error("Failed to determine zap ID or user ID");
      }

      // Construct webhook URL
      const fullWebhookUrl = `${cleanWebhookUrl}/webhook/catch/${userId}/${zapId}`;
      console.log("Generated webhook URL:", fullWebhookUrl);

      // Update the webhook config
      const newConfig = {
        ...webhookConfig,
        url: fullWebhookUrl,
        urlGenerated: true,
        setupCompleted: true,
      };
      setWebhookConfig(newConfig);

      // Update the metadata
      if (onMetadataChange) {
        onMetadataChange(node.id, {
          ...node.data?.metadata,
          webhook: newConfig,
        });
      }

      setSuccess("Webhook URL generated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error generating webhook URL:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate webhook URL"
      );
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  // Mark test as completed
  const handleCompleteTest = () => {
    const newConfig = { ...webhookConfig, testCompleted: true };
    setWebhookConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update metadata when webhook config changes
  const updateMetadata = (config: WebhookConfig) => {
    if (onMetadataChange) {
      // Preserve other metadata fields and update only webhook-specific fields
      const existingMetadata =
        typeof node.data?.metadata === "object"
          ? node.data.metadata
          : { description: node.data?.label || "", message: "" };

      const metadataUpdate = {
        metadata: {
          ...existingMetadata,
          webhook: config,
          description: config.description || existingMetadata.description,
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Webhook Header with Logo */}
      <div className="flex items-center mb-3">
        <div className="p-2 bg-purple-900/20 rounded-md mr-2">
          <ActionIcon
            actionId={node.data?.actionId || "webhook"}
            width={22}
            height={22}
            className="text-purple-300"
          />
        </div>
        <div>
          <h2 className="text-base font-medium text-white font-mono">
            Webhook
          </h2>
        </div>
      </div>

      {/* Description Input Field */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
          Description
        </label>
        <input
          type="text"
          value={webhookConfig.description || ""}
          onChange={handleDescriptionChange}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono"
          placeholder="Add a description for this webhook"
        />
      </div>

      {/* URL Display */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
          Webhook URL
        </label>

        {isGeneratingUrl ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded p-3 text-center">
            <div className="animate-pulse text-zinc-400 text-sm font-mono">
              Generating your webhook URL...
            </div>
          </div>
        ) : webhookConfig.url ? (
          <div className="relative">
            <input
              type="text"
              value={webhookConfig.url || ""}
              readOnly
              className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 pr-10 font-mono overflow-x-auto text-ellipsis"
              title={webhookConfig.url}
            />
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(webhookConfig.url || "");
                setSuccess("URL copied to clipboard!");
                setTimeout(() => setSuccess(null), 2000);
              }}
              title="Copy URL"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-900/30 rounded-md p-3">
            <p className="text-red-400 text-xs font-mono">{error}</p>
            <button
              className="mt-2 px-3 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600 transition-colors font-mono"
              onClick={generateWebhookUrl}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-900/30 rounded-md p-3">
            <p className="text-red-400 text-xs font-mono">
              No webhook URL available. The webhook trigger might not have been
              set up correctly.
            </p>
            <button
              className="mt-2 px-3 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600 transition-colors font-mono"
              onClick={generateWebhookUrl}
            >
              Generate URL
            </button>
          </div>
        )}

        {success && (
          <div className="mt-2 bg-green-900/20 border border-green-900/30 rounded-md p-2">
            <p className="text-green-400 text-xs font-mono">{success}</p>
          </div>
        )}
      </div>

      {/* Tabbed Interface */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-zinc-800">
          <div className="flex">
            <button
              className={`px-4 py-2 text-sm font-medium font-mono ${
                webhookConfig.activeTab === "test"
                  ? "text-yellow-500 border-b-2 border-yellow-500"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
              onClick={() =>
                setWebhookConfig({ ...webhookConfig, activeTab: "test" })
              }
            >
              Test URL
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium font-mono ${
                webhookConfig.activeTab === "response"
                  ? "text-yellow-500 border-b-2 border-yellow-500"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
              onClick={() =>
                setWebhookConfig({ ...webhookConfig, activeTab: "response" })
              }
            >
              See Response
            </button>
          </div>
        </div>

        <div className="flex-1 p-4">
          {webhookConfig.activeTab === "test" ? (
            <div className="space-y-3">
              {webhookConfig.url ? (
                <>
                  <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                    {/* Section title */}
                    <p className="text-xs text-zinc-400 mb-2 font-mono">
                      cURL Command
                    </p>

                    {/* Note above command */}
                    <p className="text-xs text-yellow-500/80 font-mono mb-2">
                      Note: This sends an empty request.
                    </p>

                    {/* Basic command with copy button in styled box */}
                    <div className="flex items-start justify-between bg-zinc-700 p-1 rounded mb-3">
                      <div className="overflow-x-auto max-w-[90%] whitespace-pre-wrap break-all mr-2">
                        <code className="text-xs text-white font-mono">
                          curl -X POST {webhookConfig.url}
                        </code>
                      </div>
                      <button
                        className="text-zinc-400 hover:text-white flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `curl -X POST ${webhookConfig.url}`
                          );
                          setSuccess("Command copied to clipboard!");
                          setTimeout(() => setSuccess(null), 2000);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-zinc-700 mb-2"></div>

                    {/* Command with data */}
                    <p className="text-xs text-yellow-500/80 font-mono mb-2">
                      Use this command to include JSON data:
                    </p>
                    <div className="bg-zinc-700 p-1 rounded overflow-x-auto">
                      <code className="text-xs text-white font-mono whitespace-pre-wrap break-all">
                        curl -X POST {webhookConfig.url} -H "Content-Type:
                        application/json" -d '&#123;"key":"value"&#125;'
                      </code>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      Replace the JSON payload with your own data structure as
                      needed.
                    </p>
                  </div>
                  <button
                    className="w-full px-3 py-2 bg-yellow-600 text-black text-sm rounded hover:bg-yellow-500 transition-colors flex items-center justify-center font-mono"
                    onClick={() =>
                      setWebhookConfig({
                        ...webhookConfig,
                        activeTab: "response",
                      })
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Check Response
                  </button>
                </>
              ) : (
                <p className="text-xs text-zinc-400 font-mono">
                  Generate a webhook URL to test
                </p>
              )}
            </div>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
              <p className="text-xs text-zinc-400 font-mono">
                No test response yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebhookPanel;
