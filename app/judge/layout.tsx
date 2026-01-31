import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "物件判定 | 買取再販",
  description: "買取再販の物件判定フォーム",
};

export default function JudgeLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
