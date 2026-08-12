"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { CartProvider } from "@/components/cart";
import { SessionProvider, type SessionUser } from "@/components/session";
import { ToastProvider } from "@/components/toast";
import { fetcher } from "@/lib/client";

export function Providers({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        // الكميات وحالات الطلبات تتغيّر أثناء عمل عدّة مسؤولين في الوقت نفسه
        dedupingInterval: 2_000,
        shouldRetryOnError: false,
      }}
    >
      <SessionProvider user={user}>
        <ToastProvider>
          <CartProvider userId={user.id}>{children}</CartProvider>
        </ToastProvider>
      </SessionProvider>
    </SWRConfig>
  );
}
