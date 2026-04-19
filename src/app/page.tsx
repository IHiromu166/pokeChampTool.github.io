import Link from "next/link";

const CARDS = [
  {
    href: "/calc",
    title: "ダメージ計算",
    desc: "攻撃側・防御側・技・場の状態を入力すると、最小〜最大ダメージと確定数を即時計算します。",
  },
  {
    href: "/reverse",
    title: "逆引き",
    desc: "実戦で観測したダメージ％から相手の HP/防御の振りを推定。または「○○を倒すのに必要な火力」を逆算します。",
  },
  {
    href: "/bulk",
    title: "ステータス調整",
    desc: "耐久調整（想定脅威リストから H/B/D 配分を提案）と、必要火力（目標達成に必要な攻撃側能力ポイントを逆算）を提供します。",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="panel">
        <h1 className="text-xl font-semibold mb-2">ポケモンチャンピオンズ向け 計算ツール</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          メガシンカ有り、Z技 / ダイマックス / テラスタル無し。
          天候・場・ステータス計算式は SV(第9世代) 準拠（雪は氷タイプの B 1.5倍）。
          すべての計算はブラウザ内で完結し、データはリポジトリ内 JSON で管理されます。
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="panel hover:border-accent transition">
            <h2 className="font-semibold text-blue-600 mb-2">{c.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
          </Link>
        ))}
      </div>
      <div className="panel">
        <p className="text-xs text-gray-400 leading-relaxed">
          作成者: いのむ (aka ShowGuy)
          <br />
          本ツールはファンメイドの非公式ツールです。
        </p>
      </div>
    </div>
  );
}
