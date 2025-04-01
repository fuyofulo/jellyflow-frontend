"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import GoogleSVG from "../logos/GoogleSVG";
import { ButtonWithIcon } from "../buttons/ButtonWithIcon";
import Link from "next/link";
import { setToken } from "@/utils/auth";
import { UnauthenticatedNavbar } from "../navigation/Navbar";
import { useEnvironment } from "@/hooks/useEnvironment";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";

export default function Signin() {
  const router = useRouter();
  const { backendUrl } = useEnvironment();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
    } else if (name === "password") {
      setPassword(value);
    }
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = () => {
    let valid = true;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError("Email is required");
      valid = false;
    } else if (!emailRegex.test(email)) {
      setError("Invalid email format");
      valid = false;
    }

    // Validate password
    if (!password) {
      setError("Password is required");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log("Using backend URL:", backendUrl);

      const response = await fetch(buildApiUrl(API_ENDPOINTS.SIGNIN), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Handle different response status codes
      if (response.status === 401) {
        // Invalid credentials (password doesn't match)
        throw new Error(data.message || "Invalid username or password");
      } else if (response.status === 403) {
        // User not found
        throw new Error(data.message || "User not found");
      } else if (response.status === 411) {
        // Invalid input format
        throw new Error(data.message || "Invalid input format");
      } else if (!response.ok) {
        // Other errors
        throw new Error(data.message || "Login failed");
      }

      // Store token using our auth utility
      if (data.token) {
        console.log("Login successful");
        setToken(data.token);

        // Redirect to dashboard on successful signin
        router.push("/dashboard");
      } else {
        throw new Error("No authentication token received");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      console.error("Signin error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <UnauthenticatedNavbar />

      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-mono font-bold text-white">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-yellow-600/30">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-mono font-medium text-gray-300"
                >
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-mono font-medium text-gray-300"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-700 rounded bg-zinc-800"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-300 font-mono"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-yellow-600 hover:text-yellow-500 font-mono"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-mono font-bold text-black bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-gray-400 font-mono">
                    Or
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <ButtonWithIcon icon={<GoogleSVG />}>
                  Sign in with Google
                </ButtonWithIcon>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400 font-mono">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-yellow-600 hover:text-yellow-500"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
