"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ZapEditor from "@/components/pages/ZapEditor";
import { AuthenticatedNavbar } from "@/components/navigation/Navbar";
import { removeToken, getAuthHeaders } from "@/utils/auth";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";

export default function EditZapPage() {
  const router = useRouter();
  const params = useParams();
  const zapId = params.zapId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zapData, setZapData] = useState<any>(null);
  const editorRef = useRef<{ handleCustomNavigation?: (url: string) => void }>(
    {}
  );

  useEffect(() => {
    const fetchZapData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          buildApiUrl(API_ENDPOINTS.ZAP_DETAIL(zapId)),
          {
            method: "GET",
            headers: getAuthHeaders(false),
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/signin");
            return;
          }
          if (response.status === 404) {
            throw new Error("Zap not found");
          }
          throw new Error(`Error fetching zap: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Fetched zap data:", data);
        setZapData(data.zap);
      } catch (error) {
        console.error("Error fetching zap:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (zapId) {
      fetchZapData();
    }
  }, [zapId, router]);

  const handleSignout = () => {
    removeToken();
    router.push("/signin");
  };

  const handleCustomNavigation = (url: string) => {
    // If editor has provided a navigation handler, use it, otherwise use router
    if (editorRef.current?.handleCustomNavigation) {
      editorRef.current.handleCustomNavigation(url);
    } else {
      router.push(url);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-white">
        <AuthenticatedNavbar
          onSignout={handleSignout}
          onCustomNavigation={handleCustomNavigation}
        />
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md mx-auto mt-20">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => handleCustomNavigation("/dashboard")}
            className="mt-4 px-4 py-2 bg-yellow-600 text-black rounded font-bold hover:bg-yellow-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <AuthenticatedNavbar
        onSignout={handleSignout}
        onCustomNavigation={handleCustomNavigation}
      />
      <ZapEditor
        isEditMode={true}
        zapId={zapId}
        initialZapData={zapData}
        ref={editorRef}
      />
    </div>
  );
}
