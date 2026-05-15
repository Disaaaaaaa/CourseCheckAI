"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "Барлық статус" },
  { value: "uploaded", label: "Жүктелді" },
  { value: "analyzing", label: "AI талдауда" },
  { value: "ready", label: "AI дайын" },
  { value: "reviewed", label: "Бекітілді" },
  { value: "failed", label: "Қате" },
];

export function SubmissionsFilter({ classes }: { classes: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`/submissions?${next.toString()}`);
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      router.push(`/submissions?${next.toString()}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input
        placeholder="Тақырып немесе оқушы атымен іздеу..."
        className="md:max-w-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Select
        value={params.get("status") ?? "all"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="md:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get("cls") ?? "all"}
        onValueChange={(v) => update("cls", v)}
      >
        <SelectTrigger className="md:w-40">
          <SelectValue placeholder="Сынып" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Барлық сынып</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
