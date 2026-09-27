"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileImage,
  Images,
  Award,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileImage },
  { href: "/assets", label: "Assets", icon: Images },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "certiflow.sidebarCollapsed";

// The collapsed preference lives in localStorage; read it as an external store so the
// sidebar renders in the saved state (and stays in sync across tabs) without an effect.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // localStorage unavailable — default to expanded
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  function toggle() {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    } catch {
      // ignore — the toggle just won't persist
    }
    listeners.forEach((notify) => notify());
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Open sidebar" : undefined}
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && "Close sidebar"}
        </button>
      </div>

      <div className={cn("pb-3 pt-3", collapsed ? "flex justify-center px-2" : "px-5")}>
        {collapsed ? (
          <Image src="/icon.png" alt="SRM" width={36} height={36} priority className="h-9 w-9" />
        ) : (
          <>
            <Image src="/brand/srm-logo.png" alt="SRM Institute of Science & Technology" width={140} height={57} priority className="h-auto w-32" />
            <p className="mt-3 text-sm font-bold leading-tight tracking-wide text-slate-800">SRM CERTIFICATE GENERATOR</p>
            <p className="mt-0.5 text-xs text-slate-500">Create, issue and verify certificates</p>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                collapsed && "justify-center px-0",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon size={16} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mb-5 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Log out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={16} />
          {!collapsed && "Log out"}
        </button>
      </div>
    </aside>
  );
}
