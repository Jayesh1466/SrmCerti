"use client";

import { useEffect, useState } from "react";
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

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — keep default expanded state
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        collapsed ? "w-16" : "w-72"
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <div className="min-w-0 px-2">
            <Image src="/brand/srm-logo.png" alt="SRM Institute of Science & Technology" width={140} height={57} priority className="h-auto w-32" />
            <p className="mt-2 whitespace-nowrap text-sm font-bold tracking-wide text-slate-800">SRM CERTIFICATE GENERATOR</p>
            <p className="text-xs text-slate-500">Bulk Certificate Generator</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 p-2 text-slate-700 shadow-sm hover:bg-slate-200 hover:text-slate-900",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
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
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title={collapsed ? "Log out" : undefined}
        className={cn(
          "mx-3 mb-5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
          collapsed && "justify-center px-0"
        )}
      >
        <LogOut size={16} />
        {!collapsed && "Log out"}
      </button>
    </aside>
  );
}
