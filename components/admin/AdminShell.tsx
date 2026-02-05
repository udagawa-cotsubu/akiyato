"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, MenuIcon, PlugIcon, XIcon, HotelIcon, Building2Icon } from "lucide-react";

const navItems = [
  { href: "/admin/judgements", label: "判定結果管理", icon: LayoutDashboardIcon },
  { href: "/admin/inns", label: "宿管理", icon: Building2Icon },
  { href: "/admin/lodging/import", label: "予約インポート", icon: HotelIcon },
  { href: "/admin/lodging/dashboard", label: "ダッシュボード", icon: LayoutDashboardIcon },
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
          className="cursor-pointer flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
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
                <Link href="/admin" className="cursor-pointer text-lg font-semibold" onClick={closeMenu}>
                  管理画面
                </Link>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="cursor-pointer flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
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
                    className={`cursor-pointer flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "bg-muted" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <footer className="border-t pt-4 flex flex-col gap-2">
                <Link
                  href="/admin/api-check"
                  onClick={closeMenu}
                  className={`cursor-pointer flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === "/admin/api-check" ? "bg-muted" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <PlugIcon className="size-4" />
                  API接続チェック
                </Link>
                <Link
                  href="/judge"
                  onClick={closeMenu}
                  className="cursor-pointer text-muted-foreground text-sm underline"
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
            <Link href="/admin" className="cursor-pointer text-lg font-semibold">
              管理画面
            </Link>
          </header>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`cursor-pointer flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                  pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "bg-muted" : ""
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <footer className="border-t pt-4 flex flex-col gap-2">
            <Link
              href="/admin/api-check"
              className={`cursor-pointer flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                pathname === "/admin/api-check" ? "bg-muted" : "text-muted-foreground"
              }`}
            >
              <PlugIcon className="size-4" />
              API接続チェック
            </Link>
            <Link
              href="/judge"
              className="cursor-pointer text-muted-foreground text-sm underline"
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
