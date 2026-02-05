"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isOccupancy =
    pathname === "/admin/lodging/dashboard" ||
    pathname.startsWith("/admin/lodging/dashboard/occupancy");
  const isAdr = pathname.startsWith("/admin/lodging/dashboard/adr");
  const isSales = pathname.startsWith("/admin/lodging/dashboard/sales");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        <Link
          href="/admin/lodging/dashboard/occupancy"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isOccupancy
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          }`}
        >
          稼働率
        </Link>
        <Link
          href="/admin/lodging/dashboard/adr"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isAdr
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          }`}
        >
          ADR
        </Link>
        <Link
          href="/admin/lodging/dashboard/sales"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isSales
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          }`}
        >
          売上
        </Link>
      </div>
      {children}
    </div>
  );
}
