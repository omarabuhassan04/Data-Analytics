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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1411" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * يُطبَّق المظهر المحفوظ قبل أول رسم.
 *
 * لو انتظرنا React لظهرت الصفحة بالوضع النهاري لجزء من الثانية ثم انقلبت إلى
 * الليلي — وميض أبيض في وجه من اختار الظلام عمداً.
 */
const noFlashScript = `
try {
  var t = localStorage.getItem('sanabel-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
