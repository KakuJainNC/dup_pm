"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type Profile = {
  id: string;
  email: string;
  app_role: "admin" | "manager" | "viewer";
};

type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  created_at: string;
  created_by: string | null;
  user_id: string | null;
  profile: Profile | null;
};

function formatRole(role: string): string {
  if (role.toLowerCase() === "gsm") return "GSM";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

const STORAGE_KEY = "pm_member_images";

function getImageMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch { return {}; }
}

function saveImage(email: string, dataUrl: string) {
  const map = getImageMap();
  map[email] = dataUrl;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export default function TeamMembersPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+52");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Done");
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchProfile = useCallback(async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch("/api/profile", { headers: { Authorization: authHeader } });
    const payload = await res.json() as { data?: { app_role: string } };
    setIsAdmin(payload.data?.app_role === "admin");
  }, [getAuthHeader]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const payload = await res.json() as { data?: { name: string }[] };
    const names = (payload.data ?? []).map((r) => r.name).sort((a, b) => a.localeCompare(b));
    setRoles(names);
    setRole((prev) => prev || names[0] || "");
  }, []);

  useEffect(() => {
    setMounted(true);
    setImageMap(getImageMap());
    void fetchMembers();
    void fetchRoles();
    void fetchProfile();
  }, [fetchMembers, fetchRoles, fetchProfile]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName("");
    setImagePreview(null);
    setImageDataUrl(null);
    setEmail("");
    setDialCode("+52");
    setPhone("");
    setRole(roles[0] ?? "");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in to add members."); return; }
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ full_name: name, email, dial_code: dialCode, phone, role }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setError(payload.error ?? "Failed."); return; }
    if (imageDataUrl && email) {
      saveImage(email, imageDataUrl);
      setImageMap(getImageMap());
    }
    resetForm();
    setShowModal(false);
    await fetchMembers();
    setToastMessage("Done");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleLinkToggle = async (member: TeamMember) => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setLinkingId(member.id);
    const action = member.user_id ? "unlink" : "link";
    const res = await fetch(`/api/team-members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ action }),
    });
    const payload = await res.json() as { error?: string };
    setLinkingId(null);
    if (!res.ok) {
      setToastMessage(payload.error ?? "Failed.");
    } else {
      setToastMessage(action === "link" ? "Account linked" : "Account unlinked");
      await fetchMembers();
      if (detailMember?.id === member.id) setDetailMember(null);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const deleteMember = async () => {
    if (!detailMember) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setDeleting(true);
    const res = await fetch(`/api/team-members/${detailMember.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = await res.json() as { error?: string };
    setDeleting(false);
    if (!res.ok) {
      setToastMessage(payload.error ?? "Failed to delete.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    setDetailMember(null);
    setConfirmDelete(false);
    await fetchMembers();
    setToastMessage("Team member deleted");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Team" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#355e3b]">Team Members</h1>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Search team"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-black">No members found.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#c9d9cc]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#c9d9cc] bg-[#f3f8f4]">
                    <th className="w-12 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Full Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">App Access</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const img = m.email ? imageMap[m.email] : null;
                    return (
                      <tr key={m.id} onClick={() => setDetailMember(m)} className={`cursor-pointer border-b border-[#c9d9cc] last:border-0 hover:bg-[#eaf3ec] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}>
                        <td className="px-4 py-3">
                          <img
                            src={img ?? "/default-user.jpg"}
                            alt={m.full_name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{m.full_name}</td>
                        <td className="px-4 py-3 text-black/70">{m.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          {m.role ? (
                            <span className="rounded-full bg-[#355e3b]/10 px-2.5 py-1 text-xs font-medium text-[#355e3b]">
                              {formatRole(m.role)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {m.profile ? (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 capitalize">
                                {m.profile.app_role}
                              </span>
                              <button
                                onClick={() => handleLinkToggle(m)}
                                disabled={linkingId === m.id}
                                className="text-xs text-black/40 hover:text-red-500 transition-colors disabled:opacity-40"
                              >
                                Unlink
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleLinkToggle(m)}
                              disabled={linkingId === m.id || !m.email}
                              className="rounded-md border border-[#b8cbbd] px-2.5 py-1 text-xs font-medium text-[#355e3b] hover:bg-[#355e3b] hover:text-white transition-colors disabled:opacity-40"
                            >
                              {linkingId === m.id ? "Linking…" : "Link Account"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Team Member</h2>
              <button onClick={() => { resetForm(); setShowModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addMember} className="mt-4 space-y-3">

              {/* Image upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-[#b8cbbd] hover:border-[#355e3b] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img
                    src={imagePreview ?? "/default-user.jpg"}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-black">Click to upload photo (optional)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Name */}
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {/* Email */}
              <input
                required
                type="email"
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* Dial code + Phone */}
              <div className="flex gap-2">
                <select
                  className="w-[35%] rounded-lg border border-[#b8cbbd] px-2 py-2 text-sm outline-none focus:border-[#355e3b]"
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                >
                  {DIAL_CODES.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
                <input
                  className="w-[65%] rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Role */}
              <select
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{formatRole(r)}</option>
                ))}
              </select>

              {error && <p className="text-xs text-red-600">{error}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}
      {detailMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setDetailMember(null); setConfirmDelete(false); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Entry Details</h2>
              <button onClick={() => { setDetailMember(null); setConfirmDelete(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={detailMember.email ? (imageMap[detailMember.email] ?? "/default-user.jpg") : "/default-user.jpg"}
                  alt={detailMember.full_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-[#355e3b]">{detailMember.full_name}</p>
                  <p className="text-xs text-black/60">{detailMember.email ?? "No email"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-black/60">App access</span>
                  {detailMember.profile ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">
                      {detailMember.profile.app_role}
                    </span>
                  ) : (
                    <span className="text-xs text-black/40">No account linked</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Added by</span>
                  <span className="font-medium">{detailMember.created_by ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Added on</span>
                  <span className="font-medium">{new Date(detailMember.created_at).toLocaleString()}</span>
                </div>
              </div>
              {isAdmin && (
                confirmDelete ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">Delete this team member?</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={deleteMember} disabled={deleting} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{deleting ? "Deleting…" : "Yes, delete"}</button>
                      <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full rounded-lg border border-red-200 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
