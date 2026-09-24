# CertiFlow — Setup & Usage Guide

CertiFlow is a Certificate Management & Bulk Generation System.
Core principle: **ONE TEMPLATE → MANY STUDENTS → AUTOMATIC CERTIFICATES.**

## 1. Requirements

- Node.js 18+ (tested on v24.19.0), npm 10+

## 2. Install & run

```bash
cd certiflow
npm install
npx prisma migrate deploy   # applies the schema to the Postgres database in DATABASE_URL
npx prisma db seed          # re-run any time to (re-)seed the admin user
npm run dev              # http://localhost:3000
```

Convenience aliases are also defined in package.json: `npm run migrate`, `npm run seed`.

## 3. Environment variables

Copy `.env.example` to `.env` and fill it in. The database is Postgres — a free [Neon](https://neon.tech) database works for both local dev and production.

For a zero-setup local database, run `npx prisma dev -d --name srmcerti` (restart later with `npx prisma dev start srmcerti`). It prints a `postgres://…` URL; use it for `DATABASE_URL_UNPOOLED`, and for `DATABASE_URL` append `&connection_limit=1&pgbouncer=true` (this embedded Postgres allows only one session and no prepared statements).

Without `BLOB_READ_WRITE_TOKEN`, uploads and generated PDFs are stored in `public/uploads` (local dev). With it, they go to Vercel Blob.

## 3a. Deploying to Vercel

1. In Vercel, **Add New → Project** and import this GitHub repository.
2. In the project's **Storage** tab, add a **Neon** Postgres database and a **Blob** store and connect both to the project. This sets `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `BLOB_READ_WRITE_TOKEN`.
3. Under **Settings → Environment Variables**, add `AUTH_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Deploy. The `vercel-build` script runs migrations and seeds the admin user before `next build`.

Notes: uploads go through a serverless function, so each file must be under 4.5 MB. Bulk generation runs via `after()` with `maxDuration = 300`, so a single batch must finish within 5 minutes.

## 4. Test admin login

- URL: http://localhost:3000/login
- Email: `admin@certiflow.com`
- Password: `admin123`

All of `/dashboard`, `/templates`, `/projects`, `/assets`, `/certificates` are protected by `src/middleware.ts` and redirect to `/login` when unauthenticated. `/login` and `/verify/[certificateId]` are public.

## 5. Creating a certificate template (wizard)

1. Go to **Templates → New Template**.
2. **Step 1 — Template**: enter a name and upload a background PNG/JPG (this becomes the certificate canvas). Width/height/orientation are auto-detected.
3. **Step 2 — Logos**: upload one or more logo images. Each is added to the live preview as a draggable/resizable box — drag it into place, drag a corner to resize.
4. **Step 3 — Seals** (optional): same pattern as logos.
5. **Step 4 — Signatures**: upload a signature image, set the signer's name and designation. It renders on the canvas with the name/designation label beneath it.
6. **Step 5 — Student Name**: position the name field on the canvas, pick font, size, color, and case transform (as-is / UPPERCASE / lowercase / Title Case).
7. **Step 6 — Registration Number**: position the field and set a format string, e.g. `({{registration_number}})`.
8. **Step 7 — Content**: add one or more text blocks mixing static text with placeholders: `{{student_name}}`, `{{registration_number}}`, `{{date}}`, `{{event_name}}`, `{{organization}}`, `{{college}}`, `{{department}}`, or any custom `{{field}}` you plan to map from your spreadsheet.
9. **Step 8 — Watermark/QR**: optionally enable a watermark image (with opacity) and/or a QR code, which will encode a link to `/verify/[certificateId]`.
10. **Step 9 — Review**: check the summary and click **Save Template**.

All overlay positions are stored as **normalized 0–1 fractions** of the template's width/height, so they scale correctly to the full-resolution PDF at generation time — the same react-konva canvas (`src/components/wizard/canvas-editor.tsx`) is reused across every step for live drag/resize fine-tuning.

## 6. Creating a project & generating certificates

1. Go to **Projects → New Project**, name it, and pick a saved template.
2. On the project page, **Step 1**: upload an Excel (`.xlsx`) or CSV file of students. The parser (`src/lib/excel.ts`) auto-detects "Name" and "Registration Number" columns via fuzzy header matching (handles variants like "Reg No", "Roll Number", "Student Name", etc.).
3. **Step 2 — Column Mapping**: confirm or remap any column to `student_name`, `registration_number`, or the custom fields (`date`, `event_name`, `organization`, `college`, `department`). Click **Validate** to see row counts, missing-field errors, and duplicate registration numbers.
4. **Step 3 — Preview**: pick a row index and click **Preview PDF** to render one real certificate with that student's actual data, in a new tab.
5. **Step 4 — Generate**: click **Generate All**. A `GenerationJob` row tracks total/completed/failed and the page polls `/api/projects/[id]/jobs/[jobId]` every second, showing a progress bar. Only valid (non-error) rows are generated. Files are named `{registration_number}.pdf` (sanitized, no UUIDs).
6. Once complete, the **Generated Certificates** table lists each student with status, a **View** link (opens the PDF), and a **Regenerate** action (re-renders that one certificate from the current template).
7. Click **Download ZIP** at the top of the project page to stream a ZIP (built with `archiver`) of all generated PDFs, named after the project.

## 7. QR verification

If a template has QR codes enabled, each generated certificate embeds a QR pointing at `https://<host>/verify/<certificateId>`. That page (and its backing API `GET /api/verify/[certificateId]`) is public (no login) and shows validity plus student name, registration number, event, and date for a genuine certificate, or a "not found" state otherwise.

## 8. Asset library

**Assets** page lets you upload logos/seals/signatures/watermarks once and reuse them. The wizard also auto-registers any image you upload directly in it as a reusable asset.

## 9. Automated pipeline verification performed during the build

The full flow was exercised end-to-end against the running dev server with a script hitting the API routes directly (no UI needed for this check):

1. Uploaded a background image → created a template with a signature, student-name field, reg-number field, a dynamic text block, and QR enabled.
2. Created a project against that template.
3. Uploaded a 5-row CSV (3 valid students, 1 duplicate registration number, 1 missing name).
4. Column-mapping auto-detected "Name" → `student_name` and "Registration Number" → `registration_number`; validation correctly reported 3 valid rows, 1 duplicate, 1 missing-name error.
5. Rendered a live single-student preview PDF (200 OK, valid `%PDF` magic bytes).
6. Triggered generation: job completed 3/3 with 0 failures; polling endpoint returned live progress.
7. Downloaded each generated PDF over HTTP and confirmed all 3 start with `%PDF` and have non-trivial size (~2.9 KB each, since the test template used a 1x1 pixel placeholder background — real backgrounds will be larger).
8. Hit the ZIP endpoint, saved the response, and used `Expand-Archive` (PowerShell) to confirm it is a valid ZIP containing exactly `RA2311001.pdf`, `RA2311002.pdf`, `RA2311003.pdf` (correct sanitized filenames, no UUIDs).
9. Hit `/api/verify/[certificateId]` for a generated certificate and confirmed it returns `valid: true` with the correct student name, reg number, event name, and date.

## 10. Known limitations (intentionally deferred for this MVP)

- **No template versioning** — saving/editing a template overwrites its config; there's no history or diffing.
- **No undo/redo** in the wizard/canvas editor.
- **Storage.** `src/lib/storage.ts` uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set and local disk (`public/uploads`) otherwise.
- **No background job queue / Redis.** Bulk generation runs as an in-process `for` loop inside the Next.js route handler (kept alive with `after()`), tracked via a `GenerationJob` row that the frontend polls. This is fine for MVP-scale batches (tens to low hundreds of students) but will block the Node process for very large datasets and won't survive a server restart mid-run.
- **No custom font embedding.** PDF generation uses `pdf-lib`'s built-in `StandardFonts` only (Helvetica, Times-Roman, Courier) — no embedding of custom `.ttf`/`.otf` files, so non-Latin scripts or brand fonts aren't supported yet.
- **No layers panel** in the canvas editor — overlays are edited one at a time via the step forms plus click-to-select on canvas, not a full z-order/layers UI.
- **Single admin, no multi-admin/org accounts.** One seeded admin user; no roles, invitations, or per-organization data isolation.
- **No email/WhatsApp sharing** of generated certificates — download only (single file or ZIP).
- **No certificate revocation/expiration.** Once generated, a certificate's `/verify` page reports it valid indefinitely; there's no "revoke" or expiry-date flag.
