import { create } from "zustand";

interface NodeOutputData {
  [nodeId: string]: any;
}

interface MetadataStore {
  // Map of node IDs to their output data (available to downstream nodes)
  nodeOutputData: NodeOutputData;

  // Set output data for a specific node
  setNodeOutputData: (nodeId: string, data: any) => void;

  // Get output data for a node (or null if not available)
  getNodeOutputData: (nodeId: string) => any;

  // Get all available output data from upstream nodes
  getUpstreamOutputData: (nodeIds: string[]) => NodeOutputData;

  // Clear data for a specific node
  clearNodeOutputData: (nodeId: string) => void;

  // Clear all stored data
  clearAllOutputData: () => void;
}

export const useMetadataStore = create<MetadataStore>((set, get) => ({
  nodeOutputData: {},

  setNodeOutputData: (nodeId, data) =>
    set((state) => ({
      nodeOutputData: {
        ...state.nodeOutputData,
        [nodeId]: data,
      },
    })),

  getNodeOutputData: (nodeId) => {
    return get().nodeOutputData[nodeId] || null;
  },

  getUpstreamOutputData: (nodeIds) => {
    const { nodeOutputData } = get();
    const upstreamData: NodeOutputData = {};

    nodeIds.forEach((nodeId) => {
      if (nodeOutputData[nodeId]) {
        upstreamData[nodeId] = nodeOutputData[nodeId];
      }
    });

    return upstreamData;
  },

  clearNodeOutputData: (nodeId) =>
    set((state) => {
      const newNodeOutputData = { ...state.nodeOutputData };
      delete newNodeOutputData[nodeId];
      return { nodeOutputData: newNodeOutputData };
    }),

  clearAllOutputData: () => set({ nodeOutputData: {} }),
}));
