"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type PropertySection = {
  id: string;
  section_name: string;
};

export default function PropertySectionsPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [sections, setSections] = useState<PropertySection[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [error, setError] = useState("");

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
    void fetchSections();
  }, [fetchSections]);

  const addSection = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in to add sections."); return; }
    const res = await fetch("/api/property-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: sectionName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setError(payload.error ?? "Failed."); return; }
    setSectionName("");
    setShowModal(false);
    await fetchSections();
  };

  const filtered = sections.filter((s) =>
    s.section_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <div className="bg-[#355e3b] px-10 py-4 text-center">
        <h1 className="text-xl font-semibold text-white uppercase tracking-widest">Sections</h1>
      </div>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#355e3b]">Sections</h1>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Search sections"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => { setError(""); setShowModal(true); }}
                className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-black">No sections found.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.map((s) => (
                <li key={s.id} className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3 text-sm font-medium">
                  {s.section_name}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Section</h2>
              <button onClick={() => setShowModal(false)} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addSection} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Section name"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Section
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
