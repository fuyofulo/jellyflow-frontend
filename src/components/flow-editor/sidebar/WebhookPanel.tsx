"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getToken, getAuthHeaders } from "@/utils/auth";
import { CodeBlock } from "@/components/ui/CodeBlock";
import dotenv from "dotenv";

dotenv.config();

// Hardcoded webhook URL
const webhookurl = "http://jellyflow2.duckdns.org:4000";
const backendurl = "https://jellyflow2.duckdns.org:4000";

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

// Add interface for response data
interface WebhookResponse {
  id: string;
  timestamp?: string;
  createdAt?: string;
  zapId?: string;
  metadata?: any;
  data?: any;
}

// Helper function to get webhook URL consistently
const getWebhookUrlRemote = (): string => {
  return webhookurl;
};

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
    activeTab: "response",
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

  // States for responses
  const [webhookResponses, setWebhookResponses] = useState<WebhookResponse[]>(
    []
  );
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [activeResponseIndex, setActiveResponseIndex] = useState(0);

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

        // DIRECT HARDCODING of the full webhook URL
        const fullWebhookUrl = `${webhookurl}/webhook/catch/${userId}/${zapId}`;
        console.log(
          "[WebhookPanel] Using hardcoded webhook URL:",
          fullWebhookUrl
        );

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

      // DIRECT HARDCODING of the full webhook URL
      const fullWebhookUrl = `${webhookurl}/webhook/catch/${userId}/${zapId}`;
      console.log(
        "[WebhookPanel] Using hardcoded webhook URL:",
        fullWebhookUrl
      );

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

  // Load webhook responses
  const loadWebhookResponses = async () => {
    try {
      setIsLoadingResponses(true);
      setResponseError(null);

      // Get zapId from the URL
      const currentUrlPath = window.location.pathname;
      const pathParts = currentUrlPath.split("/");
      const zapId = pathParts[pathParts.length - 1];

      if (!zapId) {
        setResponseError("Could not determine Zap ID");
        setIsLoadingResponses(false);
        return;
      }

      // Use hardcoded backend URL
      console.log(
        "[WebhookPanel] Using hardcoded backend URL for fetching responses:",
        backendurl
      );

      // Make API request to fetch responses
      const response = await fetch(`${backendurl}/api/v1/zap/${zapId}/runs/3`, {
        method: "GET",
        headers: getAuthHeaders(false),
      });

      // Check content type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setResponseError(
          "Server returned non-JSON response. Please try again or contact support."
        );
        setIsLoadingResponses(false);
        return;
      }

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 404) {
          setResponseError(
            "No webhook responses found. Try sending a test request to your webhook URL."
          );
          setWebhookResponses([]);
          setIsLoadingResponses(false);
          return;
        }

        // Try to parse error message if it's JSON
        try {
          const errorData = await response.json();
          setResponseError(
            errorData.message ||
              `Error ${response.status}: ${response.statusText}`
          );
        } catch (parseError) {
          setResponseError(`Error ${response.status}: ${response.statusText}`);
        }
        setIsLoadingResponses(false);
        return;
      }

      // Parse the JSON response safely
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        setResponseError(
          "Failed to parse server response. Server may be experiencing issues."
        );
        setIsLoadingResponses(false);
        return;
      }

      // Extract runs array from the response, adapt to the actual API response structure
      const runs = data.zapRuns || data.runs || data.responses || [];
      setWebhookResponses(runs);
      setActiveResponseIndex(0); // Reset to first response

      if (runs.length === 0) {
        setResponseError(
          "No webhook responses found. Try sending a test request to your webhook URL."
        );
        setIsLoadingResponses(false);
        return;
      }

      // Store the webhook responses in node metadata
      if (onMetadataChange && node && node.id) {
        // Get current metadata to preserve existing fields
        const existingMetadata = node.data?.metadata || {};
        const existingWebhook = existingMetadata.webhook || {};

        // Update metadata with webhookDataReceived flag and store responses
        const metadataUpdate = {
          metadata: {
            ...existingMetadata,
            webhook: {
              ...existingWebhook,
              testCompleted: true, // Mark webhook as tested
              webhookDataReceived: true, // For backward compatibility
            },
            webhookDataReceived: true, // Set flag at root level for validation
            webhookResponses: runs, // Store the actual response data
          },
        };

        // Update the node metadata
        onMetadataChange(node.id, metadataUpdate);
      }
    } catch (error) {
      console.error("Error loading webhook responses:", error);
      setResponseError(
        error instanceof Error
          ? error.message
          : "Failed to load webhook responses"
      );
      setWebhookResponses([]);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  // Function to recursively render JSON
  const renderJsonValue = (value: any, depth = 0): React.ReactNode => {
    if (value === null) return <span className="text-red-400">null</span>;
    if (value === undefined)
      return <span className="text-red-400">undefined</span>;

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        if (value.length === 0)
          return <span className="text-blue-400">[]</span>;

        return (
          <div className="pl-4">
            <span className="text-blue-400">[</span>
            <div className="pl-4">
              {value.map((item, index) => (
                <div key={index} className="flex">
                  <span>
                    {renderJsonValue(item, depth + 1)}
                    {index < value.length - 1 ? "," : ""}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-blue-400">]</span>
          </div>
        );
      } else {
        const keys = Object.keys(value);
        if (keys.length === 0)
          return <span className="text-blue-400">{"{}"}</span>;

        return (
          <div className="pl-4">
            <span className="text-blue-400">{"{"}</span>
            <div className="pl-4">
              {keys.map((key, index) => (
                <div key={key} className="flex">
                  <span className="text-purple-400">&quot;{key}&quot;</span>
                  <span className="text-white mx-1">:</span>
                  <span>
                    {renderJsonValue(value[key], depth + 1)}
                    {index < keys.length - 1 ? "," : ""}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-blue-400">{"}"}</span>
          </div>
        );
      }
    } else if (typeof value === "string") {
      return <span className="text-green-400">&quot;{value}&quot;</span>;
    } else if (typeof value === "number") {
      return <span className="text-yellow-400">{value}</span>;
    } else if (typeof value === "boolean") {
      return <span className="text-yellow-400">{value.toString()}</span>;
    }

    return <span>{String(value)}</span>;
  };

  // Add a useEffect to check for stored webhook responses in the node metadata
  useEffect(() => {
    // Check if we already have webhook responses in the node metadata
    if (
      node?.data?.metadata?.webhookResponses &&
      node.data.metadata.webhookResponses.length > 0
    ) {
      // Set the webhook responses from metadata
      setWebhookResponses(node.data.metadata.webhookResponses);
      setActiveResponseIndex(0); // Show the first response

      // Clear any existing error since we have data
      setResponseError(null);
    }
    // Also check for test completed flag
    else if (
      node?.data?.metadata?.webhook?.testCompleted ||
      node?.data?.metadata?.webhookDataReceived
    ) {
      // If test is completed but no responses stored, we should load them
      loadWebhookResponses();
    }
  }, [node?.id]); // Re-run when the node ID changes

  return (
    <div className="p-4 h-full flex flex-col">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #27272a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #eab308;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f59e0b;
        }
        /* Smaller code block text */
        .smaller-code-block pre,
        .smaller-code-block code {
          font-size: 0.7rem !important;
          line-height: 1.3 !important;
        }
      `}</style>

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

      {/* URL Display - Keep the URL display but remove the test button */}
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
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <button
                className="text-zinc-400 hover:text-white"
                onClick={() => {
                  navigator.clipboard.writeText(webhookConfig.url || "");
                  setSuccess("URL copied to clipboard!");
                  setTimeout(() => setSuccess(null), 2000);
                }}
                title="Copy URL"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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

      {/* Response Section - Simplified to just show responses directly */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4">
          <div className="space-y-3">
            <button
              className="w-full px-3 py-2 bg-yellow-600 text-black text-sm rounded hover:bg-yellow-500 transition-colors flex items-center justify-center font-mono"
              onClick={loadWebhookResponses}
              disabled={isLoadingResponses}
            >
              {isLoadingResponses ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Load Response
                </>
              )}
            </button>

            {responseError && (
              <div className="bg-red-900/20 border border-red-900/30 rounded-md p-3">
                <p className="text-red-400 text-xs font-mono">
                  {responseError}
                </p>
              </div>
            )}

            {webhookResponses.length > 0 && (
              <div className="space-y-4">
                {/* Response tabs */}
                <div className="flex border-b border-zinc-700 mb-3">
                  {webhookResponses.map((_, index) => (
                    <button
                      key={index}
                      className={`px-3 py-1.5 text-xs font-medium font-mono ${
                        activeResponseIndex === index
                          ? "text-yellow-500 border-b-2 border-yellow-500"
                          : "text-zinc-400 hover:text-zinc-300"
                      }`}
                      onClick={() => setActiveResponseIndex(index)}
                    >
                      Response {index + 1}
                    </button>
                  ))}
                </div>

                {/* Active response content */}
                {webhookResponses[activeResponseIndex] && (
                  <div className="bg-zinc-800 border border-black rounded p-0">
                    <p className="text-xs text-zinc-400 font-mono mb-0">
                      {(webhookResponses[activeResponseIndex].timestamp ||
                        webhookResponses[activeResponseIndex].createdAt) && (
                        <span className="text-zinc-500">
                          {new Date(
                            webhookResponses[activeResponseIndex].timestamp ||
                              webhookResponses[activeResponseIndex].createdAt ||
                              ""
                          ).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <div className="max-h-56 overflow-auto custom-scrollbar">
                      <div className="bg-black border border-black code-block">
                        <CodeBlock
                          language="json"
                          filename=""
                          code={JSON.stringify(
                            webhookResponses[activeResponseIndex].metadata ||
                              {},
                            null,
                            2
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookPanel;
