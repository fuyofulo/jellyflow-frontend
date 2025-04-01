"use client";

import React, { useState, useEffect } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getAuthHeaders } from "@/utils/auth";
import dotenv from "dotenv";

dotenv.config();

const backendurl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendurl) {
  throw new Error("Backend URL not configured");
}


// Type for Telegram-specific configuration
interface TelegramConfig {
  actionEvent?: string;
  username?: string;
  userId?: string;
  updateMessage?: string;
  description?: string;
  isVerified?: boolean;
  // Fields to track variable references
  updateMessageVariables?: string[];
}

// Type for variable references from webhook responses
interface VariableReference {
  path: string;
  label: string;
  value?: any; // Current value
}

// Type for webhook response data
interface WebhookResponseData {
  id: string;
  timestamp?: string;
  createdAt?: string;
  metadata?: any;
  data?: any;
}

const TELEGRAM_ACTION_EVENTS = [
  { id: "getTelegramUpdate", name: "Get Telegram Update" },
];

const TelegramPanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onMetadataChange,
}) => {
  // Debug log to see when TelegramPanel is mounted
  console.log("TelegramPanel is being rendered with node:", node);

  // Initialize Telegram configurations
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    actionEvent: "getTelegramUpdate",
    username: "",
    userId: "",
    updateMessage: "",
    description: "",
    isVerified: false,
    updateMessageVariables: [],
  });

  // Track available variables from webhook response data
  const [availableVariables, setAvailableVariables] = useState<
    VariableReference[]
  >([]);

  // Store webhook response data
  const [webhookResponseData, setWebhookResponseData] = useState<any>(null);

  // Track loading state for webhook data
  const [isLoadingWebhookData, setIsLoadingWebhookData] = useState(false);

  // Error message if webhook data fails to load
  const [webhookDataError, setWebhookDataError] = useState<string | null>(null);

  // Track verification process state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  // Track which field is currently being edited for variable insertion
  const [activeField, setActiveField] = useState<string | null>(null);

  // Load webhook response data for the current zap
  const loadWebhookResponseData = async () => {
    try {
      setIsLoadingWebhookData(true);
      setWebhookDataError(null);

      // Get zapId from the URL
      const currentUrlPath = window.location.pathname;
      const pathParts = currentUrlPath.split("/");
      const zapId = pathParts[pathParts.length - 1];

      if (!zapId) {
        setWebhookDataError("Could not determine Zap ID");
        setIsLoadingWebhookData(false);
        return;
      }

      // Make API request to fetch latest webhook response
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.ZAP_RUNS(zapId, 1)),
        {
          method: "GET",
          headers: getAuthHeaders(false),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setWebhookDataError(
            "No webhook data found. Send a test request to your webhook URL first."
          );
          setIsLoadingWebhookData(false);
          return;
        }
        setWebhookDataError(`Error ${response.status}: ${response.statusText}`);
        setIsLoadingWebhookData(false);
        return;
      }

      const data = await response.json();
      const runs = data.zapRuns || data.runs || data.responses || [];

      if (runs.length === 0) {
        setWebhookDataError(
          "No webhook responses found. Try sending a request to your webhook URL first."
        );
        setIsLoadingWebhookData(false);
        return;
      }

      // Use the most recent webhook response
      const latestResponse = runs[0];
      const webhookData = latestResponse.metadata || {};
      setWebhookResponseData(webhookData);

      // Extract variables from the response data
      const extractedVariables = extractVariablesFromData(webhookData);
      setAvailableVariables(extractedVariables);

      // Set a flag on the root node metadata to indicate webhook data was received
      if (onMetadataChange && node && node.id) {
        // Get current metadata to preserve existing fields
        const existingMetadata = node.data?.metadata || {};

        // Update metadata with webhookDataReceived flag and store the webhook response data
        const metadataUpdate = {
          metadata: {
            ...existingMetadata,
            webhookDataReceived: true,
            webhookResponseData: webhookData,
          },
        };

        // Update the node metadata
        onMetadataChange(node.id, metadataUpdate);
      }
    } catch (error) {
      console.error("Error loading webhook data:", error);
      setWebhookDataError(
        error instanceof Error ? error.message : "Failed to load webhook data"
      );
    } finally {
      setIsLoadingWebhookData(false);
    }
  };

  // Add a useEffect to check for stored webhook data in the node metadata when component mounts
  useEffect(() => {
    // Check if we already have webhook data in the node metadata
    if (node?.data?.metadata?.webhookResponseData) {
      const storedWebhookData = node.data.metadata.webhookResponseData;

      // Set the webhook data and extract variables
      setWebhookResponseData(storedWebhookData);
      const extractedVariables = extractVariablesFromData(storedWebhookData);
      setAvailableVariables(extractedVariables);
    } else {
      // If no stored data, try to load it
      loadWebhookResponseData();
    }
  }, [node?.id]); // Re-run when the node ID changes

  // Extract variables from webhook response data
  const extractVariablesFromData = (
    data: any,
    basePath = "",
    baseLabel = ""
  ): VariableReference[] => {
    if (!data) return [];

    let variables: VariableReference[] = [];

    // Handle different types of data
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data)) {
        // For arrays, create entries for each item with index
        data.forEach((item, index) => {
          const itemPath = `${basePath}[${index}]`;
          const itemLabel = baseLabel ? `${baseLabel}[${index}]` : `[${index}]`;

          if (typeof item === "object" && item !== null) {
            // Recursively extract variables from array items if they are objects
            variables = variables.concat(
              extractVariablesFromData(item, itemPath, itemLabel)
            );
          } else {
            // Add simple array items directly
            variables.push({
              path: itemPath,
              label: itemLabel,
              value: item,
            });
          }
        });
      } else {
        // For objects, create entries for each property
        Object.entries(data).forEach(([key, value]) => {
          const propertyPath = basePath ? `${basePath}.${key}` : key;
          const propertyLabel = baseLabel ? `${baseLabel}.${key}` : key;

          if (typeof value === "object" && value !== null) {
            // Recursively extract variables from nested objects
            variables = variables.concat(
              extractVariablesFromData(value, propertyPath, propertyLabel)
            );
          } else {
            // Add simple properties directly
            variables.push({
              path: propertyPath,
              label: propertyLabel,
              value: value,
            });
          }
        });
      }
    } else {
      // For primitive types, add them directly
      variables.push({
        path: basePath,
        label: baseLabel || "value",
        value: data,
      });
    }

    return variables;
  };

  // Load existing configuration from node metadata if available
  useEffect(() => {
    if (node?.data?.metadata) {
      // Extract Telegram configuration from metadata
      const metadata = node.data.metadata;
      const newConfig: TelegramConfig = {
        actionEvent: metadata.actionEvent || "getTelegramUpdate",
        username: metadata.username || "",
        userId: metadata.userId || "",
        updateMessage: metadata.updateMessage || "",
        description: metadata.description || "",
        isVerified: metadata.isVerified || false,
        updateMessageVariables: metadata.updateMessageVariables || [],
      };

      // Update state with existing config
      setTelegramConfig(newConfig);
    }
  }, [node?.data?.metadata]);

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    setTelegramConfig((prev) => ({ ...prev, description: newDescription }));
    updateMetadata({ ...telegramConfig, description: newDescription });
  };

  // Handle action event change
  const handleActionEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newActionEvent = e.target.value;
    setTelegramConfig((prev) => ({ ...prev, actionEvent: newActionEvent }));
    updateMetadata({ ...telegramConfig, actionEvent: newActionEvent });
  };

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setTelegramConfig((prev) => ({ ...prev, username: newUsername }));
    updateMetadata({ ...telegramConfig, username: newUsername });
  };

  // Handle update message change
  const handleUpdateMessageChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newUpdateMessage = e.target.value;
    setTelegramConfig((prev) => ({ ...prev, updateMessage: newUpdateMessage }));
    updateMetadata({ ...telegramConfig, updateMessage: newUpdateMessage });
  };

  // Handle insertion of variable into update message
  const handleInsertUpdateMessageVariable = (variablePath: string) => {
    // Get current update message text
    const currentText = telegramConfig.updateMessage || "";

    // Insert variable notation at cursor position or at the end
    const variableNotation = `{{${variablePath}}}`;
    const newText = currentText + variableNotation;

    // Update the state and metadata
    setTelegramConfig((prev) => ({
      ...prev,
      updateMessage: newText,
      updateMessageVariables: [
        ...(prev.updateMessageVariables || []),
        variablePath,
      ],
    }));

    // Update metadata with new text and variables
    updateMetadata({
      ...telegramConfig,
      updateMessage: newText,
      updateMessageVariables: [
        ...(telegramConfig.updateMessageVariables || []),
        variablePath,
      ],
    });

    // Clear the active field
    setActiveField(null);
  };

  // Handle verification of Telegram username
  const handleVerifyTelegram = async () => {
    try {
      setIsVerifying(true);
      setVerificationError(null);

      if (!telegramConfig.username) {
        setVerificationError("Please enter a Telegram username first");
        setIsVerifying(false);
        return;
      }

      // Temporarily hardcode backend URL to fix connection issues
      const BACKEND_URL = backendurl;
      console.log(
        `[TelegramPanel] Using backend URL for verification:`,
        BACKEND_URL
      );

      const response = await fetch(
        `${BACKEND_URL}/api/v1/telegram/verify?username=${telegramConfig.username}`,
        {
          method: "GET",
          headers: getAuthHeaders(false),
        }
      );

      console.log("Verification response status:", response.status);

      if (!response.ok) {
        if (response.status === 400) {
          setVerificationError("Missing username");
        } else if (response.status === 404) {
          setVerificationError(
            "User not found. Please make sure you sent the message to the bot"
          );
        } else if (response.status === 500) {
          setVerificationError("Server error. Please try again later");
        } else {
          setVerificationError(
            `Error ${response.status}: ${response.statusText}`
          );
        }
        setIsVerifying(false);
        return;
      }

      // Parse the response to get the userId
      const responseData = await response.json();
      console.log("Verification response data:", responseData);

      const userId = responseData.userId || responseData.user_id || "";
      console.log("Extracted userId:", userId);

      if (!userId) {
        console.error("No userId found in response:", responseData);
        setVerificationError("User ID not found in response");
        setIsVerifying(false);
        return;
      }

      // Important: Create an updated config with all current values plus the new userId
      const updatedConfig = {
        ...telegramConfig,
        isVerified: true,
        userId: userId,
      };

      console.log("Updating config with userId:", userId);
      console.log("Full updated config:", updatedConfig);

      // First update the metadata with the complete config including userId
      updateMetadata(updatedConfig);

      // Then update the state (after metadata is updated)
      setTelegramConfig(updatedConfig);
    } catch (error) {
      console.error("Error verifying Telegram username:", error);
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Failed to verify Telegram username"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Function to handle opening Telegram bot link
  const handleOpenTelegramBot = () => {
    window.open("https://t.me/jellyflow_bot?start=start", "_blank");
  };

  // Update node metadata with current configuration
  const updateMetadata = (config: TelegramConfig) => {
    if (onMetadataChange) {
      // Create a metadata object that explicitly includes all fields
      const metadata = {
        description: config.description || "",
        actionEvent: config.actionEvent || "getTelegramUpdate",
        username: config.username || "",
        userId: config.userId || "", // Explicitly include userId
        updateMessage: config.updateMessage || "",
        isVerified: config.isVerified || false,
        updateMessageVariables: config.updateMessageVariables || [],
        // Preserve any existing webhook data
        webhookDataReceived: node?.data?.metadata?.webhookDataReceived || false,
        webhookResponseData: node?.data?.metadata?.webhookResponseData || null,
      };

      // Log the metadata being updated
      console.log("Updating metadata with:", metadata);
      console.log("userId in metadata:", metadata.userId);

      const metadataUpdate = {
        metadata: metadata,
        label: config.description || "Telegram",
      };

      onMetadataChange(node.id, metadataUpdate);
    }
  };

  // Filter available variables by field type
  const getFilteredVariablesForField = (fieldType: "text" | "any") => {
    if (!availableVariables) return [];

    // For 'any' field type, return all variables
    if (fieldType === "any") return availableVariables;

    // For 'text' field type, return all variables (could be filtered further if needed)
    return availableVariables;
  };

  // Render variable selector dropdown
  const renderVariableSelector = (
    fieldType: "text" | "any",
    onSelectVariable: (path: string) => void
  ) => {
    const filteredVariables = getFilteredVariablesForField(fieldType);

    if (filteredVariables.length === 0) {
      return (
        <div className="flex items-center px-3 py-2 mt-1 text-xs text-gray-500 bg-zinc-800 rounded border border-zinc-700">
          No variables available. Run a test webhook request first.
        </div>
      );
    }

    return (
      <div className="mt-2 p-2 bg-zinc-800 border border-zinc-700 rounded max-h-40 overflow-y-auto">
        <div className="space-y-1">
          {filteredVariables.map((variable) => (
            <button
              key={variable.path}
              type="button"
              className="w-full text-left text-xs py-1 px-2 text-zinc-300 hover:bg-zinc-700 rounded"
              onClick={() => onSelectVariable(variable.path)}
            >
              {variable.label}
              {variable.value !== undefined && (
                <span className="text-xs text-zinc-500 ml-2">
                  (
                  {typeof variable.value === "string"
                    ? variable.value.substring(0, 10) +
                      (variable.value.length > 10 ? "..." : "")
                    : typeof variable.value}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 h-full flex flex-col text-xs">
      {/* Telegram Header with Logo */}
      <div className="flex items-center mb-2">
        <div className="p-1.5 bg-yellow-600/20 rounded-md mr-2">
          <ActionIcon
            actionId={node.data?.actionId || "telegram"}
            width={18}
            height={18}
            className="text-yellow-400"
          />
        </div>
        <div>
          <h2 className="text-sm font-medium text-white font-mono">Telegram</h2>
        </div>
      </div>

      {/* Description Input Field */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
          Description
        </label>
        <input
          type="text"
          value={telegramConfig.description || ""}
          onChange={handleDescriptionChange}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
          placeholder="Add a description for this Telegram action"
        />
      </div>

      {/* Webhook Data Status */}
      {!webhookResponseData && !isLoadingWebhookData && (
        <div className="mb-2 bg-zinc-800 border border-zinc-700 rounded p-2">
          <p className="text-yellow-400 text-xs font-mono mb-1">
            Webhook Response Data
          </p>
          <p className="text-zinc-400 text-xs">
            {webhookDataError ||
              "No webhook response data available. Make sure you have a webhook trigger and have sent data to it."}
          </p>
          <button
            className="mt-1 px-2 py-1 bg-yellow-600 text-black text-xs rounded hover:bg-yellow-500 transition-colors font-mono"
            onClick={loadWebhookResponseData}
            disabled={isLoadingWebhookData}
          >
            {isLoadingWebhookData ? "Loading..." : "Refresh Data"}
          </button>
        </div>
      )}

      {/* Action Event Selection */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
          Action Event
        </label>
        <select
          value={telegramConfig.actionEvent || "getTelegramUpdate"}
          onChange={handleActionEventChange}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
        >
          {TELEGRAM_ACTION_EVENTS.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {/* Telegram Configuration Section */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        <div className="bg-zinc-800 border border-zinc-700 rounded p-2">
          <p className="text-xs text-zinc-400 mb-2 font-mono">
            Telegram Configuration
          </p>

          {/* Username Field */}
          <div className="mb-2 relative">
            <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
              Telegram Username
            </label>
            <input
              type="text"
              value={telegramConfig.username || ""}
              onChange={handleUsernameChange}
              className="w-full bg-zinc-700 border border-zinc-600 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
              placeholder="Enter your Telegram username"
            />
          </div>

          {/* Telegram Bot Verification Section */}
          <div className="mb-2">
            <div className="flex space-x-2 mt-1">
              <button
                type="button"
                onClick={handleOpenTelegramBot}
                className="flex-1 text-xs bg-yellow-600/80 hover:bg-yellow-600 text-white px-2 py-1 rounded transition-colors font-mono"
              >
                Send jellyflow bot a message
              </button>
              <button
                type="button"
                onClick={handleVerifyTelegram}
                disabled={isVerifying || !telegramConfig.username}
                className={`text-xs px-2 py-1 rounded font-mono ${
                  telegramConfig.isVerified
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-yellow-600/80 hover:bg-yellow-600 text-white"
                } ${
                  isVerifying || !telegramConfig.username
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isVerifying
                  ? "Verifying..."
                  : telegramConfig.isVerified
                  ? "Verified"
                  : "Verify"}
              </button>
            </div>
            {verificationError && (
              <p className="text-xs text-red-500 mt-1 font-mono">
                {verificationError}
              </p>
            )}
            {telegramConfig.isVerified && (
              <p className="text-xs text-green-500 mt-1 font-mono">
                Telegram account verified successfully!
              </p>
            )}
          </div>
        </div>

        {/* Update Message Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded p-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
            Enter message we should send you
          </label>
          <div className="flex flex-col">
            <textarea
              value={telegramConfig.updateMessage || ""}
              onChange={handleUpdateMessageChange}
              onFocus={() => setActiveField("updateMessage")}
              className="w-full bg-zinc-700 border border-zinc-600 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono resize-none"
              rows={6}
              placeholder="Enter the message that should be sent to your Telegram"
            />
            <div className="flex mt-1 justify-end">
              <button
                type="button"
                onClick={() =>
                  setActiveField(
                    activeField === "updateMessage" ? null : "updateMessage"
                  )
                }
                className="bg-yellow-600/80 hover:bg-yellow-600 text-white rounded px-2 py-0.5 text-xs flex items-center font-mono"
                title="Insert variable from webhook response"
                disabled={!webhookResponseData}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-2.5 h-2.5 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
                Insert Variable
              </button>
            </div>
          </div>

          {/* Show variable selector when updateMessage field is active */}
          {activeField === "updateMessage" && (
            <div className="fixed right-4 mt-1 w-64 max-h-48 overflow-auto rounded-md bg-zinc-800 shadow-lg border border-zinc-600">
              <div className="py-1">
                {availableVariables.length > 0 ? (
                  availableVariables.map((variable, index) => (
                    <button
                      key={`${variable.path}-${index}`}
                      className="w-full text-left px-2 py-1 text-xs text-white hover:bg-zinc-700 flex items-center justify-between"
                      onClick={() =>
                        handleInsertUpdateMessageVariable(variable.path)
                      }
                    >
                      <span className="font-mono text-xs truncate max-w-[100px]">
                        {variable.label}
                      </span>
                      <span className="text-xs text-zinc-400 truncate max-w-[100px] ml-1">
                        {String(variable.value)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-400">
                    No variables available from webhook response
                  </div>
                )}
                <button
                  className="w-full text-left px-3 py-1 text-xs text-red-400 hover:bg-zinc-700 border-t border-zinc-600"
                  onClick={() => setActiveField(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Variable Usage Instructions */}
          <div className="mt-3 pt-2 border-t border-zinc-700">
            <p className="text-xs text-zinc-400 font-mono">
              <span className="font-medium text-yellow-500">Variables:</span>{" "}
              Insert webhook data using the variable button. Variables appear as{" "}
              {`{{variableName}}`}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramPanel;
