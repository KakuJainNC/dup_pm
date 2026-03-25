"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_section_id: string;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  property_sections?: { id: string; section_name: string } | null;
};

type Comment = {
  id: string;
  content: string;
  created_by_email: string;
  created_by_name: string | null;
  created_at: string;
};

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

  const [userRole, setUserRole] = useState<string | null>(null);
  const [canComment, setCanComment] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

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
      if (fromSectionId) {
        setSectionName(payload.data.property_sections?.section_name ?? null);
      }
    }
  }, [propertyId, getAuthHeader, fromSectionId]);

  const fetchComments = useCallback(async () => {
    const authHeader = await getAuthHeader();
    const headers: HeadersInit = authHeader ? { Authorization: authHeader } : {};
    const res = await fetch(`/api/property-comments?property_id=${propertyId}`, { headers });
    const payload = (await res.json()) as { data?: Comment[] };
    setComments(payload.data ?? []);
  }, [propertyId, getAuthHeader]);

  const fetchUserInfo = useCallback(async () => {
    if (!supabase) return;
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const profileRes = await fetch("/api/profile", {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const profilePayload = (await profileRes.json()) as {
      data?: { app_role: string; team_member_id: string | null };
    };
    if (!profilePayload.data) return;
    const { app_role, team_member_id } = profilePayload.data;
    setUserRole(app_role);
    if (app_role === "admin") { setCanComment(true); return; }
    if (!team_member_id) return;
    const assignRes = await fetch("/api/property-assignments", {
      headers: { Authorization: authHeader },
    });
    const assignPayload = (await assignRes.json()) as {
      data?: Array<{ team_member_id: string; property_id: string; role: string }>;
    };
    const isGsm = (assignPayload.data ?? []).some(
      (a) =>
        a.team_member_id === team_member_id &&
        a.property_id === propertyId &&
        a.role === "gsm"
    );
    setCanComment(isGsm);
  }, [supabase, getAuthHeader, propertyId]);

  useEffect(() => {
    setMounted(true);
    void fetchProperty();
    void fetchComments();
    void fetchUserInfo();
  }, [fetchProperty, fetchComments, fetchUserInfo]);

  const isAdmin = userRole === "admin";

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
      body: JSON.stringify({ name: editName.trim(), address: editAddress.trim() || null }),
    });
    const payload = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) { setEditError(payload.error ?? "Failed."); return; }
    setProperty((prev) =>
      prev ? { ...prev, name: editName.trim(), address: editAddress.trim() || null } : null
    );
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
    if (!res.ok) {
      setCommentError(payload.error ?? "Failed to post comment.");
      return;
    }
    setCommentText("");
    await fetchComments();
  };

  if (!mounted || !property) return null;

  const backHref = fromSectionId
    ? `/properties/sections/${fromSectionId}`
    : "/properties";

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Properties" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-black/50">
          <Link href="/properties" className="hover:text-[#355e3b] transition-colors">
            Properties
          </Link>
          {fromSectionId && sectionName && (
            <>
              <span>/</span>
              <Link
                href={`/properties/sections/${fromSectionId}`}
                className="hover:text-[#355e3b] transition-colors"
              >
                {sectionName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-[#355e3b]">{property.name}</span>
        </nav>

        {/* Property card */}
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editMode ? (
                <form onSubmit={saveProperty} className="space-y-2">
                  <input
                    required
                    className="w-full rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-base font-bold text-[#355e3b] outline-none focus:border-[#355e3b]"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Property name"
                  />
                  <input
                    className="w-full rounded-lg border border-[#b8cbbd] px-3 py-1.5 text-sm outline-none focus:border-[#355e3b]"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Address (optional)"
                  />
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex gap-2 pt-1">
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
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[#355e3b]">{property.name}</h2>
                  {property.address && (
                    <p className="mt-0.5 text-sm text-black/60">{property.address}</p>
                  )}
                </>
              )}
            </div>
            {isAdmin && !editMode && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditName(property.name); setEditAddress(property.address ?? ""); setEditError(""); setEditMode(true); setDeleteConfirm(false); }}
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
              <p className="text-sm font-medium text-red-700">Delete this property?</p>
              {deleteError && <p className="mt-1 text-xs text-red-600">{deleteError}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={deleteProperty}
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

          {/* Active toggle — admin only */}
          {isAdmin && !editMode && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-2.5">
              <span className="text-sm font-medium">
                {property.is_active ? "Deactivate property" : "Activate property"}
              </span>
              <button
                onClick={toggleActive}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  property.is_active ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    property.is_active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
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
                      <span className="text-sm font-semibold">
                        {c.created_by_name ?? c.created_by_email}
                      </span>
                      <span className="text-xs text-black/40">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
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
                <input
                  className="flex-1 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={(e) => { setCommentText(e.target.value); setCommentError(""); }}
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentText.trim()}
                  className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] disabled:opacity-50 transition-colors"
                >
                  {commentSubmitting ? "Posting…" : "Post"}
                </button>
              </div>
              {commentError && <p className="text-xs text-red-600">{commentError}</p>}
            </form>
          )}
        </section>

        {/* Back button */}
        <div className="flex justify-end">
          <Link
            href={backHref}
            className="rounded-lg border border-[#c9d9cc] bg-white px-5 py-2 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
          >
            ← Back
          </Link>
        </div>
      </main>
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
