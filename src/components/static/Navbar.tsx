"use client";

import Link from "next/link";
import { Button1 } from "../ui/buttons/Button1";
import { Button2 } from "../ui/buttons/Button2";
import { Button7 } from "../ui/buttons/Button7";

export const Navbar = () => {
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
          <span className="text-xl font-mono font-bold">Jelly Flow</span>
        </div>

        {/* Middle section - Navigation links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-1">
          <Button7>Pricing</Button7>
          <Button7>Docs</Button7>
          <Button7>Twitter</Button7>
          <Button7>Discord</Button7>
          <Button7>Blog</Button7>
        </div>

        {/* Right section - Sign in and Get Started */}
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
