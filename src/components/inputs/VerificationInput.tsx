"use client";

import React, { useState, useRef, useEffect } from "react";

interface VerificationInputProps {
  length?: number;
  onChange: (code: string) => void;
}

const VerificationInput: React.FC<VerificationInputProps> = ({
  length = 6,
  onChange,
}) => {
  const [code, setCode] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus the first input on component mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Notify parent component when code changes
  useEffect(() => {
    onChange(code.join(""));
  }, [code, onChange]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only the last character
    setCode(newCode);

    // Auto-focus next input if value is added
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Arrow left/right navigation
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");

    // Filter out non-digits
    const digits = pasteData.replace(/\D/g, "").slice(0, length);

    if (digits) {
      const newCode = [...code];
      digits.split("").forEach((digit, i) => {
        if (i < length) {
          newCode[i] = digit;
        }
      });
      setCode(newCode);

      // Focus the next empty input or the last input
      const nextEmptyIndex = newCode.findIndex((val) => !val);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[length - 1]?.focus();
      }
    }
  };

  return (
    <div className="flex justify-center space-x-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          value={code[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          maxLength={1}
          className="w-12 h-12 text-center text-xl font-mono border border-gray-700 rounded-md shadow-sm bg-zinc-800 text-white focus:outline-none focus:ring-yellow-600 focus:border-yellow-600"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default VerificationInput;
