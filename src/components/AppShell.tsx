"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

/**
 * Wraps main app content. Hides Navbar on /scan routes for a full-screen
 * mobile scanner experience. All other routes get the standard Navbar + main.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScanRoute = pathname.startsWith("/scan");

  if (isScanRoute) {
    // Scanner: full viewport, no chrome
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </>
  );
}
