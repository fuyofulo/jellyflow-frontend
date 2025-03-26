"use client";

import React, { useState, useEffect } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";

// Type for email-specific configuration
interface EmailConfig {
  recipient?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
  activeTab?: "setup" | "test" | "configure";
}

const EmailPanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onMetadataChange,
}) => {
  // Initialize email configurations
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    recipient: "",
    subject: "",
    body: "",
    cc: "",
    bcc: "",
    isHtml: false,
    activeTab: "setup",
  });

  // Track active tab
  const [activeTab, setActiveTab] = useState<"setup" | "test" | "configure">(
    "setup"
  );

  // Load existing email configuration from node metadata
  useEffect(() => {
    if (node?.data?.metadata?.email) {
      setEmailConfig({
        ...emailConfig,
        ...node.data.metadata.email,
      });

      // Set the active tab if it exists in metadata
      if (node.data.metadata.email.activeTab) {
        setActiveTab(node.data.metadata.email.activeTab);
      }
    }
  }, [node]);

  // Handle tab change
  const handleTabChange = (tab: "setup" | "test" | "configure") => {
    setActiveTab(tab);
    const newConfig = { ...emailConfig, activeTab: tab };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update email recipient
  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRecipient = e.target.value;
    const newConfig = { ...emailConfig, recipient: newRecipient };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update email subject
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubject = e.target.value;
    const newConfig = { ...emailConfig, subject: newSubject };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update email body
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    const newConfig = { ...emailConfig, body: newBody };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Toggle HTML mode
  const handleHtmlToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isHtml = e.target.checked;
    const newConfig = { ...emailConfig, isHtml };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update CC recipients
  const handleCcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCc = e.target.value;
    const newConfig = { ...emailConfig, cc: newCc };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update BCC recipients
  const handleBccChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBcc = e.target.value;
    const newConfig = { ...emailConfig, bcc: newBcc };
    setEmailConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update metadata when email config changes
  const updateMetadata = (config: EmailConfig) => {
    if (onMetadataChange) {
      // Preserve other metadata fields and update only email-specific fields
      const existingMetadata =
        typeof node.data?.metadata === "object"
          ? node.data.metadata
          : { description: node.data?.label || "", message: "" };

      const metadataUpdate = {
        metadata: {
          ...existingMetadata,
          email: config,
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  // Get description from node metadata or fall back to a default
  const description =
    typeof node.data?.metadata === "object" && node.data.metadata.description
      ? node.data.metadata.description
      : "Send emails to your recipients";

  return (
    <div className="space-y-4 p-4">
      {/* Email Header with Logo and Description */}
      <div className="flex items-start">
        <div className="p-3 bg-yellow-600/20 rounded-md mr-3">
          <ActionIcon
            actionId={node.data?.actionId || "email"}
            width={30}
            height={30}
            className="text-yellow-400"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-medium text-white">Email</h2>
          <p className="text-sm text-zinc-400 mt-1">{description}</p>
        </div>
      </div>

      {/* Tabbed sections */}
      <div className="mt-6 border border-zinc-800 rounded-md overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800">
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "setup"
                ? "text-yellow-400 border-b-2 border-yellow-500"
                : "text-zinc-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("setup")}
          >
            How to Setup
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "test"
                ? "text-yellow-400 border-b-2 border-yellow-500"
                : "text-zinc-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("test")}
          >
            Test
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "configure"
                ? "text-yellow-400 border-b-2 border-yellow-500"
                : "text-zinc-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("configure")}
          >
            Configure
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 bg-zinc-900/30">
          {activeTab === "setup" && (
            <div className="text-zinc-400">
              {/* How to Setup content will go here */}
              <p className="mb-4">
                Follow these steps to set up email notifications:
              </p>
            </div>
          )}

          {activeTab === "test" && (
            <div className="text-zinc-400">
              {/* Test content will go here */}
              <p className="mb-4">Test your email configuration:</p>
            </div>
          )}

          {activeTab === "configure" && (
            <div className="space-y-4">
              {/* Configure tab content */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  To
                </label>
                <input
                  type="text"
                  value={emailConfig.recipient}
                  onChange={handleRecipientChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="recipient@example.com"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter the email recipient. Separate multiple recipients with
                  commas.
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailConfig.subject}
                  onChange={handleSubjectChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="Email subject"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Email Body
                </label>
                <textarea
                  rows={6}
                  value={emailConfig.body}
                  onChange={handleBodyChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                  placeholder="Enter the email content..."
                />
              </div>

              {/* HTML Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isHtml"
                  checked={emailConfig.isHtml}
                  onChange={handleHtmlToggle}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-yellow-600 focus:ring-yellow-600"
                />
                <label
                  htmlFor="isHtml"
                  className="ml-2 block text-sm text-zinc-400"
                >
                  Send as HTML
                </label>
              </div>

              {/* Advanced options collapsible section */}
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-zinc-300">
                    Advanced Options
                  </h4>
                </div>

                {/* CC */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    CC
                  </label>
                  <input
                    type="text"
                    value={emailConfig.cc}
                    onChange={handleCcChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                    placeholder="cc@example.com"
                  />
                </div>

                {/* BCC */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    BCC
                  </label>
                  <input
                    type="text"
                    value={emailConfig.bcc}
                    onChange={handleBccChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600/50"
                    placeholder="bcc@example.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailPanel;
