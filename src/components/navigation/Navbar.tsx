"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthenticated, removeToken } from "@/utils/auth";
import { Button1 } from "../buttons/Button1";
import { Button2 } from "../buttons/Button2";
import { Button7 } from "../buttons/Button7";

export const Navbar = () => {
  const router = useRouter();
  const authenticated = isAuthenticated();

  const handleSignout = () => {
    removeToken();
    router.push("/signin");
  };

  if (authenticated) {
    return <AuthenticatedNavbar onSignout={handleSignout} />;
  } else {
    return <UnauthenticatedNavbar />;
  }
};

interface AuthenticatedNavbarProps {
  onSignout: () => void;
  username?: string;
}

export const AuthenticatedNavbar = ({
  onSignout,
  username = "User",
}: AuthenticatedNavbarProps) => {
  return (
    <div className="w-full border-b border-gray-200 bg-black">
      <div className="mx-auto flex h-18 max-w-9xl items-center relative px-4 sm:px-6 lg:px-6">
        {/* Left section - Logo and name */}
        <div className="flex items-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <rect width="32" height="32" rx="6" fill="#CA8A04" />
            <path d="M8 8H24V14H8V8Z" fill="white" />
            <path d="M8 18H16V24H8V18Z" fill="white" />
          </svg>
          <Link href="/dashboard" className="text-xl font-mono font-bold">
            Jelly Flow
          </Link>
        </div>

        {/* Middle section - Navigation links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-1">
          <Button7>Docs</Button7>
          <Button7>Twitter</Button7>
          <Link href="/contact">
            <Button7>Contact</Button7>
          </Link>
        </div>

        {/* Right section - User profile */}
        <div className="ml-auto flex items-center space-x-2">
          <Link href="/dashboard">
            <Button7>Zaps</Button7>
          </Link>
          <Link href="/zap-editor">
            <Button1>Create Zap</Button1>
          </Link>
          <div className="relative group">
            <Button2>{username}</Button2>
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-yellow-600/30 rounded-md shadow-lg hidden group-hover:block z-10">
              <div className="py-1">
                <Link
                  href="/profile"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800"
                >
                  Settings
                </Link>
                <button
                  onClick={onSignout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UnauthenticatedNavbar = () => {
  return (
    <div className="w-full border-b border-gray-200 bg-black">
      <div className="mx-auto flex h-18 max-w-9xl items-center relative px-4 sm:px-6 lg:px-6">
        {/* Left section - Logo and name */}
        <div className="flex items-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <rect width="32" height="32" rx="6" fill="#CA8A04" />
            <path d="M8 8H24V14H8V8Z" fill="white" />
            <path d="M8 18H16V24H8V18Z" fill="white" />
          </svg>
          <Link href="/" className="text-xl font-mono font-bold">
            Jelly Flow
          </Link>
        </div>

        {/* Middle section - Navigation links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-1">
          <Button7>Pricing</Button7>
          <Button7>Docs</Button7>
          <Button7>Twitter</Button7>
          <Link href="/contact">
            <Button7>Contact</Button7>
          </Link>
        </div>

        {/* Right section - Sign in and Create Account */}
        <div className="ml-auto flex items-center space-x-2">
          <Link href="/signin">
            <Button2>Sign In</Button2>
          </Link>
          <Link href="/signup">
            <Button1>Create Account</Button1>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
