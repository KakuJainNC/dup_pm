"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { DetailBand } from "@/components/detail-band";
import { Toast } from "@/components/toast";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_section_id: string;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  house_phone: string | null;
  main_door_code: string | null;
  garage_code: string | null;
  wifi_password: string | null;
  property_manager_member_id: string | null;
  maintenance_member_id: string | null;
  housekeeping_member_id: string | null;
  property_sections?: { id: string; section_name: string } | null;
};

type Comment = {
  id: string;
  content: string;
  created_by_email: string;
  created_by_name: string | null;
  created_at: string;
};

type TeamMember = { id: string; full_name: string; role: string | null };

type AssignedHomeowner = {
  junction_id: string;
  homeowner_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dial_code: string | null;
};

type Homeowner = { id: string; full_name: string; email: string | null };

function PropertyDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const fromSectionId = searchParams.get("from_section");

  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());

  const [property, setProperty] = useState<Property | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedHomeowners, setAssignedHomeowners] = useState<AssignedHomeowner[]>([]);
  const [allHomeowners, setAllHomeowners] = useState<Homeowner[]>([]);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [canComment, setCanComment] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHousePhone, setEditHousePhone] = useState("");
  const [editMainDoorCode, setEditMainDoorCode] = useState("");
  const [editGarageCode, setEditGarageCode] = useState("");
  const [editWifiPassword, setEditWifiPassword] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editMaintenanceId, setEditMaintenanceId] = useState("");
  const [editHousekeepingId, setEditHousekeepingId] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Homeowner assignment
  const [addHomeownerId, setAddHomeownerId] = useState("");
  const [addHomeownerError, setAddHomeownerError] = useState("");
  const [addingHomeowner, setAddingHomeowner] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

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

  const fetchProperty = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/properties/${propertyId}`, { headers });
    const payload = (await res.json()) as { data?: Property };
    if (payload.data) {
      setProperty(payload.data);
      if (fromSectionId) setSectionName(payload.data.property_sections?.section_name ?? null);
    }
  }, [propertyId, getAuthHeader, fromSectionId]);

  const fetchComments = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-comments?property_id=${propertyId}`, { headers });
    const payload = (await res.json()) as { data?: Comment[] };
    setComments(payload.data ?? []);
  }, [propertyId, getAuthHeader]);

  const fetchTeamMembers = useCallback(async () => {
    const res = await fetch("/api/team-members");
    const payload = (await res.json()) as { data?: TeamMember[] };
    setTeamMembers((payload.data ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, []);

  const fetchAssignedHomeowners = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-homeowners?property_id=${propertyId}`, { headers });
    const payload = (await res.json()) as { data?: AssignedHomeowner[] };
    setAssignedHomeowners(payload.data ?? []);
  }, [propertyId, getAuthHeader]);

  const fetchAllHomeowners = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch("/api/homeowners", { headers });
    const payload = (await res.json()) as { data?: Homeowner[] };
    setAllHomeowners((payload.data ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, [getAuthHeader]);

  const fetchUserInfo = useCallback(async () => {
    if (!supabase) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const profileRes = await fetch("/api/profile", { headers: { Authorization: authHeader }, cache: "no-store" });
    const profilePayload = (await profileRes.json()) as { data?: { app_role: string; team_member_id: string | null } };
    if (!profilePayload.data) return;
    const { app_role, team_member_id } = profilePayload.data;
    setUserRole(app_role);
    if (app_role === "admin") { setCanComment(true); return; }
    if (!team_member_id) return;
    const assignRes = await fetch("/api/property-assignments", { headers: { Authorization: authHeader } });
    const assignPayload = (await assignRes.json()) as { data?: Array<{ team_member_id: string; property_id: string; role: string }> };
    const isGsm = (assignPayload.data ?? []).some(
      (a) => a.team_member_id === team_member_id && a.property_id === propertyId && a.role === "gsm"
    );
    setCanComment(isGsm);
  }, [supabase, getAuthHeader, propertyId]);

  useEffect(() => {
    setMounted(true);
    void fetchProperty();
    void fetchComments();
    void fetchUserInfo();
    void fetchTeamMembers();
    void fetchAssignedHomeowners();
    void fetchAllHomeowners();
  }, [fetchProperty, fetchComments, fetchUserInfo, fetchTeamMembers, fetchAssignedHomeowners, fetchAllHomeowners]);

  const isAdmin = userRole === "admin";

  const memberName = (id: string | null) =>
    id ? (teamMembers.find((m) => m.id === id)?.full_name ?? "—") : null;

  const toggleActive = async () => {
    if (!property) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const newValue = !property.is_active;
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ is_active: newValue }),
    });
    if (!res.ok) return;
    setProperty((prev) => (prev ? { ...prev, is_active: newValue } : null));
    showSuccess(newValue ? "Property activated" : "Property deactivated");
  };

  const startEdit = () => {
    if (!property) return;
    setEditName(property.name);
    setEditAddress(property.address ?? "");
    setEditHousePhone(property.house_phone ?? "");
    setEditMainDoorCode(property.main_door_code ?? "");
    setEditGarageCode(property.garage_code ?? "");
    setEditWifiPassword(property.wifi_password ?? "");
    setEditManagerId(property.property_manager_member_id ?? "");
    setEditMaintenanceId(property.maintenance_member_id ?? "");
    setEditHousekeepingId(property.housekeeping_member_id ?? "");
    setEditError("");
    setEditMode(true);
    setDeleteConfirm(false);
  };

  const saveProperty = async (e: FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setEditError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setEditError("You must be signed in."); return; }
    setSaving(true);
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        name: editName.trim(),
        address: editAddress.trim() || null,
        house_phone: editHousePhone.trim() || null,
        main_door_code: editMainDoorCode.trim() || null,
        garage_code: editGarageCode.trim() || null,
        wifi_password: editWifiPassword.trim() || null,
        property_manager_member_id: editManagerId || null,
        maintenance_member_id: editMaintenanceId || null,
        housekeeping_member_id: editHousekeepingId || null,
      }),
    });
    const payload = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) { setEditError(payload.error ?? "Failed."); return; }
    await fetchProperty();
    setEditMode(false);
    showSuccess("Property updated");
  };

  const deleteProperty = async () => {
    if (!property) return;
    setDeleteError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setDeleting(true);
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const payload = (await res.json()) as { error?: string };
    setDeleting(false);
    if (!res.ok) { setDeleteError(payload.error ?? "Failed."); setDeleteConfirm(false); return; }
    router.push(fromSectionId ? `/properties/sections/${fromSectionId}` : "/properties");
  };

  const addHomeowner = async (e: FormEvent) => {
    e.preventDefault();
    if (!addHomeownerId) return;
    setAddHomeownerError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setAddingHomeowner(true);
    const res = await fetch("/api/property-homeowners", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ property_id: propertyId, homeowner_id: addHomeownerId }),
    });
    const payload = (await res.json()) as { error?: string };
    setAddingHomeowner(false);
    if (!res.ok) { setAddHomeownerError(payload.error ?? "Failed."); return; }
    setAddHomeownerId("");
    await fetchAssignedHomeowners();
    showSuccess("Homeowner assigned");
  };

  const removeHomeowner = async (junctionId: string) => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/property-homeowners?id=${junctionId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return;
    await fetchAssignedHomeowners();
    showSuccess("Homeowner removed");
  };

  const deleteComment = async (commentId: string) => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch(`/api/property-comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return;
    await fetchComments();
    showSuccess("Comment deleted");
  };

  const postComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setCommentError("");
    setCommentSubmitting(true);
    const res = await fetch("/api/property-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ property_id: propertyId, content: commentText.trim() }),
    });
    const payload = (await res.json()) as { error?: string };
    setCommentSubmitting(false);
    if (!res.ok) { setCommentError(payload.error ?? "Failed to post comment."); return; }
    setCommentText("");
    await fetchComments();
    showSuccess("Commented");
  };

  if (!mounted || !property) return null;

  const backHref = fromSectionId ? `/properties/sections/${fromSectionId}` : "/properties";

  const managers = teamMembers.filter((m) => m.role === "property_manager");
  const maintenance = teamMembers.filter((m) => m.role === "maintenance");
  const housekeeping = teamMembers.filter((m) => m.role === "housekeeping");
  const unassignedHomeowners = allHomeowners.filter(
    (h) => !assignedHomeowners.some((a) => a.homeowner_id === h.id)
  );

  const infoRow = (label: string, value: string | null) => (
    <div className="flex justify-between">
      <span className="text-black/60">{label}</span>
      <span className={`font-medium ${value ? "" : "text-black/30 italic"}`}>{value ?? "Not set"}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <DetailBand items={[
        { label: "Properties", href: "/properties" },
        ...(fromSectionId && sectionName ? [{ label: sectionName, href: `/properties/sections/${fromSectionId}` }] : []),
        { label: property.name },
      ]} />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">

        {/* Title card */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 shrink-0 rounded-xl flex items-center justify-center ${property.is_active ? "bg-green-100" : "bg-gray-100"}`}>
              <span className={`h-5 w-5 rounded-sm ${property.is_active ? "bg-green-500" : "bg-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-black/40 uppercase tracking-wide">{sectionName ?? "Property"}</p>
              <h2 className="text-xl font-bold text-[#355e3b] mt-0.5">{property.name}</h2>
              {property.address && <p className="mt-0.5 text-sm text-black/60">{property.address}</p>}
              {isAdmin && (
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={startEdit} className="rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-xs font-medium text-[#355e3b] hover:bg-[#355e3b] hover:text-white transition-colors">Edit</button>
                  <button onClick={() => { setDeleteConfirm(true); setDeleteError(""); }} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-600 hover:text-white transition-colors">Delete</button>
                </div>
              )}
            </div>
          </div>
          {deleteConfirm && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Delete this property?</p>
              {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={deleteProperty} disabled={deleting} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{deleting ? "Deleting…" : "Yes, delete"}</button>
                <button onClick={() => { setDeleteConfirm(false); setDeleteError(""); }} className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </section>

        {/* Details card */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm space-y-3">
          <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Status</span>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-sm ${property.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="font-medium">{property.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            {property.property_sections?.section_name && (
              <div className="flex justify-between">
                <span className="text-black/60">Section</span>
                <span className="font-medium">{property.property_sections.section_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/60">Added by</span>
              <span className="font-medium">{property.created_by ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Added on</span>
              <span className="font-medium">{new Date(property.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40 mb-1">Staff</p>
            {infoRow("Property Manager", memberName(property.property_manager_member_id))}
            {infoRow("Maintenance", memberName(property.maintenance_member_id))}
            {infoRow("Housekeeping", memberName(property.housekeeping_member_id))}
          </div>

          <div className="rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] p-3 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40 mb-1">General Info</p>
            {infoRow("House Phone", property.house_phone)}
            {infoRow("Main Door Code", property.main_door_code)}
            {infoRow("Garage Code", property.garage_code)}
            {infoRow("Wi-Fi Password", property.wifi_password)}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-2.5">
              <span className="text-sm font-medium">{property.is_active ? "Deactivate property" : "Activate property"}</span>
              <button
                onClick={toggleActive}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${property.is_active ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${property.is_active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}
        </section>

        {/* Homeowners */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[#355e3b]">Homeowners</h3>
          {assignedHomeowners.length === 0 ? (
            <p className="text-sm text-black/50">No homeowners assigned.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {assignedHomeowners.map((h) => (
                <li key={h.junction_id} className="flex items-center justify-between rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{h.full_name}</p>
                    {h.email && <p className="text-xs text-black/50">{h.email}</p>}
                    {h.phone && <p className="text-xs text-black/50">{h.dial_code} {h.phone}</p>}
                  </div>
                  {isAdmin && (
                    <button onClick={() => removeHomeowner(h.junction_id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isAdmin && (
            <form onSubmit={addHomeowner} className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                value={addHomeownerId}
                onChange={(e) => { setAddHomeownerId(e.target.value); setAddHomeownerError(""); }}
              >
                <option value="">Assign a homeowner…</option>
                {unassignedHomeowners.map((h) => <option key={h.id} value={h.id}>{h.full_name}{h.email ? ` (${h.email})` : ""}</option>)}
              </select>
              <button type="submit" disabled={!addHomeownerId || addingHomeowner} className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors">
                {addingHomeowner ? "Assigning…" : "Assign"}
              </button>
            </form>
          )}
          {addHomeownerError && <p className="mt-1 text-xs text-red-600">{addHomeownerError}</p>}
        </section>

        {/* Comments */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[#355e3b]">Comments</h3>
          {comments.length === 0 ? (
            <p className="text-sm text-black/50">No comments yet.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#355e3b] text-sm font-bold text-white">
                    {(c.created_by_name ?? c.created_by_email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold">{c.created_by_name ?? c.created_by_email}</span>
                      <span className="text-xs text-black/40">{new Date(c.created_at).toLocaleString()}</span>
                      {isAdmin && (
                        confirmDeleteCommentId === c.id ? (
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-xs font-medium text-red-700">Are you sure?</span>
                            <button onClick={() => { void deleteComment(c.id); setConfirmDeleteCommentId(null); }} className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">Delete</button>
                            <button onClick={() => setConfirmDeleteCommentId(null)} className="rounded border border-[#c9d9cc] px-2 py-0.5 text-xs font-medium text-black hover:bg-[#f3f8f4] transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteCommentId(c.id)} className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        )
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-black/80">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canComment && (
            <form onSubmit={postComment} className="mt-5 space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Write a comment…" value={commentText} onChange={(e) => { setCommentText(e.target.value); setCommentError(""); }} />
                <button type="submit" disabled={commentSubmitting || !commentText.trim()} className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors">{commentSubmitting ? "Posting…" : "Post"}</button>
              </div>
              {commentError && <p className="text-xs text-red-600">{commentError}</p>}
            </form>
          )}
        </section>

        {/* Back button */}
        <div className="flex justify-end">
          <Link href={backHref} className="rounded-lg border border-[#c9d9cc] bg-white px-5 py-2 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors">← Back</Link>
        </div>
      </main>

      {/* Edit property modal */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#355e3b]">Edit Property</h2>
              <button onClick={() => { setEditMode(false); setEditError(""); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={saveProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Property Name</label>
                <input required className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter property name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Address</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter address (optional)" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/40 pt-1">Staff</p>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Property Manager</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={editManagerId} onChange={(e) => setEditManagerId(e.target.value)}>
                  <option value="">Choose a property manager</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Maintenance</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={editMaintenanceId} onChange={(e) => setEditMaintenanceId(e.target.value)}>
                  <option value="">Choose a maintenance member</option>
                  {maintenance.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Housekeeping</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={editHousekeepingId} onChange={(e) => setEditHousekeepingId(e.target.value)}>
                  <option value="">Choose a housekeeping member</option>
                  {housekeeping.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/40 pt-1">General Info</p>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">House Phone</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter house phone number" value={editHousePhone} onChange={(e) => setEditHousePhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Main Door Code</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter main door access code" value={editMainDoorCode} onChange={(e) => setEditMainDoorCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Garage Code</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter garage access code" value={editGarageCode} onChange={(e) => setEditGarageCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Wi-Fi Password</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter Wi-Fi password" value={editWifiPassword} onChange={(e) => setEditWifiPassword(e.target.value)} />
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors">{saving ? "Saving…" : "Save Changes"}</button>
            </form>
          </div>
        </div>
      )}

      <BackButton href={backHref} />
      <Footer />
      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={null}>
      <PropertyDetailContent />
    </Suspense>
  );
}
