import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "管理",
  description: "買取再販判定 管理画面",
};

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
