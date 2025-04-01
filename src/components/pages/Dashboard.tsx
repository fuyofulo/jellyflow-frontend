"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthHeaders,
  handleAuthError,
  isAuthenticated,
  removeToken,
  getToken,
} from "@/utils/auth";
import { fetchMockZaps, toggleMockZap } from "@/mocks/zapData";
import { AuthenticatedNavbar } from "../navigation/Navbar";
import { ActionIcon } from "@/utils/iconMapping"; // For development, set to false to use the real API
import { devOnly } from "@/utils/environment";
import { useEnvironment } from "@/hooks/useEnvironment";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import ConfirmationDialog from "../ui/ConfirmationDialog";

// For development, set to false to use the real API
const USE_MOCK_DATA = devOnly(false, false);

// Types
interface ActionType {
  id: string;
  name: string;
  image: string;
}

interface Action {
  id: string;
  zapId: string;
  actionId: string;
  metadata: Record<string, any>;
  sortingOrder: number;
  type: ActionType;
}

interface Zap {
  id: string;
  zapName: string;
  AvailableTriggerId: string;
  userId: number;
  isActive: boolean;
  lastEdited: string;
  actions: Action[];
  trigger: any | null;
}

interface ZapResponse {
  zaps: Zap[];
}

const Dashboard = () => {
  const router = useRouter();
  const { backendUrl } = useEnvironment();
  const [publishedZaps, setPublishedZaps] = useState<Zap[]>([]);
  const [unpublishedZaps, setUnpublishedZaps] = useState<Zap[]>([]);
  const [filteredZaps, setFilteredZaps] = useState<Zap[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [selectedZaps, setSelectedZaps] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogState, setDeleteDialogState] = useState({
    isSuccess: false,
    isLoading: false,
    zapId: "",
    zapName: "",
  });
  const [showPublished, setShowPublished] = useState(true);

  // Get current zaps based on the toggle and search query
  const currentZaps = useMemo(() => {
    const baseZaps = showPublished ? publishedZaps : unpublishedZaps;
    if (!searchQuery.trim()) return baseZaps;

    const lowercaseQuery = searchQuery.toLowerCase();
    return baseZaps.filter((zap) =>
      zap.zapName.toLowerCase().includes(lowercaseQuery)
    );
  }, [showPublished, publishedZaps, unpublishedZaps, searchQuery]);

  // Count of selected zaps
  const selectedCount = Object.values(selectedZaps).filter(Boolean).length;

  const fetchZaps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (USE_MOCK_DATA) {
        // Use mock data for testing
        const mockData = await fetchMockZaps();
        const mockZaps = mockData.zaps.map((mockZap) => ({
          id: mockZap.id,
          zapName: mockZap.name,
          AvailableTriggerId: "",
          userId: 1,
          isActive: mockZap.isRunning,
          lastEdited: mockZap.lastEdited,
          actions: mockZap.flow.map((flow, index) => ({
            id: `action-${index}`,
            zapId: mockZap.id,
            actionId: flow,
            metadata: {},
            sortingOrder: index,
            type: {
              id: flow,
              name: `Action ${index + 1}`,
              image: "lol",
            },
          })),
          trigger: null,
        }));
        setPublishedZaps(mockZaps);
        setUnpublishedZaps([]);
        setFilteredZaps(mockZaps);
        setUsername(mockData.username || "User");
        setLoading(false);
        return;
      }

      console.log("Fetching zaps from:", backendUrl);

      const token = getToken();
      if (!token) {
        setError(
          "Authentication token missing. Please sign in to view your zaps."
        );
        setPublishedZaps([]);
        setUnpublishedZaps([]);
        setLoading(false);
        return;
      }

      const publishedUrl = buildApiUrl(API_ENDPOINTS.ZAPS_PUBLISHED);
      const unpublishedUrl = buildApiUrl(API_ENDPOINTS.ZAPS_UNPUBLISHED);

      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: token,
      };

      try {
        // Fetch both published and unpublished zaps in parallel
        const [publishedResponse, unpublishedResponse] = await Promise.all([
          fetch(publishedUrl, { method: "GET", headers: authHeaders }),
          fetch(unpublishedUrl, { method: "GET", headers: authHeaders }),
        ]);

        // If either request fails with 401, retry both with Bearer prefix
        if (
          publishedResponse.status === 401 ||
          unpublishedResponse.status === 401
        ) {
          const bearerHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };

          const [newPublishedResponse, newUnpublishedResponse] =
            await Promise.all([
              fetch(publishedUrl, { method: "GET", headers: bearerHeaders }),
              fetch(unpublishedUrl, { method: "GET", headers: bearerHeaders }),
            ]);

          // Process the responses
          const publishedZapsData = newPublishedResponse.ok
            ? (await newPublishedResponse.json()).zaps || []
            : [];
          const unpublishedZapsData = newUnpublishedResponse.ok
            ? (await newUnpublishedResponse.json()).zaps || []
            : [];

          setPublishedZaps(publishedZapsData);
          setUnpublishedZaps(unpublishedZapsData);
        } else {
          // Process the original responses
          const publishedZapsData = publishedResponse.ok
            ? (await publishedResponse.json()).zaps || []
            : [];
          const unpublishedZapsData = unpublishedResponse.ok
            ? (await unpublishedResponse.json()).zaps || []
            : [];

          setPublishedZaps(publishedZapsData);
          setUnpublishedZaps(unpublishedZapsData);
        }

        setUsername("User");
      } catch (fetchError) {
        console.error("Network error fetching zaps:", fetchError);
        setError(
          "Failed to connect to the server. Please check your network connection."
        );
      }
    } catch (error) {
      console.error("Error in fetchZaps:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading your zaps."
      );
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  // Fetch zaps only once when component mounts
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/signin");
      return;
    }
    fetchZaps();
  }, [fetchZaps, router]);

  // Update filtered zaps whenever currentZaps changes
  useEffect(() => {
    setFilteredZaps(currentZaps);
  }, [currentZaps]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTogglePublished = (newShowPublished: boolean) => {
    setShowPublished(newShowPublished);
    setSelectedZaps({}); // Reset selections when switching views
  };

  const handleToggleZap = async (id: string, currentStatus: boolean) => {
    try {
      if (USE_MOCK_DATA) {
        // Use mock toggle function
        await toggleMockZap(id, currentStatus);
      } else {
        // Use real API
        const token = getToken();
        if (!token) {
          setError("Authentication token missing. Toggle action failed.");
          return;
        }

        const response = await fetch(
          buildApiUrl(API_ENDPOINTS.ZAP_TOGGLE(id)),
          {
            method: "POST",
            headers: getAuthHeaders(false),
            body: JSON.stringify({
              isActive: !currentStatus,
            }),
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            setError("Authentication failed. Please sign in again.");
            return;
          }
          if (response.status === 404) {
            setError("Zap not found. It may have been deleted.");
            return;
          }
          throw new Error("Failed to toggle zap status");
        }

        const data = await response.json();

        // Update local state with the returned zap data
        setPublishedZaps((prevZaps) =>
          prevZaps.map((zap) =>
            zap.id === id ? { ...zap, isActive: data.zap.isActive } : zap
          )
        );
        setUnpublishedZaps((prevZaps) =>
          prevZaps.map((zap) =>
            zap.id === id ? { ...zap, isActive: data.zap.isActive } : zap
          )
        );
      }
    } catch (error) {
      console.error("Error toggling zap:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update zap status. Please try again."
      );
    }
  };

  const handleGoToZap = (id: string) => {
    router.push(`/edit/${id}`);
  };

  const handleSignout = () => {
    removeToken();
    router.push("/signin");
  };

  // Handle zap selection
  const handleSelectZap = (id: string, selected: boolean) => {
    setSelectedZaps((prev) => ({
      ...prev,
      [id]: selected,
    }));
  };

  // Handle select all zaps
  const handleSelectAll = (selected: boolean) => {
    const newSelectedZaps: Record<string, boolean> = {};
    filteredZaps.forEach((zap) => {
      newSelectedZaps[zap.id] = selected;
    });
    setSelectedZaps(newSelectedZaps);
  };

  // Check if all filtered zaps are selected
  const areAllSelected =
    filteredZaps.length > 0 &&
    filteredZaps.every((zap) => selectedZaps[zap.id]);

  // Delete selected zaps
  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;

    // Show delete confirmation dialog for bulk deletion
    setShowDeleteDialog(true);
    setDeleteDialogState({
      isSuccess: false,
      isLoading: false,
      zapId: "bulk", // Using "bulk" to indicate bulk deletion
      zapName: `${selectedCount} selected zap${selectedCount > 1 ? "s" : ""}`,
    });
  };

  // Add this function to handle bulk deletion after confirmation
  const handleConfirmBulkDelete = async () => {
    setDeleteDialogState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (USE_MOCK_DATA) {
        // Just remove from our local state for mock data
        const zapIdsToDelete = Object.keys(selectedZaps).filter(
          (id) => selectedZaps[id]
        );
        const updatedZaps = currentZaps.filter(
          (zap) => !zapIdsToDelete.includes(zap.id)
        );
        setPublishedZaps(updatedZaps);
        setUnpublishedZaps(updatedZaps);
        setFilteredZaps(updatedZaps);
        setSelectedZaps({});
        setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));
        return;
      }

      // Get selected zap IDs
      const zapIdsToDelete = Object.keys(selectedZaps).filter(
        (id) => selectedZaps[id]
      );

      // Delete each selected zap
      await Promise.all(
        zapIdsToDelete.map(async (zapId) => {
          const response = await fetch(
            buildApiUrl(API_ENDPOINTS.ZAP_DELETE(zapId)),
            {
              method: "POST", // Using POST as specified
              headers: getAuthHeaders(false),
            }
          );

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Authentication failed. Please try again.");
            }
            throw new Error(`Failed to delete zap ${zapId}`);
          }
        })
      );

      // Mark as success
      setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));

      // Refetch zaps after deletion
      await fetchZaps();

      // Clear selection
      setSelectedZaps({});
    } catch (error) {
      console.error("Error deleting zaps:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete zaps. Please try again."
      );
      setShowDeleteDialog(false);
    } finally {
      setDeleteDialogState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Update the delete confirmation logic
  const handleConfirmDelete = async () => {
    // If it's a bulk delete, use the bulk delete handler
    if (deleteDialogState.zapId === "bulk") {
      return handleConfirmBulkDelete();
    }

    setDeleteDialogState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.ZAP_DELETE(deleteDialogState.zapId)),
        {
          method: "POST",
          headers: getAuthHeaders(false),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please try again.");
        }
        throw new Error(`Failed to delete zap ${deleteDialogState.zapId}`);
      }

      setDeleteDialogState((prev) => ({ ...prev, isSuccess: true }));
      await fetchZaps(); // Refresh the zaps list
    } catch (error) {
      console.error("Error deleting zap:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete zap. Please try again."
      );
      setShowDeleteDialog(false);
    } finally {
      setDeleteDialogState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Add this function to handle dialog close
  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteDialogState({
      isSuccess: false,
      isLoading: false,
      zapId: "",
      zapName: "",
    });
  };

  // Format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleString("default", {
      month: "short",
    })} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Renders flow steps as SVG icons based on action types
  const renderFlow = (actions: Action[], trigger: any) => {
    // Sort actions by sorting order
    const sortedActions = [...actions].sort(
      (a, b) => a.sortingOrder - b.sortingOrder
    );
    // Show maximum 5 steps, then add a "+" indicator
    const displayedSteps = sortedActions.slice(0, 5);
    const hasMoreSteps = sortedActions.length > 5;
    return (
      <div className="flex items-center space-x-4">
        {/* Add trigger logo if it exists */}
        {trigger && (
          <div
            className="flex items-center justify-center"
            title={trigger.type?.name || "Trigger"}
          >
            <ActionIcon
              actionId={trigger.AvailableTriggerId}
              actionName={trigger.type?.name || "Trigger"}
              width={28}
              height={28}
            />
          </div>
        )}
        {/* Add arrow after trigger if there are actions */}
        {trigger && displayedSteps.length > 0 && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
        {displayedSteps.map((action, index) => (
          <React.Fragment key={action.id}>
            {index > 0 && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            <div
              className="flex items-center justify-center"
              title={action.type.name}
            >
              <ActionIcon
                actionId={action.actionId}
                actionName={action.type.name}
                width={28}
                height={28}
              />
            </div>
          </React.Fragment>
        ))}
        {hasMoreSteps && (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <div className="flex items-center justify-center text-yellow-600">
              <span className="text-sm font-bold">
                +{sortedActions.length - 5}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Function to navigate to the zap editor page to edit a zap
  const handleEditZap = (id: string) => {
    router.push(`/edit/${id}`);
  };

  // Add this function to handle single zap deletion
  const handleDeleteZap = async (zapId: string, zapName: string) => {
    setShowDeleteDialog(true);
    setDeleteDialogState({
      isSuccess: false,
      isLoading: false,
      zapId,
      zapName,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black text-white">
      <AuthenticatedNavbar onSignout={handleSignout} username={username} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative max-w-xs w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search zaps..."
                className="block w-full pl-10 py-2 border border-white rounded-md shadow-sm placeholder-white bg-black text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600 font-mono"
              />
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium font-mono ${
                  showPublished
                    ? "bg-yellow-600 text-black"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
                onClick={() => handleTogglePublished(true)}
              >
                Published ({publishedZaps.length})
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium font-mono ${
                  !showPublished
                    ? "bg-yellow-600 text-black"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
                onClick={() => handleTogglePublished(false)}
              >
                Drafts ({unpublishedZaps.length})
              </button>
            </div>
          </div>
          <div className="flex space-x-4">
            {selectedCount > 0 && (
              <button
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center font-mono font-bold"
                onClick={handleDeleteSelected}
                disabled={deleteDialogState.isLoading}
              >
                {deleteDialogState.isLoading &&
                deleteDialogState.zapId === "bulk" ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        fill="currentColor"
                      />
                    </svg>
                    Delete Selected ({selectedCount})
                  </>
                )}
              </button>
            )}
            <button
              className="px-4 py-2 bg-yellow-600 text-black rounded-md font-mono font-bold hover:bg-yellow-500 transition-colors"
              onClick={() => router.push("/zap-editor")}
            >
              Create New Zap
            </button>
          </div>
        </div>
        <div className="overflow-x-auto bg-zinc-900 rounded-lg border border-yellow-600/30">
          <table className="min-w-full divide-y divide-gray-800">
            <thead>
              <tr>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded bg-zinc-800 border-gray-700 text-yellow-600 focus:ring-yellow-600"
                      checked={areAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </label>
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Flow
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Name
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Last Edited
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Running
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Zap Runs
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredZaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    {currentZaps.length === 0 ? (
                      <>
                        <p className="text-gray-400 font-mono">
                          No {showPublished ? "published" : "draft"} zaps found.{" "}
                          {showPublished
                            ? "Publish a zap"
                            : "Create your first zap"}
                          !
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-400 font-mono">
                        No zaps match your search. Try a different query.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredZaps.map((zap) => (
                  <tr
                    key={zap.id}
                    className="hover:bg-zinc-800 transition-colors"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-300">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="rounded bg-zinc-800 border-gray-700 text-yellow-600 focus:ring-yellow-600"
                          checked={!!selectedZaps[zap.id]}
                          onChange={(e) =>
                            handleSelectZap(zap.id, e.target.checked)
                          }
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 flex items-center">
                      {zap.actions && zap.actions.length > 0 ? (
                        renderFlow(zap.actions, zap.trigger)
                      ) : (
                        <span className="text-gray-500 italic">No actions</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 font-mono">
                      <button
                        onClick={() => handleEditZap(zap.id)}
                        className="hover:text-yellow-600 transition-colors"
                      >
                        {zap.zapName}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {formatDate(zap.lastEdited)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={zap.isActive}
                          onChange={() => handleToggleZap(zap.id, zap.isActive)}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => handleGoToZap(zap.id)}
                        className="text-yellow-600 hover:text-yellow-500"
                        title="View Zap Runs"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => handleDeleteZap(zap.id, zap.zapName)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                        title="Delete Zap"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add the confirmation dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title={deleteDialogState.isSuccess ? "Success" : "Delete Zap"}
        message={
          deleteDialogState.isSuccess
            ? deleteDialogState.zapId === "bulk"
              ? "Zaps have been deleted successfully!"
              : "Zap has been deleted successfully!"
            : deleteDialogState.zapId === "bulk"
            ? `Are you sure you want to delete ${deleteDialogState.zapName}? This action cannot be undone.`
            : `Are you sure you want to delete "${deleteDialogState.zapName}"? This action cannot be undone.`
        }
        isSuccess={deleteDialogState.isSuccess}
        isLoading={deleteDialogState.isLoading}
        onConfirm={
          deleteDialogState.isSuccess
            ? handleCloseDeleteDialog
            : handleConfirmDelete
        }
        onClose={handleCloseDeleteDialog}
        confirmButtonText={deleteDialogState.isSuccess ? "OK" : "Delete"}
        closeButtonText="Cancel"
        showCloseButton={!deleteDialogState.isSuccess}
      />
    </div>
  );
};

export default Dashboard;
