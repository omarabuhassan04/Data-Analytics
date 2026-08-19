import type { Metadata, Viewport } from "next";
import { Cairo, Noto_Kufi_Arabic } from "next/font/google";

import "./globals.css";

/**
 * خطّان بدورين مختلفين.
 *
 * الكوفي للعناوين: أشكاله الهندسية تحمل وقاراً وهوية، لكنه يتعب العين في
 * الفقرات والجداول. وكايرو للنص والواجهة: محايد وواضح عند الأحجام الصغيرة.
 * التوتّر بين الاثنين هو ما يعطي الصفحة إحساس المنتج المصمَّم لا المُجمَّع.
 */
const body = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["600", "700"],
  variable: "--font-display-ar",
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
    { media: "(prefers-color-scheme: light)", color: "#f3f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0c110e" },
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
    <html
      lang="ar"
      dir="rtl"
      className={`${body.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
