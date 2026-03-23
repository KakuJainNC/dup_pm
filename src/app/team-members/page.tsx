"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
};

export default function TeamMembersPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/team-members");
    const payload = await res.json() as { data?: TeamMember[] };
    setMembers((payload.data ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSignedInEmail(data.session?.user?.email ?? null);
    });
    void fetchMembers();
  }, [supabase, fetchMembers]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) { setStatus(`Sign in failed: ${error.message}`); return; }
    const { data } = await supabase.auth.getSession();
    setSignedInEmail(data.session?.user?.email ?? null);
    setStatus("Signed in.");
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail(null);
    setStatus("Signed out.");
  };

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    const authHeader = await getAuthHeader();
    if (!authHeader) { setStatus("Sign in to add members."); return; }
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ full_name: name, email: email || null }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setStatus(payload.error ?? "Failed."); return; }
    setName("");
    setEmail("");
    setStatus("Team member added.");
    await fetchMembers();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-[#355e3b] hover:underline">← Home</Link>
        </div>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#355e3b]">Team Members</h1>

          {signedInEmail ? (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-black">Signed in as {signedInEmail}</p>
              <button onClick={signOut} className="rounded-md border border-[#b8cbbd] px-2 py-1 text-xs">Sign Out</button>
            </div>
          ) : (
            <form onSubmit={signIn} className="mt-4 flex flex-wrap items-end gap-2">
              <input
                className="rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                className="rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
              <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">Sign In</button>
            </form>
          )}

          {status && <p className="mt-2 text-sm text-black">{status}</p>}
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="font-semibold text-[#355e3b]">Add Team Member</h2>
          <form onSubmit={addMember} className="mt-4 space-y-3">
            <input
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="rounded-md bg-[#355e3b] px-4 py-2 text-sm text-[#eef5ef]" type="submit">
              Add Member
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="font-semibold text-[#355e3b]">Team Members ({members.length})</h2>
          {members.length === 0 ? (
            <p className="mt-3 text-sm text-black">No team members yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#355e3b" viewBox="0 0 256 256" className="shrink-0">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">{m.full_name}</p>
                    {m.email && <p className="text-xs text-black">{m.email}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
