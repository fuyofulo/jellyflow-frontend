"use client";

import React from "react";

interface Button6Props {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button6: React.FC<Button6Props> = ({ children, onClick }) => {
  return (
    <button
      className="relative font-mono font-medium text-sm inline-flex items-center justify-center px-4 py-2 rounded-lg text-white hover:text-yellow-500 transition duration-150 ease-in-out"
      onClick={onClick}
    >
      {children}
    </button>
  );
};
