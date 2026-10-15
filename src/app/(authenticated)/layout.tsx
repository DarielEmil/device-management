import { AppShell } from "@/ui/components/app-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
