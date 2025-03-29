"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GoogleSVG from "../logos/GoogleSVG";
import { ButtonWithIcon } from "../buttons/ButtonWithIcon";
import Link from "next/link";
import { UnauthenticatedNavbar } from "../navigation/Navbar";
import { useEnvironment } from "@/hooks/useEnvironment";
import { buildApiUrl, API_ENDPOINTS } from "@/utils/api";
import { removeToken } from "@/utils/auth";

const Signup = () => {
  const router = useRouter();
  const { backendUrl, backendStatus } = useEnvironment();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { ...errors };

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
      valid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log("Using backend URL:", backendUrl);

      const response = await fetch(buildApiUrl(API_ENDPOINTS.SIGNUP), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
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
        router.push(`/verify?email=${encodeURIComponent(formData.email)}`);
      } else {
        // Handle other error responses
        const errorMessage = data.message || "Failed to create account";
        throw new Error(errorMessage);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "An error occurred");
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
            {apiError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{apiError}</span>
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
                    value={formData.name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-500">{errors.name}</p>
                  )}
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
                    value={formData.email}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-500">{errors.email}</p>
                  )}
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
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.password}
                    </p>
                  )}
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
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
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

              <div className="mt-6">
                <ButtonWithIcon icon={<GoogleSVG />}>
                  Sign up with Google
                </ButtonWithIcon>
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
};

export default Signup;
