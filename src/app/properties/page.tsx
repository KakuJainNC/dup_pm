"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type Property = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  created_by: string | null;
  property_sections?: { section_name: string } | null;
};

type PropertySection = {
  id: string;
  section_name: string;
};

export default function PropertiesPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [properties, setProperties] = useState<Property[]>([]);
  const [sections, setSections] = useState<PropertySection[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propSectionId, setPropSectionId] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);

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
    void fetchData();
  }, [fetchData]);

  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in to add properties."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: propName, address: propAddress || null, property_section_id: propSectionId }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setError(payload.error ?? "Failed."); return; }
    setPropName("");
    setPropAddress("");
    setPropSectionId("");
    setShowModal(false);
    await fetchData();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const filtered = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.address ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.property_sections?.section_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Properties" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#355e3b]">Properties</h1>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Search properties"
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
            <p className="mt-4 text-sm text-black">No properties found.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.map((p) => (
                <li key={p.id} onClick={() => setDetailProperty(p)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3 hover:bg-[#eaf3ec] transition-colors">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Property</h2>
              <button onClick={() => setShowModal(false)} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addProperty} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Property name"
                value={propName}
                onChange={(e) => setPropName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Address (optional)"
                value={propAddress}
                onChange={(e) => setPropAddress(e.target.value)}
              />
              <select
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                value={propSectionId}
                onChange={(e) => setPropSectionId(e.target.value)}
              >
                <option value="">Select property section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.section_name}</option>
                ))}
              </select>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Property
              </button>
            </form>
          </div>
        </div>
      )}
      {detailProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailProperty(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Entry Details</h2>
              <button onClick={() => setDetailProperty(null)} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <div className="mt-4 space-y-3">
              <p className="font-semibold text-[#355e3b]">{detailProperty.name}</p>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/60">Added by</span>
                  <span className="font-medium">{detailProperty.created_by ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Added on</span>
                  <span className="font-medium">{new Date(detailProperty.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showToast && <Toast message="Done" />}
    </div>
  );
}
