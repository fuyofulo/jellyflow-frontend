import { Suspense } from "react";
import Verify from "../../components/pages/Verify";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
        </div>
      }
    >
      <Verify />
    </Suspense>
  );
}
