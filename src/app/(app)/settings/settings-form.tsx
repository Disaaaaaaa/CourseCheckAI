"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Teacher } from "@/lib/supabase/types";

export function SettingsForm({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(teacher.full_name ?? "");
  const [schoolName, setSchoolName] = React.useState(teacher.school_name ?? "");
  const [subject, setSubject] = React.useState(teacher.subject ?? "Қазақстан тарихы");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          school_name: schoolName,
          subject,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Сақталмады");
      }
      toast.success("Профиль жаңартылды.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Қате");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={teacher.email} disabled />
        <p className="text-xs text-muted-foreground">
          Email өзгерту үшін қолдау қызметіне жазыңыз.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Аты-жөні</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schoolName">Мектеп</Label>
        <Input
          id="schoolName"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="НЗМ ХБН Астана"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Пән</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Сақтау
      </Button>
    </form>
  );
}
