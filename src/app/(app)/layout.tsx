import { Sidebar } from "@/components/dashboard/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
    </div>
  );
}
