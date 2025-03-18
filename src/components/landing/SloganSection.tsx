"use client";
import { ColourfulText } from "../stuff/ColorfulText";

export const SloganSection = () => {
  return (
    <div className="w-full flex items-center">
      <div className="text-left">
        <h1 className="text-6xl font-mono font-bold mb-4">
          Automate operation workflows seemlessly <br />
          using <ColourfulText text="Jelly Flow" />
        </h1>
        <p className="font-mono text-gray-400 text-lg">
          just like a jellyfish gliding the ocean in calm motion
        </p>
      </div>
    </div>
  );
};
