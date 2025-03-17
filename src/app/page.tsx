import { Navbar } from "@/components/static/Navbar";
import { SloganSection } from "@/components/landing/SloganSection";
import { Apps } from "@/components/landing/Apps";
import { Button1 } from "@/components/ui/buttons/Button1";
import { Button2 } from "@/components/ui/buttons/Button2";
import { Button3 } from "@/components/ui/buttons/Button3";
import { Button4 } from "@/components/ui/buttons/Button4";
import { Button5 } from "@/components/ui/buttons/Button5";
import { Button6 } from "@/components/ui/buttons/Button6";
import { Button7 } from "@/components/ui/buttons/Button7";
import GetStartedButton from "@/components/landing/GetStartedButton";


export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
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
      {/* <Button1>Get Started</Button1>
      <Button2>Get Started</Button2>
      <Button3>Get Started</Button3>
      <Button4>Get Started</Button4>
      <Button5>Get Started</Button5>
      <Button6>Get Started</Button6>
      <Button7>Get Started</Button7> */}

    </div>
  );
}
