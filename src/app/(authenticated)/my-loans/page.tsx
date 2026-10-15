import { Suspense } from "react";
import { LoansScreen } from "@/ui/screens/loans-screen";
import { LoadingState } from "@/ui/components/primitives";
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoansScreen personal />
    </Suspense>
  );
}
