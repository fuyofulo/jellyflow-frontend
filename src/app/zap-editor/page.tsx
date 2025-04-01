"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import ZapEditor from "@/components/pages/ZapEditor";
import { AuthenticatedNavbar } from "@/components/navigation/Navbar";
import { removeToken } from "@/utils/auth";

export default function ZapEditorPage() {
  const router = useRouter();
  const editorRef = useRef<{ handleCustomNavigation: (url: string) => void }>({
    handleCustomNavigation: (url: string) => {
      router.push(url);
    },
  });

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

  return (
    <div className="min-h-screen bg-zinc-950">
      <AuthenticatedNavbar
        onSignout={handleSignout}
        onCustomNavigation={handleCustomNavigation}
      />
      <ZapEditor ref={editorRef} />
    </div>
  );
}
