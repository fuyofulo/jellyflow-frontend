"use client";

import React from "react";
import SlackSVG from "../logos/SlackSVG";
import DriveSVG from "../logos/DriveSVG";
import NotionSVG from "../logos/NotionSVG";
import GitHubSVG from "../logos/GitHubSVG";
import OfficialGmailSVG from "../logos/GmailSVG";
import SolanaSVG from "../logos/SolanaSVG";
import EthereumSVG from "../logos/EthereumSVG";
import XSVG from "../logos/XSVG";
import ChatGPTSVG from "../logos/ChatGPTSVG";
import TelegramSVG from "../logos/TelegramSVG";
interface AppsProps {
  textPosition?: "top" | "bottom"; // Makes text position configurable
}

export const Apps: React.FC<AppsProps> = ({ textPosition = "bottom" }) => {
  // Sample app logos - replace with actual logos later
  const appLogos = [
    { name: "Slack", logo: <SlackSVG /> },
    { name: "GitHub", logo: <GitHubSVG /> },
    { name: "Gmail", logo: <OfficialGmailSVG /> },
    { name: "Solana", logo: <SolanaSVG /> },
    { name: "Ethereum", logo: <EthereumSVG /> },
    { name: "X", logo: <XSVG /> },
    { name: "Notion", logo: <NotionSVG /> },
    { name: "Telegram", logo: <TelegramSVG /> },
    { name: "ChatGPT", logo: <ChatGPTSVG /> }
  ];

  const integrationText = (
    <div className="text-center mb-2 mt-10">
      <h2 className="text-2xl font-mono font-bold text-white">
        We support integration with over 10+ apps
      </h2>
    </div>
  );

  return (
    <div className="w-full px-10 py-10 bg-black bg-opacity-50 rounded-xl border-6 border-black mt-[-2rem]">
      {textPosition === "bottom" && integrationText}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.5rem",
          width: "100%",
        }}
      >
        {appLogos.map((app, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
            }}
          >
            {/* Logo container */}
            <div className="w-20 h-20 flex items-center justify-center mb-3">
              {typeof app.logo === "string" ? (
                <span className="text-gray-400 text-xs">Logo</span>
              ) : (
                app.logo
              )}
            </div>

            {/* App name under the logo */}
            <span className="text-yellow-600 font-mono font-bold text-base text-center">
              {app.name}
            </span>
          </div>
        ))}
      </div>

      {textPosition === "top" && integrationText}
    </div>
  );
};
