"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type PropertySection = {
  id: string;
  section_name: string;
  created_at: string;
  created_by: string | null;
};

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_section_id: string;
  created_at: string;
  created_by: string | null;
  property_sections?: { section_name: string } | null;
};

type Tab = "sections" | "properties";

export default function PropertiesPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [activeTab, setActiveTab] = useState<Tab>("sections");
  const [userRole, setUserRole] = useState<string | null>(null);

  const [sections, setSections] = useState<PropertySection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [sectionSearch, setSectionSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  // Section form
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionError, setSectionError] = useState("");

  // Property form
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propSectionId, setPropSectionId] = useState("");
  const [propError, setPropError] = useState("");

  // Section detail + edit/delete
  const [detailSection, setDetailSection] = useState<PropertySection | null>(null);
  const [sectionEditMode, setSectionEditMode] = useState(false);
  const [sectionEditName, setSectionEditName] = useState("");
  const [sectionEditError, setSectionEditError] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionDeleteConfirm, setSectionDeleteConfirm] = useState(false);
  const [sectionDeleting, setSectionDeleting] = useState(false);
  const [sectionDeleteError, setSectionDeleteError] = useState("");

  // Inline property list in section detail
  const [sectionPropSearch, setSectionPropSearch] = useState("");
  // Add property sub-modal (section locked)
  const [showAddPropInSection, setShowAddPropInSection] = useState(false);
  const [subPropName, setSubPropName] = useState("");
  const [subPropAddress, setSubPropAddress] = useState("");
  const [subPropError, setSubPropError] = useState("");

  // Property detail + edit/delete
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [propEditMode, setPropEditMode] = useState(false);
  const [propEditName, setPropEditName] = useState("");
  const [propEditAddress, setPropEditAddress] = useState("");
  const [propEditError, setPropEditError] = useState("");
  const [propSaving, setPropSaving] = useState(false);
  const [propDeleteConfirm, setPropDeleteConfirm] = useState(false);
  const [propDeleting, setPropDeleting] = useState(false);
  const [propDeleteError, setPropDeleteError] = useState("");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Done");

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const showSuccess = (msg = "Done") => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const fetchData = useCallback(async () => {
    const [secRes, propRes] = await Promise.all([
      fetch("/api/property-sections"),
      fetch("/api/properties"),
    ]);
    const secPayload = await secRes.json() as { data?: PropertySection[] };
    const propPayload = await propRes.json() as { data?: Property[] };
    setSections((secPayload.data ?? []).sort((a, b) => a.section_name.localeCompare(b.section_name)));
    setProperties((propPayload.data ?? []).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  // Fetch current user's app_role
  const fetchUserRole = useCallback(async () => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    if (!email) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("profiles")
      .select("app_role")
      .eq("email", email)
      .single();
    setUserRole(data?.app_role ?? null);
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    void fetchData();
    void fetchUserRole();
  }, [fetchData, fetchUserRole]);

  const isAdmin = userRole === "admin";

  // ── Add section ──
  const addSection = async (e: FormEvent) => {
    e.preventDefault();
    setSectionError("");
    const duplicate = sections.some(
      (s) => s.section_name.toLowerCase() === sectionName.trim().toLowerCase()
    );
    if (duplicate) { setSectionError("A section with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setSectionError("You must be signed in."); return; }
    const res = await fetch("/api/property-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: sectionName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setSectionError(payload.error ?? "Failed."); return; }
    setSectionName("");
    setShowSectionModal(false);
    await fetchData();
    showSuccess("Section added");
  };

  // ── Add property ──
  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    setPropError("");
    const duplicate = properties.some(
      (p) => p.name.toLowerCase() === propName.trim().toLowerCase()
    );
    if (duplicate) { setPropError("A property with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setPropError("You must be signed in."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: propName, address: propAddress || null, property_section_id: propSectionId }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setPropError(payload.error ?? "Failed."); return; }
    setPropName("");
    setPropAddress("");
    setPropSectionId("");
    setShowPropertyModal(false);
    await fetchData();
    showSuccess("Property added");
  };

  // ── Edit section ──
  const saveSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!detailSection) return;
    setSectionEditError("");
    const trimmed = sectionEditName.trim();
    const duplicate = sections.some(
      (s) => s.id !== detailSection.id && s.section_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) { setSectionEditError("A section with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setSectionEditError("You must be signed in."); return; }
    setSectionSaving(true);
    const res = await fetch(`/api/property-sections/${detailSection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: trimmed }),
    });
    const payload = await res.json() as { error?: string };
    setSectionSaving(false);
    if (!res.ok) { setSectionEditError(payload.error ?? "Failed."); return; }
    setSectionEditMode(false);
    await fetchData();
    setDetailSection((prev) => prev ? { ...prev, section_name: trimmed } : null);
    showSuccess("Section updated");
  };

  // ── Delete section ──
  const deleteSection = async () => {
    if (!detailSection) return;
    setSectionDeleteError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setSectionDeleting(true);
    const res = await fetch(`/api/property-sections/${detailSection.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = await res.json() as { error?: string };
    setSectionDeleting(false);
    if (!res.ok) { setSectionDeleteError(payload.error ?? "Failed."); setSectionDeleteConfirm(false); return; }
    setDetailSection(null);
    setSectionDeleteConfirm(false);
    await fetchData();
    showSuccess("Section deleted");
  };

  // ── Add property inside section detail ──
  const addPropertyInSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!detailSection) return;
    setSubPropError("");
    const duplicate = properties.some(
      (p) => p.name.toLowerCase() === subPropName.trim().toLowerCase()
    );
    if (duplicate) { setSubPropError("A property with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setSubPropError("You must be signed in."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: subPropName, address: subPropAddress || null, property_section_id: detailSection.id }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setSubPropError(payload.error ?? "Failed."); return; }
    setSubPropName("");
    setSubPropAddress("");
    setShowAddPropInSection(false);
    await fetchData();
    showSuccess("Property added");
  };

  // ── Edit property ──
  const saveProperty = async (e: FormEvent) => {
    e.preventDefault();
    if (!detailProperty) return;
    setPropEditError("");
    const trimmedName = propEditName.trim();
    const duplicate = properties.some(
      (p) => p.id !== detailProperty.id && p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) { setPropEditError("A property with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setPropEditError("You must be signed in."); return; }
    setPropSaving(true);
    const res = await fetch(`/api/properties/${detailProperty.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: trimmedName, address: propEditAddress.trim() || null }),
    });
    const payload = await res.json() as { error?: string };
    setPropSaving(false);
    if (!res.ok) { setPropEditError(payload.error ?? "Failed."); return; }
    setPropEditMode(false);
    await fetchData();
    setDetailProperty((prev) => prev ? { ...prev, name: trimmedName, address: propEditAddress.trim() || null } : null);
    showSuccess("Property updated");
  };

  // ── Delete property ──
  const deleteProperty = async () => {
    if (!detailProperty) return;
    setPropDeleteError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setPropDeleting(true);
    const res = await fetch(`/api/properties/${detailProperty.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = await res.json() as { error?: string };
    setPropDeleting(false);
    if (!res.ok) { setPropDeleteError(payload.error ?? "Failed."); setPropDeleteConfirm(false); return; }
    setDetailProperty(null);
    setPropDeleteConfirm(false);
    await fetchData();
    showSuccess("Property deleted");
  };

  // Property count per section
  const propertyCounts = properties.reduce<Record<string, number>>((acc, p) => {
    acc[p.property_section_id] = (acc[p.property_section_id] ?? 0) + 1;
    return acc;
  }, {});

  const filteredSections = sections.filter((s) =>
    s.section_name.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
    (p.address ?? "").toLowerCase().includes(propertySearch.toLowerCase()) ||
    (p.property_sections?.section_name ?? "").toLowerCase().includes(propertySearch.toLowerCase())
  );

  // Properties in the currently-open section detail
  const sectionDetailProperties = detailSection
    ? properties
        .filter((p) => p.property_section_id === detailSection.id)
        .filter(
          (p) =>
            p.name.toLowerCase().includes(sectionPropSearch.toLowerCase()) ||
            (p.address ?? "").toLowerCase().includes(sectionPropSearch.toLowerCase())
        )
    : [];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Properties" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-1 w-fit mb-6">
            {(["sections", "properties"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-[#355e3b] text-white shadow-sm"
                    : "text-black hover:text-[#355e3b]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Sections tab ── */}
          {activeTab === "sections" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#355e3b]">Sections</h1>
                <div className="flex items-center gap-2">
                  <input
                    className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                    placeholder="Search sections"
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                  />
                  <button
                    onClick={() => { setSectionName(""); setSectionError(""); setShowSectionModal(true); }}
                    className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {filteredSections.length === 0 ? (
                <p className="mt-4 text-sm text-black">No sections found.</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-[#c9d9cc]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#c9d9cc] bg-[#f3f8f4]">
                        <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Section Name</th>
                        <th className="px-4 py-3 text-right font-semibold text-[#355e3b]">Properties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSections.map((s, i) => (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setDetailSection(s);
                            setSectionEditMode(false);
                            setSectionDeleteConfirm(false);
                            setSectionDeleteError("");
                            setSectionPropSearch("");
                            setShowAddPropInSection(false);
                          }}
                          className={`cursor-pointer border-b border-[#c9d9cc] last:border-0 hover:bg-[#eaf3ec] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}
                        >
                          <td className="px-4 py-3 font-medium">{s.section_name}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="rounded-full bg-[#355e3b]/10 px-2.5 py-1 text-xs font-medium text-[#355e3b]">
                              {propertyCounts[s.id] ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Properties tab ── */}
          {activeTab === "properties" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#355e3b]">Properties</h1>
                <div className="flex items-center gap-2">
                  <input
                    className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                    placeholder="Search properties"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                  />
                  <button
                    onClick={() => { setPropName(""); setPropAddress(""); setPropSectionId(""); setPropError(""); setShowPropertyModal(true); }}
                    className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {filteredProperties.length === 0 ? (
                <p className="mt-4 text-sm text-black">No properties found.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {filteredProperties.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setDetailProperty(p);
                        setPropEditMode(false);
                        setPropDeleteConfirm(false);
                        setPropDeleteError("");
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3 hover:bg-[#eaf3ec] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#355e3b" viewBox="0 0 256 256" className="shrink-0">
                        <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-black/60">
                          {[p.property_sections?.section_name, p.address].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── Add Section modal ── */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Section</h2>
              <button onClick={() => { setSectionName(""); setSectionError(""); setShowSectionModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addSection} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Section name"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
              />
              {sectionError && <p className="text-xs text-red-600">{sectionError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Section
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Property modal ── */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Property</h2>
              <button onClick={() => { setPropName(""); setPropAddress(""); setPropSectionId(""); setPropError(""); setShowPropertyModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
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
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.section_name}</option>
                ))}
              </select>
              {propError && <p className="text-xs text-red-600">{propError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Property
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Section detail modal ── */}
      {detailSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailSection(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {sectionEditMode ? (
                  <form onSubmit={saveSection} className="flex items-center gap-2">
                    <input
                      required
                      className="flex-1 rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-lg font-bold text-[#355e3b] outline-none focus:border-[#355e3b]"
                      value={sectionEditName}
                      onChange={(e) => setSectionEditName(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sectionSaving}
                      className="rounded-lg bg-[#355e3b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors"
                    >
                      {sectionSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSectionEditMode(false); setSectionEditError(""); }}
                      className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <h2 className="text-xl font-bold text-[#355e3b]">{detailSection.section_name}</h2>
                )}
                {sectionEditError && <p className="mt-1 text-xs text-red-600">{sectionEditError}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && !sectionEditMode && (
                  <>
                    <button
                      onClick={() => { setSectionEditName(detailSection.section_name); setSectionEditError(""); setSectionEditMode(true); setSectionDeleteConfirm(false); }}
                      className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setSectionDeleteConfirm(true); setSectionDeleteError(""); }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button onClick={() => setDetailSection(null)} className="text-black hover:text-[#355e3b] text-xl leading-none ml-1">&times;</button>
              </div>
            </div>

            {/* Delete confirmation */}
            {sectionDeleteConfirm && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700 font-medium">Delete this section?</p>
                {sectionDeleteError && <p className="mt-1 text-xs text-red-600">{sectionDeleteError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={deleteSection}
                    disabled={sectionDeleting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {sectionDeleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => { setSectionDeleteConfirm(false); setSectionDeleteError(""); }}
                    className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Meta info */}
            <div className="mt-4 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60">Added by</span>
                <span className="font-medium">{detailSection.created_by ?? "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">Added on</span>
                <span className="font-medium">{new Date(detailSection.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Inline properties list */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#355e3b]">
                  Properties in this section
                  <span className="ml-2 rounded-full bg-[#355e3b]/10 px-2 py-0.5 text-xs font-medium text-[#355e3b]">
                    {properties.filter((p) => p.property_section_id === detailSection.id).length}
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    className="w-32 rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-xs outline-none focus:border-[#355e3b]"
                    placeholder="Search"
                    value={sectionPropSearch}
                    onChange={(e) => setSectionPropSearch(e.target.value)}
                  />
                  <button
                    onClick={() => { setSubPropName(""); setSubPropAddress(""); setSubPropError(""); setShowAddPropInSection(true); }}
                    className="rounded-lg bg-[#355e3b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {sectionDetailProperties.length === 0 ? (
                <p className="text-xs text-black/50">No properties found.</p>
              ) : (
                <ul className="space-y-1.5">
                  {sectionDetailProperties.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-[#c9d9cc] bg-[#f9fcfa] px-3 py-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#355e3b" viewBox="0 0 256 256" className="shrink-0">
                        <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.address && <p className="text-xs text-black/50 truncate">{p.address}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add property inside section sub-modal (z-60) ── */}
      {showAddPropInSection && detailSection && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Property</h2>
              <button onClick={() => { setSubPropName(""); setSubPropAddress(""); setSubPropError(""); setShowAddPropInSection(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addPropertyInSection} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Property name"
                value={subPropName}
                onChange={(e) => setSubPropName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Address (optional)"
                value={subPropAddress}
                onChange={(e) => setSubPropAddress(e.target.value)}
              />
              {/* Section locked */}
              <div className="w-full rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-2 text-sm text-black/60">
                Section: <span className="font-medium text-black">{detailSection.section_name}</span>
              </div>
              {subPropError && <p className="text-xs text-red-600">{subPropError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Property
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Property detail modal ── */}
      {detailProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailProperty(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {propEditMode ? (
                  <form onSubmit={saveProperty} className="space-y-2">
                    <input
                      required
                      className="w-full rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-base font-bold text-[#355e3b] outline-none focus:border-[#355e3b]"
                      value={propEditName}
                      onChange={(e) => setPropEditName(e.target.value)}
                      placeholder="Property name"
                    />
                    <input
                      className="w-full rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-sm outline-none focus:border-[#355e3b]"
                      value={propEditAddress}
                      onChange={(e) => setPropEditAddress(e.target.value)}
                      placeholder="Address (optional)"
                    />
                    {propEditError && <p className="text-xs text-red-600">{propEditError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={propSaving}
                        className="rounded-lg bg-[#355e3b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors"
                      >
                        {propSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropEditMode(false); setPropEditError(""); }}
                        className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-[#355e3b]">{detailProperty.name}</h2>
                    {detailProperty.address && <p className="text-sm text-black/60 mt-0.5">{detailProperty.address}</p>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && !propEditMode && (
                  <>
                    <button
                      onClick={() => { setPropEditName(detailProperty.name); setPropEditAddress(detailProperty.address ?? ""); setPropEditError(""); setPropEditMode(true); setPropDeleteConfirm(false); }}
                      className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setPropDeleteConfirm(true); setPropDeleteError(""); }}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button onClick={() => setDetailProperty(null)} className="text-black hover:text-[#355e3b] text-xl leading-none ml-1">&times;</button>
              </div>
            </div>

            {/* Delete confirmation */}
            {propDeleteConfirm && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700 font-medium">Delete this property?</p>
                {propDeleteError && <p className="mt-1 text-xs text-red-600">{propDeleteError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={deleteProperty}
                    disabled={propDeleting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {propDeleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => { setPropDeleteConfirm(false); setPropDeleteError(""); }}
                    className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Meta info */}
            <div className="mt-4 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
              {detailProperty.property_sections?.section_name && (
                <div className="flex justify-between">
                  <span className="text-black/60">Section</span>
                  <span className="font-medium">{detailProperty.property_sections.section_name}</span>
                </div>
              )}
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
      )}

      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
