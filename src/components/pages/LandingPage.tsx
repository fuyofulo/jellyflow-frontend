import React from "react";
import { UnauthenticatedNavbar } from "../navigation/Navbar";
import { SloganSection } from "../landing/SloganSection";
import GetStartedButton from "../landing/GetStartedButton";
import { Apps } from "../landing/Apps";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black">
      <UnauthenticatedNavbar />
      <main className="flex flex-row items-start pt-56 pr-12 min-h-[calc(100vh-4rem)]">
        <div className="w-1/2 flex flex-col pl-20">
          <SloganSection />
          <div className="mt-8 max-w-md">
            <GetStartedButton />
          </div>
        </div>
        <div className="w-1/2 flex-1 mr-4 ml-20 flex flex-col mt-[-6rem]">
          <Apps textPosition="top" />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
