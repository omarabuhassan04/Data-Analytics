import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";

import "./globals.css";

// خط عربي واحد للواجهة كلها. أوزان محدودة تُبقي حجم التحميل صغيراً.
const arabic = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "نظام اللوازم — مجموعة السنابل الكشفية",
    template: "%s · نظام اللوازم",
  },
  description:
    "نظام إدارة اللوازم والمخزون والمشتريات والعهد لمجموعة السنابل الكشفية.",
};

export const viewport: Viewport = {
  themeColor: "#245036",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
