"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_sections?: { section_name: string } | null;
};

type PropertySection = {
  id: string;
  section_name: string;
};

export default function PropertiesPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [sections, setSections] = useState<PropertySection[]>([]);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propSectionId, setPropSectionId] = useState("");

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchData = useCallback(async () => {
    const [propRes, secRes] = await Promise.all([
      fetch("/api/properties"),
      fetch("/api/property-sections"),
    ]);
    const propPayload = await propRes.json() as { data?: Property[] };
    const secPayload = await secRes.json() as { data?: PropertySection[] };
    setProperties((propPayload.data ?? []).sort((a, b) => a.name.localeCompare(b.name)));
    setSections(secPayload.data ?? []);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSignedInEmail(data.session?.user?.email ?? null);
    });
    void fetchData();
  }, [supabase, fetchData]);

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

  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    const authHeader = await getAuthHeader();
    if (!authHeader) { setStatus("Sign in to add properties."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: propName, address: propAddress || null, property_section_id: propSectionId }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setStatus(payload.error ?? "Failed."); return; }
    setPropName("");
    setPropAddress("");
    setPropSectionId("");
    setStatus("Property added.");
    await fetchData();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-[#355e3b] hover:underline">← Home</Link>
        </div>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#355e3b]">Properties</h1>

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
          <h2 className="font-semibold text-[#355e3b]">Add Property</h2>
          <form onSubmit={addProperty} className="mt-4 space-y-3">
            <input
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              placeholder="Property name"
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              placeholder="Address (optional)"
              value={propAddress}
              onChange={(e) => setPropAddress(e.target.value)}
            />
            <select
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              value={propSectionId}
              onChange={(e) => setPropSectionId(e.target.value)}
            >
              <option value="">Select property section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.section_name}</option>
              ))}
            </select>
            <button className="rounded-md bg-[#355e3b] px-4 py-2 text-sm text-[#eef5ef]" type="submit">
              Add Property
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h2 className="font-semibold text-[#355e3b]">Properties ({properties.length})</h2>
          {properties.length === 0 ? (
            <p className="mt-3 text-sm text-black">No properties yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {properties.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#355e3b" viewBox="0 0 256 256" className="shrink-0">
                    <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-black">
                      {[p.property_sections?.section_name, p.address].filter(Boolean).join(" · ")}
                    </p>
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
