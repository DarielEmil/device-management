import { Suspense } from "react";
import { UsersScreen } from "@/ui/screens/users-screen";
import { LoadingState } from "@/ui/components/primitives";
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UsersScreen />
    </Suspense>
  );
}
