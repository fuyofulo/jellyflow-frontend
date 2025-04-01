"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UnauthenticatedNavbar } from "../navigation/Navbar";
import { setToken, removeToken } from "@/utils/auth";
import VerificationInput from "../inputs/VerificationInput";
import dotenv from "dotenv";

dotenv.config();

const backendurl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendurl) {
  throw new Error("Backend URL not configured");
}

const Verify = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleCodeChange = (code: string) => {
    setVerificationCode(code);
    setError("");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    setIsLoading(true);

    try {
      // Use hardcoded URL for verification
      const verifyUrl = `${backendurl}/api/v1/verify/verify-email`;
      console.log("Using hardcoded verify URL:", verifyUrl);

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      });

      const data = await response.json();
      console.log("Verification response:", {
        status: response.status,
        data,
        hasToken: !!data.token,
      });

      if (response.ok) {
        // Clear any existing tokens first
        removeToken();

        // Set the new token if provided by the API
        if (data.token) {
          setToken(data.token);
          setSuccess(
            "Email verified successfully! Redirecting to dashboard..."
          );

          // Redirect to dashboard after successful verification
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else if (data.user) {
          // Some verification APIs may return user data but not a token
          setSuccess(
            "Email verified successfully! Redirecting to dashboard..."
          );
          // Try to get user from a different API endpoint or redirect to login with a special flag
          setTimeout(() => {
            // Try to automatically sign in after verification
            const signinUrl = `${backendurl}/api/v1/user/signin`;
            fetch(signinUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, autoLogin: true }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.token) {
                  setToken(data.token);
                  router.push("/dashboard");
                } else {
                  router.push(
                    "/signin?verified=true&email=" +
                      encodeURIComponent(email || "")
                  );
                }
              })
              .catch(() => {
                router.push(
                  "/signin?verified=true&email=" +
                    encodeURIComponent(email || "")
                );
              });
          }, 1500);
        } else {
          // If no token is provided in the response, we need to sign in
          console.error("No authentication token received from verification");
          setSuccess("Email verified! Please sign in to continue.");

          setTimeout(() => {
            router.push(
              "/signin?verified=true&email=" + encodeURIComponent(email || "")
            );
          }, 1500);
        }
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (error) {
      setError("An error occurred during verification. Please try again.");
      console.error("Verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    setResendDisabled(true);
    setCountdown(60); // 60 seconds cooldown

    try {
      // Use hardcoded URL for resending verification code
      const resendUrl = `${backendurl}/api/v1/verify/resend-verification`;
      console.log("Using hardcoded resend URL:", resendUrl);

      const response = await fetch(resendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Verification code has been resent to your email");
      } else {
        setError(data.message || "Failed to resend verification code");
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Resend error:", error);
      setResendDisabled(false);
      setCountdown(0);
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
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            We've sent a verification code to {email || "your email address"}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-yellow-600/30">
            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-700/50 text-red-400 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-zinc-800 border border-yellow-600/50 text-yellow-400 px-4 py-3 rounded relative">
                <span className="block sm:inline">{success}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label
                  htmlFor="verificationCode"
                  className="block text-sm font-mono font-medium text-gray-300 mb-3"
                >
                  Verification Code
                </label>
                <VerificationInput onChange={handleCodeChange} />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-mono font-bold text-black bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <button
                onClick={handleResend}
                disabled={isLoading || resendDisabled}
                className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-mono font-medium text-white bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDisabled
                  ? `Resend Code (${countdown}s)`
                  : isLoading
                  ? "Processing..."
                  : "Resend Code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
