"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import GoogleSVG from "../logos/GoogleSVG";
import { ButtonWithIcon } from "../buttons/ButtonWithIcon";
import Link from "next/link";
import { UnauthenticatedNavbar } from "../navigation/Navbar";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { removeToken } from "@/utils/auth";
import dotenv from "dotenv";

dotenv.config();

const backendurl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendurl) {
  throw new Error("Backend URL not configured");
}

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name: fieldName, value } = e.target;
    if (fieldName === "name") {
      setName(value);
    } else if (fieldName === "email") {
      setEmail(value);
    } else if (fieldName === "password") {
      setPassword(value);
    } else if (fieldName === "confirmPassword") {
      setConfirmPassword(value);
    }
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateForm = () => {
    let valid = true;

    // Validate name
    if (!name.trim()) {
      setError("Name is required");
      valid = false;
    }

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
    } else if (password.length < 6) {
      setError("Password must be at least 6 characters");
      valid = false;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
      // Use hardcoded API URL for signup
      const signupUrl = `${backendurl}/api/v1/user/signup`;
      console.log("Using hardcoded signup URL:", signupUrl);

      const response = await fetch(signupUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();
      console.log("Signup response status:", response.status);
      console.log("Signup response data:", data);

      // Handle different status codes from the backend
      if (response.status === 409) {
        // User already exists
        throw new Error(data.message || "User with this email already exists");
      } else if (
        response.ok ||
        (data && data.message && data.message.includes("verification"))
      ) {
        // User created successfully or verification code sent
        console.log("Signup successful:", data);

        // Clear any existing tokens before redirecting to verification
        removeToken();

        // Redirect to verification page
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        // Handle other error responses
        const errorMessage = data.message || "Failed to create account";
        throw new Error(errorMessage);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      console.error("Signup error:", error);
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
            Create your account
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
                  htmlFor="name"
                  className="block text-sm font-mono font-medium text-gray-300"
                >
                  Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-mono font-medium text-gray-300"
                >
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-mono font-bold text-black bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
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
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400 font-mono">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="font-medium text-yellow-600 hover:text-yellow-500"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
