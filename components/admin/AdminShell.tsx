"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, MenuIcon, PlugIcon, XIcon } from "lucide-react";

const navItems = [
  { href: "/admin/judgements", label: "判定結果管理", icon: LayoutDashboardIcon },
  { href: "/admin/api-check", label: "API接続チェック", icon: PlugIcon },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen">
      {/* モバイル: ハンバーガー + ドロワー */}
      <header className="fixed left-0 right-0 top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          aria-label="メニューを開く"
        >
          <MenuIcon className="size-6" />
        </button>
        <h1 className="text-lg font-semibold">管理</h1>
      </header>

      {/* モバイル メニューオーバーレイ */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={closeMenu}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-background shadow-lg md:hidden"
            aria-modal
            aria-label="メニュー"
          >
            <div className="flex h-full flex-col p-4">
              <div className="flex items-center justify-between mb-6">
                <Link href="/admin" className="text-lg font-semibold" onClick={closeMenu}>
                  管理画面
                </Link>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="メニューを閉じる"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      pathname === href ? "bg-muted" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <footer className="border-t pt-4">
                <Link
                  href="/judge"
                  onClick={closeMenu}
                  className="text-muted-foreground text-sm underline"
                >
                  判定フォームへ
                </Link>
              </footer>
            </div>
          </aside>
        </>
      )}

      {/* デスクトップ: サイドバー */}
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:block">
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
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                  pathname === href ? "bg-muted" : ""
                }`}
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

      {/* メインコンテンツ */}
      <main className="min-w-0 flex-1 overflow-auto">
        {/* デスクトップ用ヘッダー（モバイルでは固定ヘッダーの下にコンテンツ） */}
        <header className="sticky top-0 z-10 hidden border-b bg-background/95 px-4 py-4 backdrop-blur md:block lg:px-6">
          <h1 className="text-lg font-semibold">管理</h1>
        </header>
        <div className="p-4 pt-20 md:pt-6 md:p-6 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
