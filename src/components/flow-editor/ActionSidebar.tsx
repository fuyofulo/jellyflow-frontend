"use client";

import React from "react";
import { ActionIcon } from "@/utils/iconMapping";
import { apps, App } from "@/utils/apps";

interface ActionSidebarProps {
  onDragStart: (event: React.DragEvent, action: App) => void;
}

const ActionSidebar: React.FC<ActionSidebarProps> = ({ onDragStart }) => {
  // Group apps by category
  const categories = apps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, App[]>);

  return (
    <div className="w-64 bg-zinc-900 border-l border-yellow-600/30 p-4 overflow-y-auto">
      <h2 className="text-lg font-mono font-bold text-white mb-4">Components</h2>

      {/* Triggers Section */}
      {categories.trigger && (
        <div className="mb-6">
          <h3 className="text-sm font-mono font-semibold text-purple-400 mb-2 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-4 h-4 mr-1"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Triggers
          </h3>
          <div className="space-y-2">
            {categories.trigger.map((app) => (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => onDragStart(e, app)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-purple-900/50 border border-purple-800 cursor-move hover:bg-purple-800 transition-colors"
              >
                <ActionIcon
                  actionId={app.id}
                  actionName={app.name}
                  width={24}
                  height={24}
                />
                <span className="text-sm font-mono text-white">
                  {app.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Section */}
      {categories.action && (
        <div className="mb-6">
          <h3 className="text-sm font-mono font-semibold text-yellow-600 mb-2 flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-4 h-4 mr-1"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Actions
          </h3>
          <div className="space-y-2">
            {categories.action.map((app) => (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => onDragStart(e, app)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-zinc-800 border border-yellow-600/30 cursor-move hover:bg-zinc-700 transition-colors"
              >
                <ActionIcon
                  actionId={app.id}
                  actionName={app.name}
                  width={24}
                  height={24}
                />
                <span className="text-sm font-mono text-white">
                  {app.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionSidebar;
