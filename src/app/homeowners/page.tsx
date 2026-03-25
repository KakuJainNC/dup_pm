"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { DetailBand } from "@/components/detail-band";
import { Toast } from "@/components/toast";
import { Footer } from "@/components/footer";

type Profile = {
  app_role: "admin" | "manager" | "viewer";
};

type Homeowner = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dial_code: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

type AssignedProperty = {
  id: string; // junction id
  property_id: string;
  name: string | null;
  address: string | null;
  is_active: boolean | null;
  section_name: string | null;
};

type PropertyOption = {
  id: string;
  name: string;
  is_active: boolean | null;
};

const DIAL_CODES = [
  { code: "+52",  label: "🇲🇽 +52 | MEX" },
  { code: "+1",   label: "🇺🇸 +1 | USA" },
  { code: "+44",  label: "🇬🇧 +44 | GBR" },
  { code: "+91",  label: "🇮🇳 +91 | IND" },
  { code: "+61",  label: "🇦🇺 +61 | AUS" },
  { code: "+49",  label: "🇩🇪 +49 | DEU" },
  { code: "+33",  label: "🇫🇷 +33 | FRA" },
  { code: "+971", label: "🇦🇪 +971 | ARE" },
  { code: "+65",  label: "🇸🇬 +65 | SGP" },
  { code: "+81",  label: "🇯🇵 +81 | JPN" },
  { code: "+86",  label: "🇨🇳 +86 | CHN" },
];

const STORAGE_KEY_HO = "pm_homeowner_images";

function getHOImageMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_HO) ?? "{}"); } catch { return {}; }
}

function saveHOImage(email: string, dataUrl: string) {
  const map = getHOImageMap();
  map[email] = dataUrl;
  localStorage.setItem(STORAGE_KEY_HO, JSON.stringify(map));
}

const TAG_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
];

