import { Suspense } from "react";
import { InventoryScreen } from "@/ui/screens/inventory-screen";
import { LoadingState } from "@/ui/components/primitives";
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InventoryScreen availableOnly />
    </Suspense>
  );
}
