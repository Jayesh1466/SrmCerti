import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <Card>
        <CardContent className="space-y-4 p-5 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Signed in as</p>
            <p className="mt-1 font-medium text-slate-900">{session?.user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Changing the admin login</p>
            <p className="mt-1 text-slate-700">
              This site has one admin account. Its email and password are set by the <code>ADMIN_EMAIL</code> and{" "}
              <code>ADMIN_PASSWORD</code> environment variables in the Vercel project. Update them there and redeploy;
              the previous login stops working immediately.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sessions</p>
            <p className="mt-1 text-slate-700">
              You stay signed in while your browser is open. Closing the browser, or 12 hours without activity, signs you out.
            </p>
          </div>
          <p className="border-t border-slate-200 pt-4 text-slate-500">
            <Link href="/terms" className="text-brand hover:underline">Terms and Conditions</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
