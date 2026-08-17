"use client";

import { motion } from "framer-motion";
import useSWR from "swr";

import {
  IconDepot,
  IconEnter,
  IconLogbook,
  IconManifest,
  IconTroop,
} from "@/components/icons";
import {
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { errorMessage } from "@/lib/client";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ActivityDto } from "@/lib/types";

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  Auth: <IconEnter className="size-4" />,
  Item: <IconDepot className="size-4" />,
  Category: <IconDepot className="size-4" />,
  Request: <IconManifest className="size-4" />,
  User: <IconTroop className="size-4" />,
};

const ENTITY_TONES: Record<string, string> = {
  Auth: "bg-sand-100 text-ink-500",
  Item: "bg-forest-50 text-forest-600",
  Category: "bg-forest-50 text-forest-600",
  Request: "bg-ember-50 text-ember-600",
  User: "bg-crimson-50 text-crimson-600",
};

export default function ActivityPage() {
  const { data, error, isLoading } = useSWR<{ entries: ActivityDto[] }>(
    "/api/activity?limit=150",
    { refreshInterval: 30_000 },
  );

  const entries = data?.entries ?? [];

  return (
    <div>
      <PageHeader
        title="سجل النشاط"
      />

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !data && <LoadingBlock />}

      {data && entries.length === 0 && (
        <Card>
          <EmptyState icon={<IconLogbook className="size-6" />} title="السجل فارغ" />
        </Card>
      )}

      {entries.length > 0 && (
        <Card>
          <ul className="divide-y divide-sand-200">
            {entries.map((entry, index) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.015, 0.4) }}
                className="flex items-start gap-3 p-4"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    ENTITY_TONES[entry.entity] ?? "bg-sand-100 text-ink-500"
                  }`}
                >
                  {ENTITY_ICONS[entry.entity] ?? <IconLogbook className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-ink-800">
                    <span className="font-bold">{entry.actorName}</span> {entry.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {formatDateTime(entry.createdAt)} · {formatRelative(entry.createdAt)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
