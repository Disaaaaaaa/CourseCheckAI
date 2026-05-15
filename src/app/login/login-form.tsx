"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, signupAction, type LoginState } from "./actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Күтіңіз..." : children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction] = useActionState<LoginState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Аты-жөні</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            placeholder="Айгүл Әбенова"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="teacher@school.kz"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Құпиясөз</Label>
          {mode === "login" && (
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Ұмыттыңыз ба?
            </Link>
          )}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton>{mode === "login" ? "Кіру" : "Тіркелу"}</SubmitButton>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "login" ? "Аккаунтыңыз жоқ па?" : "Тіркелгеніңіз бар ма?"}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() =>
            setMode((m) => (m === "login" ? "signup" : "login"))
          }
        >
          {mode === "login" ? "Тіркелу" : "Кіру"}
        </button>
      </p>
    </form>
  );
}
