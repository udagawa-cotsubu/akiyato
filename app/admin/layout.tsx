import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboardIcon, PlugIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "管理",
  description: "買取再販判定 管理画面",
};

const navItems = [
  { href: "/admin/judgements", label: "判定結果管理", icon: LayoutDashboardIcon },
  { href: "/admin/api-check", label: "API接続チェック", icon: PlugIcon },
] as const;

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <header className="mb-6">
            <Link href="/admin" className="text-lg font-semibold">
              管理画面
            </Link>
          </header>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <footer className="border-t pt-4">
            <Link
              href="/judge"
              className="text-muted-foreground text-sm underline"
            >
              判定フォームへ
            </Link>
          </footer>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">管理</h1>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
