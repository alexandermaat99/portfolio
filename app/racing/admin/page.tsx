// app/racing/admin/page.tsx: organiser-only page for drivers and competitions.
import type { Metadata } from "next";
import { adminConfigured, isAdmin } from "../lib/admin-auth";
import { adminState } from "../lib/admin-state";
import AdminApp from "./AdminApp";
import Login from "./Login";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SimStats admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <Login configured={adminConfigured()} />;
  return <AdminApp initial={await adminState()} />;
}
