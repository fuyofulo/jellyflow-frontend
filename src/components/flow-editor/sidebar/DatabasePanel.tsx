"use client";

import React, { useState, useEffect } from "react";
import { BaseMetadataPanelProps } from "./BaseMetadataPanel";
import { ActionIcon } from "@/utils/iconMapping";

interface DatabaseConfig {
  connectionString?: string;
  query?: string;
  operation?: "select" | "insert" | "update" | "delete" | "custom";
  tableName?: string;
  databaseType?: "postgres" | "mysql" | "mongodb" | "sqlite" | "other";
  customParams?: string;
  activeTab?: "setup" | "test" | "configure";
}

const DatabasePanel: React.FC<BaseMetadataPanelProps> = ({
  node,
  onMetadataChange,
}) => {
  // Initialize database configurations
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
    connectionString: "",
    query: "",
    operation: "select",
    tableName: "",
    databaseType: "postgres",
    customParams: "",
    activeTab: "setup",
  });

  // Track active tab
  const [activeTab, setActiveTab] = useState<"setup" | "test" | "configure">(
    "setup"
  );

  // Load existing database configuration from node metadata
  useEffect(() => {
    if (node?.data?.metadata?.database) {
      setDatabaseConfig({
        ...databaseConfig,
        ...node.data.metadata.database,
      });

      // Set the active tab if it exists in metadata
      if (node.data.metadata.database.activeTab) {
        setActiveTab(node.data.metadata.database.activeTab);
      }
    }
  }, [node]);

  // Handle tab change
  const handleTabChange = (tab: "setup" | "test" | "configure") => {
    setActiveTab(tab);
    const newConfig = { ...databaseConfig, activeTab: tab };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle connection string change
  const handleConnectionStringChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConnectionString = e.target.value;
    const newConfig = {
      ...databaseConfig,
      connectionString: newConnectionString,
    };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle database type change
  const handleDatabaseTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newDatabaseType = e.target.value as DatabaseConfig["databaseType"];
    const newConfig = { ...databaseConfig, databaseType: newDatabaseType };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle operation type change
  const handleOperationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperation = e.target.value as DatabaseConfig["operation"];
    const newConfig = { ...databaseConfig, operation: newOperation };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle table name change
  const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTableName = e.target.value;
    const newConfig = { ...databaseConfig, tableName: newTableName };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle query change
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newQuery = e.target.value;
    const newConfig = { ...databaseConfig, query: newQuery };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Handle custom parameters change
  const handleCustomParamsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newCustomParams = e.target.value;
    const newConfig = { ...databaseConfig, customParams: newCustomParams };
    setDatabaseConfig(newConfig);
    updateMetadata(newConfig);
  };

  // Update metadata when database config changes
  const updateMetadata = (config: DatabaseConfig) => {
    if (onMetadataChange) {
      // Preserve other metadata fields and update only database-specific fields
      const existingMetadata =
        typeof node.data?.metadata === "object"
          ? node.data.metadata
          : { description: node.data?.label || "", message: "" };

      const metadataUpdate = {
        metadata: {
          ...existingMetadata,
          database: config,
        },
      };
      onMetadataChange(node.id, metadataUpdate);
    }
  };

  // Determine if custom query section should be shown
  const showCustomQuery = databaseConfig.operation === "custom";

  // Get description from node metadata or fall back to a default
  const description =
    typeof node.data?.metadata === "object" && node.data.metadata.description
      ? node.data.metadata.description
      : "Database operations for your workflow";

  return (
    <div className="space-y-4 p-4">
      {/* Database Header with Logo and Description */}
      <div className="flex items-start">
        <div className="p-3 bg-blue-600/20 rounded-md mr-3">
          <ActionIcon
            actionId={node.data?.actionId || "database"}
            width={30}
            height={30}
            className="text-blue-400"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-medium text-white">Database</h2>
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
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("setup")}
          >
            How to Setup
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "test"
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-zinc-400 hover:text-white"
            }`}
            onClick={() => handleTabChange("test")}
          >
            Test
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "configure"
                ? "text-blue-400 border-b-2 border-blue-500"
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
                Follow these steps to set up database connections:
              </p>
            </div>
          )}

          {activeTab === "test" && (
            <div className="text-zinc-400">
              {/* Test content will go here */}
              <p className="mb-4">Test your database connection and queries:</p>
            </div>
          )}

          {activeTab === "configure" && (
            <div className="space-y-4">
              {/* Database Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Database Type
                </label>
                <select
                  value={databaseConfig.databaseType}
                  onChange={handleDatabaseTypeChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="sqlite">SQLite</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Connection String */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Connection String
                </label>
                <input
                  type="text"
                  value={databaseConfig.connectionString}
                  onChange={handleConnectionStringChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                  placeholder="e.g., postgres://username:password@localhost:5432/database"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Connection details will be securely stored.
                </p>
              </div>

              {/* Operation Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Operation
                </label>
                <select
                  value={databaseConfig.operation}
                  onChange={handleOperationChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                >
                  <option value="select">SELECT</option>
                  <option value="insert">INSERT</option>
                  <option value="update">UPDATE</option>
                  <option value="delete">DELETE</option>
                  <option value="custom">Custom Query</option>
                </select>
              </div>

              {/* Table Name - not shown for custom query */}
              {!showCustomQuery && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={databaseConfig.tableName}
                    onChange={handleTableNameChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                    placeholder="Enter table name"
                  />
                </div>
              )}

              {/* Custom Query - only shown for custom query */}
              {showCustomQuery && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    SQL Query
                  </label>
                  <textarea
                    rows={5}
                    value={databaseConfig.query}
                    onChange={handleQueryChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                    placeholder="Enter your SQL query..."
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Write your custom SQL query here. Use ${"{variable}"} for
                    dynamic values.
                  </p>
                </div>
              )}

              {/* Advanced Options */}
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-zinc-300">
                    Advanced Options
                  </h4>
                </div>

                {/* Custom Parameters */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Custom Parameters
                  </label>
                  <textarea
                    rows={3}
                    value={databaseConfig.customParams}
                    onChange={handleCustomParamsChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                    placeholder="Enter custom parameters in JSON format..."
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Specify additional configuration in JSON format.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabasePanel;
