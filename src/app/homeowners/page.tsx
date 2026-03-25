"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

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

export default function HomeownersPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [profile, setProfile] = useState<Profile | null>(null);

  const [homeowners, setHomeowners] = useState<Homeowner[]>([]);
  const [search, setSearch] = useState("");

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
  const [addError, setAddError] = useState("");

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDialCode, setEditDialCode] = useState("+1");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Toast
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

  const fetchHomeowners = useCallback(async () => {
    const res = await fetch("/api/homeowners");
    const payload = await res.json() as { data?: Homeowner[] };
    setHomeowners(payload.data ?? []);
  }, []);

  const fetchProfile = useCallback(async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch("/api/profile", { headers: { Authorization: authHeader } });
    const payload = await res.json() as { data?: Profile };
    setProfile(payload.data ?? null);
  }, [getAuthHeader]);

  const fetchAssignedProperties = useCallback(async (homeownerId: string) => {
    setLoadingProperties(true);
    const res = await fetch(`/api/property-homeowners?homeowner_id=${homeownerId}`);
    const payload = await res.json() as { data?: AssignedProperty[] };
    setAssignedProperties(payload.data ?? []);
    setLoadingProperties(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchHomeowners();
    void fetchProfile();
  }, [fetchHomeowners, fetchProfile]);

  const resetAddForm = () => {
    setAddName("");
    setAddEmail("");
    setAddDialCode("+1");
    setAddPhone("");
    setAddNotes("");
    setAddError("");
  };

  const resetEditForm = () => {
    setEditName("");
    setEditEmail("");
    setEditDialCode("+1");
    setEditPhone("");
    setEditNotes("");
    setEditError("");
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAddError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setAddError("You must be signed in."); return; }
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
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setAddError(payload.error ?? "Failed."); return; }
    resetAddForm();
    setShowAddModal(false);
    await fetchHomeowners();
    showSuccess("Homeowner added");
  };

  const openEditModal = (hw: Homeowner) => {
    setEditName(hw.full_name);
    setEditEmail(hw.email ?? "");
    setEditDialCode(hw.dial_code ?? "+1");
    setEditPhone(hw.phone ?? "");
    setEditNotes(hw.notes ?? "");
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHomeowner) return;
    setEditError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setEditError("You must be signed in."); return; }
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
    resetEditForm();
    setShowEditModal(false);
    // Update selectedHomeowner in place with form values
    setSelectedHomeowner((prev) =>
      prev ? { ...prev, full_name: editName, email: editEmail || null, dial_code: editDialCode, phone: editPhone || null, notes: editNotes || null } : prev
    );
    await fetchHomeowners();
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

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Homeowners" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10">

        {/* Detail view */}
        {selectedHomeowner ? (
          <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => { setSelectedHomeowner(null); setAssignedProperties([]); }}
                className="flex items-center gap-1 text-sm text-[#355e3b] hover:underline"
              >
                <span>&#8592;</span> Back to Homeowners
              </button>
              {isAdmin && (
                <div className="flex gap-2">
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

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Info card */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#355e3b]">{selectedHomeowner.full_name}</h2>
                  {selectedHomeowner.email && (
                    <p className="text-sm text-black/60">{selectedHomeowner.email}</p>
                  )}
                </div>

                <div className="rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-4 space-y-2 text-sm">
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
              </div>

              {/* Assigned properties */}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#355e3b] mb-3">Assigned Properties</h3>
                {loadingProperties ? (
                  <p className="text-sm text-black/50">Loading…</p>
                ) : assignedProperties.length === 0 ? (
                  <p className="text-sm text-black/50">No properties assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {assignedProperties.map((ap) => (
                      <div
                        key={ap.id}
                        className="rounded-lg border border-[#c9d9cc] bg-white px-4 py-3"
                      >
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
              </div>
            </div>
          </section>
        ) : (
          /* List view */
          <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#355e3b]">Homeowners</h1>
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
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHomeowners.map((hw, i) => (
                      <tr
                        key={hw.id}
                        onClick={() => handleSelectHomeowner(hw)}
                        className={`cursor-pointer border-b border-[#c9d9cc] last:border-0 hover:bg-[#eaf3ec] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}
                      >
                        <td className="px-4 py-3 font-medium">{hw.full_name}</td>
                        <td className="px-4 py-3 text-black/70">{hw.email ?? "—"}</td>
                        <td className="px-4 py-3 text-black/70">
                          {hw.phone ? `${hw.dial_code ?? ""} ${hw.phone}`.trim() : "—"}
                        </td>
                      </tr>
                    ))}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Homeowner</h2>
              <button onClick={() => { resetAddForm(); setShowAddModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Full name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
              <input
                type="email"
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Email (optional)"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="w-[35%] rounded-lg border border-[#b8cbbd] px-2 py-2 text-sm outline-none focus:border-[#355e3b]"
                  value={addDialCode}
                  onChange={(e) => setAddDialCode(e.target.value)}
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <input
                  className="w-[65%] rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                  placeholder="Phone (optional)"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b] resize-none"
                placeholder="Notes (optional)"
                rows={3}
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
              />
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Homeowner
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit homeowner modal */}
      {showEditModal && selectedHomeowner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Edit Homeowner</h2>
              <button onClick={() => { resetEditForm(); setShowEditModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Full name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                type="email"
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Email (optional)"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="w-[35%] rounded-lg border border-[#b8cbbd] px-2 py-2 text-sm outline-none focus:border-[#355e3b]"
                  value={editDialCode}
                  onChange={(e) => setEditDialCode(e.target.value)}
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <input
                  className="w-[65%] rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                  placeholder="Phone (optional)"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b] resize-none"
                placeholder="Notes (optional)"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
