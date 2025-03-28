"use client";

import React, { useState, useEffect } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { getAuthHeaders } from "@/utils/auth";

// Type for email-specific configuration
interface EmailConfig {
  actionEvent?: string;
  recipients?: string[]; // Change to array for multiple recipients
  subject?: string;
  body?: string;
  description?: string;
  // Fields to track variable references
  recipientVariables?: string[]; // Change to array for multiple variables
  subjectVariable?: string;
  bodyVariables?: string[];
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

const EMAIL_ACTION_EVENTS = [{ id: "sendEmail", name: "Send Email" }];

const EmailPanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onMetadataChange,
}) => {
  // Debug log to see when EmailPanel is mounted
  console.log("EmailPanel is being rendered with node:", node);

  // Initialize email configurations
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    actionEvent: "sendEmail",
    recipients: [""], // Initialize with one empty recipient
    subject: "",
    body: "",
    description: "",
    recipientVariables: [], // Initialize as array
    subjectVariable: "",
    bodyVariables: [],
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

  // Track which field is currently being edited for variable insertion
  const [activeField, setActiveField] = useState<string | null>(null);

  // Track which recipient index is being edited (for variable insertion)
  const [activeRecipientIndex, setActiveRecipientIndex] = useState<
    number | null
  >(null);

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
            // Add nested variables for complex objects
            variables = [
              ...variables,
              ...extractVariablesFromData(item, itemPath, itemLabel),
            ];
          } else {
            // Add simple value
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
          const propPath = basePath ? `${basePath}.${key}` : key;
          const propLabel = baseLabel ? `${baseLabel}.${key}` : key;

          if (typeof value === "object" && value !== null) {
            // Add nested variables for complex objects
            variables = [
              ...variables,
              ...extractVariablesFromData(value, propPath, propLabel),
            ];
          } else {
            // Add simple value
            variables.push({
              path: propPath,
              label: propLabel,
              value,
            });
          }
        });
      }
    } else {
      // For primitive values
      variables.push({
        path: basePath || "value",
        label: baseLabel || "Value",
        value: data,
      });
    }

    return variables;
  };

  // Load existing email configuration from node metadata
  useEffect(() => {
    // Initialize description from node metadata
    const description =
      typeof node.data?.metadata === "object" && node.data.metadata.description
        ? node.data.metadata.description
        : node.data?.label || "";

    // Check if we have metadata in the new structure
    if (
      typeof node.data?.metadata === "object" &&
      (node.data.metadata.actionEvent || node.data.metadata["action event"]) &&
      node.data.metadata.data
    ) {
      // Load from new metadata structure
      const metadata = node.data.metadata;
      // Support both formats for backward compatibility
      const actionEvent = metadata.actionEvent || metadata["action event"];
      const data = metadata.data;

      // Get recipients as array
      const recipients = Array.isArray(data.recipients)
        ? data.recipients
        : data.recipients
        ? [data.recipients]
        : [""];

      setEmailConfig({
        ...emailConfig,
        actionEvent,
        recipients,
        subject: data.subject || "",
        body: data.body || "",
        description,
      });
    }
    // Backward compatibility with old metadata structure
    else if (node?.data?.metadata?.email) {
      const existingConfig = node.data.metadata.email;

      // Handle backward compatibility for recipient -> recipients
      const recipients =
        existingConfig.recipients ||
        (existingConfig.recipient ? [existingConfig.recipient] : [""]);

      setEmailConfig({
        ...emailConfig,
        ...existingConfig,
        recipients,
        description,
      });
    } else {
      setEmailConfig({
        ...emailConfig,
        description,
      });
    }
  }, [node]);

  // Update email description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    const newConfig = { ...emailConfig, description: newDescription };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle action event selection
  const handleActionEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const actionEvent = e.target.value;
    const newConfig = { ...emailConfig, actionEvent };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update email recipient at specific index
  const handleRecipientChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const newRecipients = [...(emailConfig.recipients || [""])];
    newRecipients[index] = e.target.value;
    const newConfig = { ...emailConfig, recipients: newRecipients };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Add a new recipient field
  const handleAddRecipient = () => {
    const newRecipients = [...(emailConfig.recipients || [""]), ""];
    const newConfig = { ...emailConfig, recipients: newRecipients };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Remove a recipient field
  const handleRemoveRecipient = (index: number) => {
    if ((emailConfig.recipients?.length || 0) <= 1) return; // Keep at least one recipient

    const newRecipients = [...(emailConfig.recipients || [""])];
    newRecipients.splice(index, 1);
    const newConfig = { ...emailConfig, recipients: newRecipients };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Set a variable as the recipient at specific index
  const handleRecipientVariableChange = (
    variablePath: string,
    index: number
  ) => {
    const newRecipients = [...(emailConfig.recipients || [""])];
    newRecipients[index] = `{{${variablePath}}}`;

    const newRecipientVariables = [...(emailConfig.recipientVariables || [])];
    newRecipientVariables[index] = variablePath;

    const newConfig = {
      ...emailConfig,
      recipients: newRecipients,
      recipientVariables: newRecipientVariables,
    };

    setEmailConfig(newConfig);
    updateMetadata(newConfig);
    setActiveField(null);
    setActiveRecipientIndex(null);
  };

  // Update email subject
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubject = e.target.value;
    const newConfig = { ...emailConfig, subject: newSubject };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Insert a variable into the subject at cursor position (similar to body)
  const handleInsertSubjectVariable = (variablePath: string) => {
    // Get cursor position from activeField element
    const input = document.getElementById("email-subject") as HTMLInputElement;
    if (!input) return;

    const cursorPos = input.selectionStart || 0;
    const textBefore = emailConfig.subject?.substring(0, cursorPos) || "";
    const textAfter = emailConfig.subject?.substring(cursorPos) || "";

    // Insert the variable at cursor position
    const newSubject = `${textBefore}{{${variablePath}}}${textAfter}`;

    // Update state and metadata
    const newBodyVariables = [...(emailConfig.bodyVariables || [])];
    if (!newBodyVariables.includes(variablePath)) {
      newBodyVariables.push(variablePath);
    }

    const newConfig = {
      ...emailConfig,
      subject: newSubject,
      bodyVariables: newBodyVariables, // Reuse bodyVariables for tracking (or create a new array if needed)
    };

    setEmailConfig(newConfig);
    updateMetadata(newConfig);
    setActiveField(null);

    // Refocus the input (after a small delay to allow rendering)
    setTimeout(() => {
      input.focus();
      // Position cursor after the inserted variable
      const newCursorPos = cursorPos + variablePath.length + 4; // +4 for {{ and }}
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Update email body
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    const newConfig = { ...emailConfig, body: newBody };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Insert a variable into the body at cursor position
  const handleInsertBodyVariable = (variablePath: string) => {
    // Get cursor position from activeField element
    const textarea = document.getElementById(
      "email-body"
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = emailConfig.body?.substring(0, cursorPos) || "";
    const textAfter = emailConfig.body?.substring(cursorPos) || "";

    // Insert the variable at cursor position
    const newBody = `${textBefore}{{${variablePath}}}${textAfter}`;

    // Update state and metadata
    const newBodyVariables = [...(emailConfig.bodyVariables || [])];
    if (!newBodyVariables.includes(variablePath)) {
      newBodyVariables.push(variablePath);
    }

    const newConfig = {
      ...emailConfig,
      body: newBody,
      bodyVariables: newBodyVariables,
    };

    setEmailConfig(newConfig);
    updateMetadata(newConfig);
    setActiveField(null);

    // Refocus the textarea (after a small delay to allow rendering)
    setTimeout(() => {
      textarea.focus();
      // Position cursor after the inserted variable
      const newCursorPos = cursorPos + variablePath.length + 4; // +4 for {{ and }}
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Update metadata when email config changes
  const updateMetadata = (config: EmailConfig) => {
    if (onMetadataChange) {
      // Format metadata according to the requested structure
      const metadataUpdate = {
        metadata: {
          description: config.description || "",
          actionEvent: config.actionEvent,
          data: {
            recipients: config.recipients || [""],
            subject: config.subject || "",
            body: config.body || "",
          },
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  // Filter variables based on data type (e.g., email for recipient field)
  const getFilteredVariablesForField = (
    fieldType: "email" | "text" | "any"
  ) => {
    if (fieldType === "email") {
      // Only return variables that look like emails
      return availableVariables.filter(
        (v) =>
          typeof v.value === "string" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.value))
      );
    } else if (fieldType === "text") {
      // Return all string variables
      return availableVariables.filter((v) => typeof v.value === "string");
    } else {
      // Return all variables
      return availableVariables;
    }
  };

  // Render variable selection dropdown
  const renderVariableSelector = (
    fieldType: "email" | "text" | "any",
    onSelectVariable: (path: string) => void
  ) => {
    const filteredVariables = getFilteredVariablesForField(fieldType);

    return (
      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md bg-zinc-800 shadow-lg border border-zinc-600">
        <div className="py-1">
          {filteredVariables.length > 0 ? (
            filteredVariables.map((variable, index) => (
              <button
                key={`${variable.path}-${index}`}
                className="w-full text-left px-2 py-1 text-xs text-white hover:bg-zinc-700 flex items-center justify-between"
                onClick={() => onSelectVariable(variable.path)}
              >
                <span className="font-mono text-xs">{variable.label}</span>
                <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                  {String(variable.value)}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-zinc-400">
              {fieldType === "email"
                ? "No email variables available from webhook response"
                : "No variables available from webhook response"}
            </div>
          )}
          <button
            className="w-full text-left px-3 py-1 text-xs text-red-400 hover:bg-zinc-700 border-t border-zinc-600"
            onClick={() => {
              setActiveField(null);
              setActiveRecipientIndex(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 h-full flex flex-col text-xs">
      {/* Email Header with Logo */}
      <div className="flex items-center mb-2">
        <div className="p-1.5 bg-yellow-600/20 rounded-md mr-2">
          <ActionIcon
            actionId={node.data?.actionId || "email"}
            width={18}
            height={18}
            className="text-yellow-400"
          />
        </div>
        <div>
          <h2 className="text-sm font-medium text-white font-mono">Email</h2>
        </div>
      </div>

      {/* Description Input Field */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
          Description
        </label>
        <input
          type="text"
          value={emailConfig.description || ""}
          onChange={handleDescriptionChange}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
          placeholder="Add a description for this email action"
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
          value={emailConfig.actionEvent}
          onChange={handleActionEventChange}
          className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
        >
          {EMAIL_ACTION_EVENTS.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {/* Email Form Fields */}
      {emailConfig.actionEvent === "sendEmail" && (
        <div className="space-y-3 flex-1 overflow-y-auto">
          <div className="bg-zinc-800 border border-zinc-700 rounded p-2">
            <p className="text-xs text-zinc-400 mb-2 font-mono">
              Email Configuration
            </p>

            {/* To/Recipients with Multiple Recipient Support */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
                Recipients
              </label>

              {/* Recipient Fields */}
              {(emailConfig.recipients || [""]).map((recipient, index) => (
                <div
                  key={`recipient-${index}`}
                  className="mb-1 relative flex items-center"
                >
                  <div className="flex-1 flex relative">
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => handleRecipientChange(e, index)}
                      className="w-full bg-zinc-700 border border-zinc-600 rounded-l text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
                      placeholder="recipient@example.com"
                    />
                    <div className="flex border-zinc-600 border-t border-b">
                      {/* Variable Selection Button */}
                      <button
                        onClick={() => {
                          setActiveField("recipient");
                          setActiveRecipientIndex(index);
                        }}
                        className="bg-yellow-600/80 hover:bg-yellow-600 text-white px-1.5 flex items-center"
                        title="Insert variable from webhook response"
                        disabled={!webhookResponseData}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-3 h-3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                          />
                        </svg>
                      </button>

                      {/* Remove Recipient Button */}
                      {(emailConfig.recipients?.length || 0) > 1 && (
                        <button
                          onClick={() => handleRemoveRecipient(index)}
                          className="bg-red-700 hover:bg-red-600 text-white px-1.5 flex items-center"
                          title="Remove this recipient"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 12h-15"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Add Recipient Button - only on the last row */}
                      {index === (emailConfig.recipients?.length || 1) - 1 && (
                        <button
                          onClick={handleAddRecipient}
                          className="bg-green-700 hover:bg-green-600 text-white rounded-r px-1.5 flex items-center"
                          title="Add another recipient"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-3 h-3"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        </button>
                      )}

                      {/* If not the last row and we don't have a remove button, add rounded corner */}
                      {index !== (emailConfig.recipients?.length || 1) - 1 &&
                        (emailConfig.recipients?.length || 0) <= 1 && (
                          <div className="bg-zinc-600 rounded-r w-1.5"></div>
                        )}
                    </div>
                  </div>

                  {activeField === "recipient" &&
                    activeRecipientIndex === index &&
                    renderVariableSelector("email", (path) =>
                      handleRecipientVariableChange(path, index)
                    )}
                </div>
              ))}
            </div>

            {/* Subject with Variable Insertion at Cursor Position */}
            <div className="mb-2 relative">
              <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
                Subject
              </label>
              <div className="flex">
                <input
                  id="email-subject"
                  type="text"
                  value={emailConfig.subject || ""}
                  onChange={handleSubjectChange}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-l text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
                  placeholder="Email subject"
                />
                <button
                  onClick={() =>
                    setActiveField(activeField === "subject" ? null : "subject")
                  }
                  className="bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-r px-1.5 flex items-center"
                  title="Insert variable from webhook response"
                  disabled={!webhookResponseData}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                    />
                  </svg>
                </button>
              </div>
              {activeField === "subject" &&
                renderVariableSelector("any", handleInsertSubjectVariable)}
            </div>

            {/* Body with Variable Selection */}
            <div className="relative">
              <label className="block text-xs font-medium text-zinc-400 mb-1 font-mono">
                Body
              </label>
              <div className="flex flex-col">
                <textarea
                  id="email-body"
                  rows={6}
                  value={emailConfig.body || ""}
                  onChange={handleBodyChange}
                  onFocus={() => setActiveField("body")}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded text-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500/50 font-mono"
                  placeholder="Enter the email content..."
                />
                <div className="flex mt-1 justify-end">
                  <button
                    onClick={() =>
                      setActiveField(
                        activeField === "body-vars" ? null : "body-vars"
                      )
                    }
                    className="bg-yellow-600/80 hover:bg-yellow-600 text-white rounded px-2 py-0.5 text-xs flex items-center"
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
              {activeField === "body-vars" &&
                renderVariableSelector("any", handleInsertBodyVariable)}
            </div>

            {/* Variable Usage Instructions */}
            <div className="mt-3 pt-2 border-t border-zinc-700">
              <p className="text-xs text-zinc-400 font-mono">
                <span className="font-medium text-yellow-500">Variables:</span>{" "}
                Insert webhook data using the dropdown buttons. Variables appear
                as {`{{variableName}}`}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPanel;
