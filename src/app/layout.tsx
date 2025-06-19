import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nill AI",
  description: "Nill AI hẹ hẹ hẹ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={geist.className}>
        <main className="min-h-screen bg-gray-900">{children}</main>
      </body>
    </html>
  );
}
