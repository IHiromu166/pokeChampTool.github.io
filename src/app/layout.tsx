import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ポケダメ計算ツール",
  description:
    "ポケモンチャンピオンズ（メガシンカ + SV準拠）向け ダメージ計算 / 逆引き / 耐久調整ツール",
};

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/calc", label: "ダメージ計算" },
  { href: "/reverse", label: "逆引き" },
  { href: "/bulk", label: "耐久調整" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-border bg-surface">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-accent">
              ポケダメ計算
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV.slice(1).map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-accent">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="ml-auto text-xs text-gray-500">
              チャンピオンズ仕様（メガ有・テラ無）
            </span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
