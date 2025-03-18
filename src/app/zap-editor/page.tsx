"use client";

import { useRouter } from "next/navigation";
import ZapEditor from "@/components/pages/ZapEditor";
import { AuthenticatedNavbar } from "@/components/navigation/Navbar";
import { removeToken } from "@/utils/auth";

export default function ZapEditorPage() {
  const router = useRouter();

  const handleSignout = () => {
    removeToken();
    router.push("/signin");
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <AuthenticatedNavbar onSignout={handleSignout} />
      <ZapEditor />
    </div>
  );
}
