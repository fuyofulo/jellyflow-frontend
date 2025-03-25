"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [zaps, setZaps] = useState<Zap[]>([]);
  const [filteredZaps, setFilteredZaps] = useState<Zap[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [selectedZaps, setSelectedZaps] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
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
        setZaps(mockZaps);
        setFilteredZaps(mockZaps);
        setUsername(mockData.username || "User");
        setLoading(false);
        return;
      }

      console.log("Fetching zaps from:", backendUrl);

      const token = getToken();
      if (!token) {
        // Instead of redirecting, show an error and set empty data
        setError(
          "Authentication token missing. Please sign in to view your zaps."
        );
        setZaps([]);
        setFilteredZaps([]);
        return;
      }

      // Note: API doesn't use "Bearer" prefix for the token
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ZAPS), {
        method: "GET",
        headers: getAuthHeaders(false), // Pass false to omit "Bearer" prefix
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Instead of redirecting, just show a helpful error message
          setError("Authentication failed. Your session may have expired.");
          setZaps([]);
          setFilteredZaps([]);
          return;
        }
        throw new Error(`Failed to fetch zaps: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Fetched zaps:", data);
      // The API returns { zaps: [...] } so we need to extract the array
      setZaps(data.zaps || []);
      setFilteredZaps(data.zaps || []);
      setSelectedZaps({});
      setUsername("User"); // Set a default username
    } catch (error) {
      console.error("Error fetching zaps:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load your zaps. Please check your backend URL and make sure the API is running."
      );
    } finally {
      setLoading(false);
    }
  }, [router, backendUrl]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/signin");
      return;
    }
    fetchZaps();
  }, [router, fetchZaps]);

  // Filter zaps based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredZaps(zaps);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = zaps.filter((zap) =>
        zap.zapName.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredZaps(filtered);
    }
  }, [searchQuery, zaps]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
        setZaps((prevZaps) =>
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
    setIsDeleting(true);
    try {
      if (USE_MOCK_DATA) {
        // Just remove from our local state for mock data
        const zapIdsToDelete = Object.keys(selectedZaps).filter(
          (id) => selectedZaps[id]
        );
        const updatedZaps = zaps.filter(
          (zap) => !zapIdsToDelete.includes(zap.id)
        );
        setZaps(updatedZaps);
        setFilteredZaps(updatedZaps);
        setSelectedZaps({});
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
              method: "DELETE",
              headers: getAuthHeaders(false), // Pass false to omit "Bearer" prefix
            }
          );

          if (!response.ok) {
            // Instead of handling auth errors with redirect, just throw an error
            if (response.status === 401) {
              throw new Error("Authentication failed. Please try again.");
            }
            throw new Error(`Failed to delete zap ${zapId}`);
          }
        })
      );

      // Refetch zaps after deletion
      fetchZaps();
    } catch (error) {
      console.error("Error deleting zaps:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete zaps. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
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
              className="block w-full pl-10 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600 font-mono"
            />
          </div>
          <div className="flex space-x-3">
            {selectedCount > 0 && (
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md font-mono font-bold hover:bg-red-700 transition-colors flex items-center"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? (
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
                  <>Delete selected zaps ({selectedCount})</>
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
                <th className="px-4 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded bg-zinc-800 border-gray-700 text-yellow-600 focus:ring-yellow-600"
                      checked={areAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </label>
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Flow
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Name
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Last Edited
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Running
                </th>
                <th className="px-6 py-5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-mono">
                  Zap Runs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredZaps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    {zaps.length === 0 ? (
                      <>
                        <p className="text-gray-400 font-mono">
                          No zaps found. Create your first zap!
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 flex items-center">
                      {zap.actions && zap.actions.length > 0 ? (
                        renderFlow(zap.actions, zap.trigger)
                      ) : (
                        <span className="text-gray-500 italic">No actions</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      <button
                        onClick={() => handleEditZap(zap.id)}
                        className="hover:text-yellow-600 transition-colors"
                      >
                        {zap.zapName}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {formatDate(zap.lastEdited)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
