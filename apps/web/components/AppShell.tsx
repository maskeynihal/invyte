"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TopAppBar } from "@invyte/ui/top-app-bar";
import { BottomNavBar } from "@invyte/ui/bottom-nav-bar";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@invyte/convex";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

function getActiveTab(pathname: string): string {
  if (pathname === "/") return "discover";
  if (pathname.startsWith("/feed")) return "feed";
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/profile")) return "profile";
  return "discover";
}

export default function AppShell({ children, hideNav = false }: Readonly<AppShellProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (isAuthenticated) {
      void storeUser().catch((error) => {
        console.error("Failed to store signed-in user", error);
      });
    }
  }, [isAuthenticated, storeUser]);

  return (
    <>
      <TopAppBar />
      <main className="pt-20 pb-28 px-4 max-w-lg mx-auto min-h-screen">
        {children}
      </main>
      {!hideNav && (
        <BottomNavBar
          activeTab={activeTab}
          onNavigate={(href) => router.push(href)}
        />
      )}
    </>
  );
}
