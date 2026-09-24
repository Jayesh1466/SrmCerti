import { Sidebar } from "@/components/dashboard/sidebar";

// Every page in the app shell reads live data from the database, so never prerender them at build time.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
    </div>
  );
}
