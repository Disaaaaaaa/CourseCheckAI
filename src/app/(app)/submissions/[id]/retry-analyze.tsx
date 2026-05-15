"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RetryAnalyzeButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "AI талдау уақытша орындалмады.");
      }
      toast.success("Талдау дайын!");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Қате");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Қайта талдау
    </Button>
  );
}
