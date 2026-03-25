"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";
import { Footer } from "@/components/footer";

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
  is_active: boolean;
};

type ProfileData = {
  app_role: string;
  team_role: string | null;
  team_member_id: string | null;
};

export default function SectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [visiblePropertyIds, setVisiblePropertyIds] = useState<Set<string> | null>(null);

  const [section, setSection] = useState<PropertySection | null>(null);
  const [sectionProperties, setSectionProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);

  const [propSearch, setPropSearch] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [showAddProp, setShowAddProp] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propError, setPropError] = useState("");

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

  const fetchSection = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-sections/${sectionId}`, { headers });
    const payload = (await res.json()) as { data?: PropertySection };
    if (payload.data) setSection(payload.data);
  }, [sectionId, getAuthHeader]);

  const fetchProperties = useCallback(async () => {
    const res = await fetch("/api/properties");
    const payload = (await res.json()) as { data?: Property[] };
    const all = payload.data ?? [];
    setAllProperties(all);
    setSectionProperties(
      all
        .filter((p) => p.property_section_id === sectionId)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [sectionId]);

  const fetchUserInfo = useCallback(async () => {
    if (!supabase) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch("/api/profile", {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const payload = (await res.json()) as { data?: ProfileData };
    if (!payload.data) return;
    const { app_role, team_role, team_member_id } = payload.data;
    setUserRole(app_role);
    const canSeeAll =
      app_role === "admin" || team_role?.toLowerCase() === "accounting";
    if (canSeeAll || !team_member_id) return;
    const assignRes = await fetch("/api/property-assignments", {
      headers: { Authorization: authHeader },
    });
    const assignPayload = (await assignRes.json()) as {
      data?: Array<{ team_member_id: string; property_id: string }>;
    };
    setVisiblePropertyIds(
      new Set(
        (assignPayload.data ?? [])
          .filter((a) => a.team_member_id === team_member_id)
          .map((a) => a.property_id)
      )
    );
  }, [supabase, getAuthHeader]);

  useEffect(() => {
    setMounted(true);
    void fetchSection();
    void fetchProperties();
    void fetchUserInfo();
  }, [fetchSection, fetchProperties, fetchUserInfo]);

  const isAdmin = userRole === "admin";

  const visibleProperties =
    visiblePropertyIds === null
      ? sectionProperties
      : sectionProperties.filter((p) => visiblePropertyIds.has(p.id));

  const filteredProperties = visibleProperties.filter(
    (p) =>
      p.name.toLowerCase().includes(propSearch.toLowerCase()) ||
      (p.address ?? "").toLowerCase().includes(propSearch.toLowerCase())
  );

  const saveSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!section) return;
    setEditError("");
    const trimmed = editName.trim();
    const authHeader = await getAuthHeader();
    if (!authHeader) { setEditError("You must be signed in."); return; }
    setSaving(true);
    const res = await fetch(`/api/property-sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: trimmed }),
    });
    const payload = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) { setEditError(payload.error ?? "Failed."); return; }
    setSection((prev) => (prev ? { ...prev, section_name: trimmed } : null));
    setEditMode(false);
    showSuccess("Section updated");
  };

  const deleteSection = async () => {
    if (!section) return;
    setDeleteError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setDeleting(true);
    const res = await fetch(`/api/property-sections/${section.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = (await res.json()) as { error?: string };
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(payload.error ?? "Failed.");
      setDeleteConfirm(false);
      return;
    }
    router.push("/properties");
  };

  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    if (!section) return;
    setPropError("");
    const duplicate = allProperties.some(
      (p) => p.name.toLowerCase() === propName.trim().toLowerCase()
    );
    if (duplicate) { setPropError("A property with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setPropError("You must be signed in."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        name: propName.trim(),
        address: propAddress.trim() || null,
        property_section_id: section.id,
      }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) { setPropError(payload.error ?? "Failed."); return; }
    setPropName("");
    setPropAddress("");
    setShowAddProp(false);
    await fetchProperties();
    showSuccess("Property added");
  };

  if (!mounted || !section) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Properties" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-black/50">
          <Link href="/properties" className="hover:text-[#355e3b] transition-colors">
            Properties
          </Link>
          <span>/</span>
          <span className="font-medium text-[#355e3b]">{section.section_name}</span>
        </nav>

        {/* Section card */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editMode ? (
                <form onSubmit={saveSection} className="flex items-center gap-2">
                  <input
                    required
                    className="flex-1 rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-lg font-bold text-[#355e3b] outline-none focus:border-[#355e3b]"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#355e3b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditMode(false); setEditError(""); }}
                    className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <h2 className="text-xl font-bold text-[#355e3b]">{section.section_name}</h2>
              )}
              {editError && <p className="mt-1 text-xs text-red-600">{editError}</p>}
            </div>
            {isAdmin && !editMode && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditName(section.section_name); setEditError(""); setEditMode(true); setDeleteConfirm(false); }}
                  className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setDeleteConfirm(true); setDeleteError(""); }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Delete confirm */}
          {deleteConfirm && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Delete this section?</p>
              {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={deleteSection}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => { setDeleteConfirm(false); setDeleteError(""); }}
                  className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="mt-4 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60">Added by</span>
              <span className="font-medium">{section.created_by ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Added on</span>
              <span className="font-medium">{new Date(section.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Properties list */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#355e3b]">
                Properties in this section
                <span className="ml-2 rounded-full bg-[#355e3b]/10 px-2 py-0.5 text-xs font-medium text-[#355e3b]">
                  {visibleProperties.length}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <input
                  className="w-32 rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-xs outline-none focus:border-[#355e3b]"
                  placeholder="Search"
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                />
                <button
                  onClick={() => { setPropName(""); setPropAddress(""); setPropError(""); setShowAddProp(true); }}
                  className="rounded-lg bg-[#355e3b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2d5233] transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {filteredProperties.length === 0 ? (
              <p className="text-xs text-black/50">No properties found.</p>
            ) : (
              <ul className="space-y-1.5">
                {filteredProperties.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => router.push(`/properties/${p.id}?from_section=${sectionId}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#c9d9cc] bg-[#f9fcfa] px-3 py-2 hover:bg-[#eaf3ec] transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 256 256"
                      className="shrink-0"
                      fill={p.is_active ? "#22c55e" : "#9ca3af"}
                      style={p.is_active ? { filter: "drop-shadow(0 0 4px #22c55e)" } : undefined}
                    >
                      <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.address && (
                        <p className="truncate text-xs text-black/50">{p.address}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add property inline form */}
            {showAddProp && (
              <form
                onSubmit={addProperty}
                className="mt-4 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-4 space-y-3"
              >
                <h4 className="text-sm font-semibold text-[#355e3b]">Add Property</h4>
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
                <div className="w-full rounded-lg border border-[#c9d9cc] bg-white px-3 py-2 text-sm text-black/60">
                  Section: <span className="font-medium text-black">{section.section_name}</span>
                </div>
                {propError && <p className="text-xs text-red-600">{propError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddProp(false); setPropName(""); setPropAddress(""); setPropError(""); }}
                    className="rounded-lg border border-[#c9d9cc] px-4 py-2 text-sm font-medium text-black hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Back button */}
        <div className="flex justify-end">
          <Link
            href="/properties"
            className="rounded-lg border border-[#c9d9cc] bg-white px-5 py-2 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
          >
            ← Back
          </Link>
        </div>
      </main>
      <Footer />
      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
