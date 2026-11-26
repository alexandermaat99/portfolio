"use client";
import { useState, type FormEvent } from "react";
import s from "../racing.module.css";
import a from "./admin.module.css";

export default function Login({ problem }: { problem: string | null }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const password = String(new FormData(e.currentTarget).get("password") || "");
    const res = await fetch("/api/racing/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    if (res.ok) window.location.reload();
    else {
      setErr((await res.json().catch(() => ({}))).error || "Couldn't log in");
      setBusy(false);
    }
  };
  return (
    <div className={s.root}>
      <main className={s.main}>
        <section className={`${s.card} ${a.login}`}>
          <h2 className={s.cardTitle}><span>SimStats admin</span></h2>
          {!problem ? (
            <form className={a.form} onSubmit={submit}>
              <label>Password<input type="password" name="password" autoComplete="current-password" autoFocus required /></label>
              <button className={`${a.btn} ${a.primary}`} disabled={busy}>Log in</button>
              {err && <div className={a.bad}>{err}</div>}
            </form>
          ) : (
            <div className={s.muted}>{problem}</div>
          )}
        </section>
      </main>
    </div>
  );
}
