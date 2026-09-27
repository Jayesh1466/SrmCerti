import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | SRMcerti",
  description: "Terms for using the SRM certificate generation and verification system.",
};

const LAST_UPDATED = "27 September 2026";

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. About this service",
    body: (
      <p>
        SRMcerti is used by SRM Institute of Science and Technology, Ramapuram, to create certificates for events,
        generate them in bulk from student lists, and let anyone confirm that a certificate is genuine. Only
        authorised administrators can sign in. The public verification page is open to everyone.
      </p>
    ),
  },
  {
    heading: "2. Administrator accounts",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Access is limited to the administrator account issued by the institution. Do not share its password.</li>
        <li>You are responsible for everything done while signed in with that account.</li>
        <li>Sessions end when the browser is closed, or after 12 hours without activity.</li>
      </ul>
    ),
  },
  {
    heading: "3. Data you upload",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Administrators upload certificate artwork (backgrounds, logos, seals, signatures) and student lists that
          may include names, registration numbers, departments and event details.
        </li>
        <li>
          Only upload data you are authorised to use for issuing certificates, and only the fields the certificate
          needs.
        </li>
        <li>
          Signatures and seals must belong to, or be approved by, the people and offices they represent.
        </li>
      </ul>
    ),
  },
  {
    heading: "4. Certificate verification",
    body: (
      <p>
        Each generated certificate can carry a QR code linking to a public verification page. That page shows
        whether the certificate is valid, along with the student&apos;s name, registration number, event name and
        date. Anyone holding the certificate or its link can see this information.
      </p>
    ),
  },
  {
    heading: "5. Where data is stored",
    body: (
      <p>
        The application is hosted on Vercel. Records are stored in a Neon PostgreSQL database, and uploaded images
        and generated PDFs are stored in Vercel Blob. Page-view statistics are collected with Vercel Web Analytics,
        which does not use cookies. The only cookies set are those needed to keep an administrator signed in.
      </p>
    ),
  },
  {
    heading: "6. Acceptable use",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Do not create certificates for people who did not take part in the event.</li>
        <li>Do not alter, forge or misrepresent certificates issued through this system.</li>
        <li>Do not attempt to access data or accounts you have not been given.</li>
      </ul>
    ),
  },
  {
    heading: "7. Corrections and removal",
    body: (
      <p>
        To correct details on a certificate, the administrator can regenerate it from the event&apos;s project. To
        have your data removed, contact the department that issued the certificate.
      </p>
    ),
  },
  {
    heading: "8. Availability and changes",
    body: (
      <p>
        The service is provided as is, and may occasionally be unavailable for maintenance. These terms may be
        updated; the date below shows the latest version.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start gap-4 border-b border-slate-200 pb-6">
        <Image src="/brand/srm-logo.png" alt="SRM Institute of Science & Technology" width={180} height={74} className="h-auto w-44" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Terms and Conditions</h1>
          <p className="mt-1 text-sm text-slate-500">Last updated {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-2 text-base font-semibold text-slate-900">{s.heading}</h2>
            {s.body}
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-slate-200 pt-6 text-sm">
        <Link href="/login" className="text-brand hover:underline">Back to sign in</Link>
      </p>
    </main>
  );
}
