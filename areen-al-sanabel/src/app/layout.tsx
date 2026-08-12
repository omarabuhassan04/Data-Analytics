import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";

import { LOGO_SRC } from "@/components/logo";
import { GROUP_NAME, GROUP_TAGLINE } from "@/lib/domain";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: `${GROUP_NAME} — ${GROUP_TAGLINE}`,
    template: `%s · ${GROUP_NAME}`,
  },
  description: `${GROUP_TAGLINE} لمجموعة ${GROUP_NAME} الكشفية`,
  icons: { icon: LOGO_SRC },
};

export const viewport: Viewport = {
  themeColor: "#17603a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
