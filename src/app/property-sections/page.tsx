"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type PropertySection = {
  id: string;
  section_name: string;
};

export default function PropertySectionsPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [sections, setSections] = useState<PropertySection[]>([]);
  const [sectionName, setSectionName] = useState("");

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchSections = useCallback(async () => {
    const res = await fetch("/api/property-sections");
    const payload = await res.json() as { data?: PropertySection[] };
    setSections((payload.data ?? []).sort((a, b) => a.section_name.localeCompare(b.section_name)));
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSignedInEmail(data.session?.user?.email ?? null);
    });
    void fetchSections();
  }, [supabase, fetchSections]);

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

  const addSection = async (e: FormEvent) => {
    e.preventDefault();
    const authHeader = await getAuthHeader();
    if (!authHeader) { setStatus("Sign in to add sections."); return; }
    const res = await fetch("/api/property-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: sectionName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setStatus(payload.error ?? "Failed."); return; }
    setSectionName("");
    setStatus("Section added.");
    await fetchSections();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-[#355e3b] hover:underline">← Home</Link>
        </div>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#355e3b]">Property Sections</h1>

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
          <h2 className="font-semibold text-[#355e3b]">Add Section</h2>
          <form onSubmit={addSection} className="mt-4 space-y-3">
            <input
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              placeholder="Section name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
            <button className="rounded-md bg-[#355e3b] px-4 py-2 text-sm text-[#eef5ef]" type="submit">
              Add Section
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="font-semibold text-[#355e3b]">Sections ({sections.length})</h2>
          {sections.length === 0 ? (
            <p className="mt-3 text-sm text-black">No sections yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {sections.map((s) => (
                <li key={s.id} className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3 text-sm font-medium">
                  {s.section_name}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