function tagColor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export default function HomeownersPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [profile, setProfile] = useState<Profile | null>(null);

  const [homeowners, setHomeowners] = useState<Homeowner[]>([]);
  const [search, setSearch] = useState("");

  // All properties (for assignment dropdowns)
  const [allProperties, setAllProperties] = useState<PropertyOption[]>([]);

  // Detail view
  const [selectedHomeowner, setSelectedHomeowner] = useState<Homeowner | null>(null);
  const [assignedProperties, setAssignedProperties] = useState<AssignedProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDialCode, setAddDialCode] = useState("+1");
  const [addPhone, setAddPhone] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addSelectedPropertyIds, setAddSelectedPropertyIds] = useState<string[]>([]);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDialCode, setEditDialCode] = useState("+1");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSelectedPropertyIds, setEditSelectedPropertyIds] = useState<string[]>([]);
  const [editError, setEditError] = useState("");

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Done");

  // Images
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [addImageDataUrl, setAddImageDataUrl] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageDataUrl, setEditImageDataUrl] = useState<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Properties map for list view
  const [homeownerPropertiesMap, setHomeownerPropertiesMap] = useState<Record<string, { id: string; name: string }[]>>({});

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

  const fetchHomeowners = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch("/api/homeowners", { headers });
    const payload = await res.json() as { data?: Homeowner[] };
    setHomeowners(payload.data ?? []);
  }, [getAuthHeader]);

  const fetchProfile = useCallback(async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch("/api/profile", { headers: { Authorization: authHeader } });
    const payload = await res.json() as { data?: Profile };
    setProfile(payload.data ?? null);
  }, [getAuthHeader]);

  const fetchAllProperties = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch("/api/properties", { headers });
    const payload = await res.json() as { data?: PropertyOption[] };
    const sorted = (payload.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    setAllProperties(sorted);
  }, [getAuthHeader]);

  const fetchAssignedProperties = useCallback(async (homeownerId: string) => {
    setLoadingProperties(true);
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-homeowners?homeowner_id=${homeownerId}`, { headers });
    const payload = await res.json() as { data?: AssignedProperty[] };
    setAssignedProperties(payload.data ?? []);
    setLoadingProperties(false);
  }, [getAuthHeader]);

  const fetchAllAssignments = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch("/api/property-homeowners?all=true", { headers });
    const payload = await res.json() as { data?: { id: string; homeowner_id: string; property_id: string; name: string | null }[] };
    const map: Record<string, { id: string; name: string }[]> = {};
    for (const a of (payload.data ?? [])) {
      if (!map[a.homeowner_id]) map[a.homeowner_id] = [];
      map[a.homeowner_id].push({ id: a.property_id, name: a.name ?? "" });
    }
    setHomeownerPropertiesMap(map);
  }, [getAuthHeader]);

  useEffect(() => {
    setMounted(true);
    setImageMap(getHOImageMap());
    void fetchHomeowners();
    void fetchProfile();
    void fetchAllProperties();
    void fetchAllAssignments();
  }, [fetchHomeowners, fetchProfile, fetchAllProperties, fetchAllAssignments]);

  const resetAddForm = () => {
    setAddName("");
    setAddEmail("");
    setAddDialCode("+1");
    setAddPhone("");
    setAddNotes("");
    setAddSelectedPropertyIds([]);
    setAddError("");
    setAddImagePreview(null);
    setAddImageDataUrl(null);
    if (addFileInputRef.current) addFileInputRef.current.value = "";
  };

  const resetEditForm = () => {
    setEditName("");
    setEditEmail("");
    setEditDialCode("+1");
    setEditPhone("");
    setEditNotes("");
    setEditSelectedPropertyIds([]);
    setEditError("");
    setEditImagePreview(null);
    setEditImageDataUrl(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const toggleAddProperty = (id: string) => {
    setAddSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleEditProperty = (id: string) => {
    setEditSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAddImagePreview(result);
      setAddImageDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setEditImagePreview(result);
      setEditImageDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAddError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setAddError("You must be signed in."); return; }

    // 1. Create homeowner
    const res = await fetch("/api/homeowners", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        full_name: addName,
        email: addEmail || null,
        dial_code: addDialCode,
        phone: addPhone || null,
        notes: addNotes || null,
      }),
    });
    const payload = await res.json() as { error?: string; data?: { id: string } };
    if (!res.ok) { setAddError(payload.error ?? "Failed."); return; }

    // 2. We need the new homeowner's id — re-fetch to find it by name+timestamp
    const listRes = await fetch("/api/homeowners", { headers: { Authorization: authHeader } });
    const listPayload = await listRes.json() as { data?: Homeowner[] };
    const newHomeowner = (listPayload.data ?? []).find((h) => h.full_name === addName.trim());

    // 3. Assign selected properties
    if (newHomeowner && addSelectedPropertyIds.length > 0) {
      await Promise.all(
        addSelectedPropertyIds.map((propId) =>
          fetch("/api/property-homeowners", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ property_id: propId, homeowner_id: newHomeowner.id }),
          })
        )
      );
    }

    // 4. Save image
    if (addImageDataUrl && addEmail && newHomeowner) {
      saveHOImage(addEmail, addImageDataUrl);
      setImageMap(getHOImageMap());
    }

    resetAddForm();
    setShowAddModal(false);
    await fetchHomeowners();
    await fetchAllAssignments();
    showSuccess("Homeowner added");
  };

  const openEditModal = async (hw: Homeowner) => {
    setEditName(hw.full_name);
    setEditEmail(hw.email ?? "");
    setEditDialCode(hw.dial_code ?? "+1");
    setEditPhone(hw.phone ?? "");
    setEditNotes(hw.notes ?? "");
    setEditError("");
    const img = hw.email ? (getHOImageMap()[hw.email] ?? null) : null;
    setEditImagePreview(img);
    setEditImageDataUrl(img);
    // Pre-populate selected properties from current assignments
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-homeowners?homeowner_id=${hw.id}`, { headers });
    const payload = await res.json() as { data?: AssignedProperty[] };
    setEditSelectedPropertyIds((payload.data ?? []).map((ap) => ap.property_id));
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHomeowner) return;
    setEditError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setEditError("You must be signed in."); return; }

    // 1. Save homeowner data
    const res = await fetch(`/api/homeowners/${selectedHomeowner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        full_name: editName,
        email: editEmail || null,
        dial_code: editDialCode,
        phone: editPhone || null,
        notes: editNotes || null,
      }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setEditError(payload.error ?? "Failed."); return; }

    // 2. Save image
    if (editImageDataUrl && editEmail) {
      saveHOImage(editEmail, editImageDataUrl);
      setImageMap(getHOImageMap());
    }

    // 3. Diff property assignments
    const currentAssigned = assignedProperties.map((ap) => ({ junctionId: ap.id, propertyId: ap.property_id }));
    const currentIds = currentAssigned.map((a) => a.propertyId);
    const toAdd = editSelectedPropertyIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentAssigned.filter((a) => !editSelectedPropertyIds.includes(a.propertyId));

    await Promise.all([
      ...toAdd.map((propId) =>
        fetch("/api/property-homeowners", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ property_id: propId, homeowner_id: selectedHomeowner.id }),
        })
      ),
      ...toRemove.map((a) =>
        fetch(`/api/property-homeowners?id=${a.junctionId}`, {
          method: "DELETE",
          headers: { Authorization: authHeader },
        })
      ),
    ]);

    resetEditForm();
    setShowEditModal(false);
    setSelectedHomeowner((prev) =>
      prev ? { ...prev, full_name: editName, email: editEmail || null, dial_code: editDialCode, phone: editPhone || null, notes: editNotes || null } : prev
    );
    await fetchAssignedProperties(selectedHomeowner.id);
    await fetchHomeowners();
    await fetchAllAssignments();
    showSuccess("Homeowner updated");
  };

  const handleDelete = async () => {
    if (!selectedHomeowner) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/homeowners/${selectedHomeowner.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) {
      showSuccess(payload.error ?? "Failed to delete.");
      return;
    }
    setSelectedHomeowner(null);
    setAssignedProperties([]);
    await fetchHomeowners();
    await fetchAllAssignments();
    showSuccess("Homeowner deleted");
  };

  const handleSelectHomeowner = async (hw: Homeowner) => {
    setSelectedHomeowner(hw);
    await fetchAssignedProperties(hw.id);
  };

  const isAdmin = profile?.app_role === "admin";

  const filteredHomeowners = homeowners.filter((hw) =>
    hw.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (hw.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (hw.phone ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  const PropertyCheckboxList = ({
    selectedIds,
    onToggle,
  }: {
    selectedIds: string[];
    onToggle: (id: string) => void;
  }) => (
    <div>
      <p className="text-xs font-medium text-black/60 mb-2">Assign to Properties (optional)</p>
      {allProperties.length === 0 ? (
        <p className="text-xs text-black/40 italic">No properties available.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-[#b8cbbd] divide-y divide-[#e8f0ea]">
          {allProperties.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#eaf3ec] transition-colors"
            >
              <input
                type="checkbox"
                className="accent-[#355e3b]"
                checked={selectedIds.includes(p.id)}
                onChange={() => onToggle(p.id)}
              />
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.is_active ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="text-sm">{p.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      {selectedHomeowner ? (
        <DetailBand items={[
          { label: "Homeowners", onClick: () => { setSelectedHomeowner(null); setAssignedProperties([]); } },
          { label: selectedHomeowner.full_name },
        ]} />
      ) : (
        <PageBand title="Homeowners" />
      )}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10">

        {/* Detail view */}
        {selectedHomeowner ? (
          <>

            {/* Title card */}
            <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <img
                  src={selectedHomeowner.email ? (imageMap[selectedHomeowner.email] ?? "/default-user.jpg") : "/default-user.jpg"}
                  alt={selectedHomeowner.full_name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-black/40 uppercase tracking-wide">Homeowner</p>
                  <h2 className="text-xl font-bold text-[#355e3b] mt-0.5">{selectedHomeowner.full_name}</h2>
                  {selectedHomeowner.email && (
                    <p className="mt-0.5 text-sm text-black/60">{selectedHomeowner.email}</p>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => openEditModal(selectedHomeowner)}
                        className="rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-xs font-medium text-[#355e3b] hover:bg-[#355e3b] hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Info card */}
            <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/60">Phone</span>
                  <span className="font-medium">
                    {selectedHomeowner.phone
                      ? `${selectedHomeowner.dial_code ?? ""} ${selectedHomeowner.phone}`.trim()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Email</span>
                  <span className="font-medium">{selectedHomeowner.email ?? "—"}</span>
                </div>
                {selectedHomeowner.notes && (
                  <div className="pt-1 border-t border-[#c9d9cc]">
                    <p className="text-black/60 text-xs mb-1">Notes</p>
                    <p className="text-sm">{selectedHomeowner.notes}</p>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-[#c9d9cc]">
                  <span className="text-black/60">Added by</span>
                  <span className="font-medium">{selectedHomeowner.created_by ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Added on</span>
                  <span className="font-medium">{new Date(selectedHomeowner.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </section>

            {/* Assigned properties card */}
            <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#355e3b] mb-4">
                Assigned Properties{!loadingProperties && ` (${assignedProperties.length})`}
              </h3>
              {loadingProperties ? (
                <p className="text-sm text-black/50">Loading…</p>
              ) : assignedProperties.length === 0 ? (
                <p className="text-sm text-black/50">No properties assigned.</p>
              ) : (
                <div className="space-y-2">
                  {assignedProperties.map((ap) => (
                    <div key={ap.id} className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${ap.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        <p className="text-sm font-medium">{ap.name}</p>
                      </div>
                      <p className="text-xs text-black/50 mt-0.5">
                        {[ap.section_name, ap.address].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* List view */
          <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#355e3b]">
                Homeowners ({homeowners.length})
              </h1>
              <div className="flex items-center gap-2">
                <input
                  className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  onClick={() => { resetAddForm(); setShowAddModal(true); }}
                  className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {filteredHomeowners.length === 0 ? (
              <p className="mt-6 text-sm text-black/50">
                {homeowners.length === 0 ? "No homeowners yet." : "No homeowners found."}
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#c9d9cc]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#c9d9cc] bg-[#f3f8f4]">
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Properties</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHomeowners.map((hw, i) => {
                      const img = hw.email ? (imageMap[hw.email] ?? "/default-user.jpg") : "/default-user.jpg";
                      const props = homeownerPropertiesMap[hw.id] ?? [];
                      return (
                        <tr
                          key={hw.id}
                          onClick={() => handleSelectHomeowner(hw)}
                          className={`cursor-pointer border-b border-[#c9d9cc] last:border-0 hover:bg-[#eaf3ec] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}
                        >
                          <td className="px-4 py-3">
                            <img src={img} alt={hw.full_name} className="h-8 w-8 rounded-full object-cover" />
                          </td>
                          <td className="px-4 py-3 font-medium">{hw.full_name}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {props.length === 0 ? (
                                <span className="text-xs text-black/40">—</span>
                              ) : (
                                props.map((p) => (
                                  <span key={p.id} className={`rounded-full px-2 py-0.5 text-xs font-medium ${tagColor(p.id)}`}>
                                    {p.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-black/70">{hw.email ?? "—"}</td>
                          <td className="px-4 py-3 text-black/70">
                            {hw.phone ? `${hw.dial_code ?? ""} ${hw.phone}`.trim() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Add homeowner modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Homeowner</h2>
              <button onClick={() => { resetAddForm(); setShowAddModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              {/* Image upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-[#b8cbbd] hover:border-[#355e3b] transition-colors"
                  onClick={() => addFileInputRef.current?.click()}
                >
                  <img src={addImagePreview ?? "/default-user.jpg"} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <p className="text-xs text-black/60">Click to upload photo (optional)</p>
                <input ref={addFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddImageChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Full Name</label>
                <input required className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter full name" value={addName} onChange={(e) => setAddName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter email address (optional)" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Phone</label>
                <div className="flex gap-2">
                  <select className="w-[35%] rounded-lg border border-[#b8cbbd] px-2 py-2 text-sm outline-none focus:border-[#355e3b]" value={addDialCode} onChange={(e) => setAddDialCode(e.target.value)}>
                    {DIAL_CODES.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                  </select>
                  <input className="w-[65%] rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter phone number (optional)" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Notes</label>
                <textarea className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b] resize-none" placeholder="Write any notes (optional)" rows={2} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
              </div>
              <PropertyCheckboxList selectedIds={addSelectedPropertyIds} onToggle={toggleAddProperty} />
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">Add Homeowner</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit homeowner modal */}
      {showEditModal && selectedHomeowner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Edit Homeowner</h2>
              <button onClick={() => { resetEditForm(); setShowEditModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Image upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-[#b8cbbd] hover:border-[#355e3b] transition-colors"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <img src={editImagePreview ?? "/default-user.jpg"} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <p className="text-xs text-black/60">Click to upload photo (optional)</p>
                <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Full Name</label>
                <input required className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter email address (optional)" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Phone</label>
                <div className="flex gap-2">
                  <select className="w-[35%] rounded-lg border border-[#b8cbbd] px-2 py-2 text-sm outline-none focus:border-[#355e3b]" value={editDialCode} onChange={(e) => setEditDialCode(e.target.value)}>
                    {DIAL_CODES.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                  </select>
                  <input className="w-[65%] rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter phone number (optional)" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Notes</label>
                <textarea className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b] resize-none" placeholder="Write any notes (optional)" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
              <PropertyCheckboxList selectedIds={editSelectedPropertyIds} onToggle={toggleEditProperty} />
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      <Footer />
      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
