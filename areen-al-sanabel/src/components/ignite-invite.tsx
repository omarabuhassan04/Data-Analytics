"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";

import { useIgnition } from "@/components/ignition";

/**
 * دعوة إشعال النار.
 *
 * زرّ حقيقي وليس مجرّد نص: يستجيب للوحة المفاتيح وقارئ الشاشة.
 * ومع ذلك فالدخول غير مرهون به إطلاقًا — النار تشتعل تلقائيًا بعد لحظات،
 * والنموذج قابل للاستخدام منذ اللحظة الأولى.
 */
export function IgniteInvite() {
  const { lit, ignite } = useIgnition();

  return (
    <AnimatePresence>
      {!lit && (
        <motion.button
          type="button"
          onClick={ignite}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.4 } }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="invite pointer-events-auto absolute bottom-[calc(3vh+clamp(190px,30vh,320px))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#8a5f1d] bg-black/55 px-4 py-2 text-sm font-bold text-[#ffd98a] backdrop-blur-sm"
        >
          <Flame className="size-4 text-[#ff9a2e]" aria-hidden />
          أشعل النار لتبدأ
        </motion.button>
      )}
    </AnimatePresence>
  );
}
