"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

const STORAGE_KEY = "pm_member_images";

function getImageMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function saveImage(email: string, dataUrl: string) {
  const map = getImageMap();
  map[email] = dataUrl;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  app_role: "admin" | "manager" | "viewer";
  team_role: string | null;
  phone: string | null;
  dial_code: string | null;
};

const APP_ROLE_COLORS: Record<string, string> = {
  admin:   "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  viewer:  "bg-gray-100 text-gray-600",
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageDataUrl, setEditImageDataUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchProfile = useCallback(async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const res = await fetch("/api/profile", {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const payload = await res.json() as { data?: ProfileData };
    if (payload.data) {
      setProfile(payload.data);
      const map = getImageMap();
      setProfileImage(map[payload.data.email] ?? null);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    setMounted(true);
    void fetchProfile();
  }, [fetchProfile]);

  const startEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditImagePreview(profileImage);
    setEditImageDataUrl(null);
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in."); return; }
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ full_name: editName }),
    });
    const payload = await res.json() as { error?: string };
    setSaving(false);

    if (!res.ok) { setError(payload.error ?? "Failed."); return; }

    // Save image to localStorage if changed
    if (editImageDataUrl && profile?.email) {
      saveImage(profile.email, editImageDataUrl);
      setProfileImage(editImageDataUrl);
    }

    setEditing(false);
    await fetchProfile();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (!mounted || !profile) return null;

  const displayImage = editing ? editImagePreview : profileImage;
  const displayName = profile.full_name || profile.email;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Profile" />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-8 shadow-sm">

          <form onSubmit={saveProfile}>
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className={`relative h-24 w-24 rounded-full overflow-hidden border-4 border-[#c9d9cc] ${editing ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                onClick={() => editing && fileInputRef.current?.click()}
              >
                {displayImage ? (
                  <img src={displayImage} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#355e3b] text-3xl font-bold text-white">
                    {(profile.full_name ?? profile.email)[0].toUpperCase()}
                  </div>
                )}
                {editing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="text-xs font-medium text-white">Change</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Name */}
            <div className="mt-5 text-center">
              {editing ? (
                <input
                  required
                  className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-center text-lg font-semibold outline-none focus:border-[#355e3b]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-xl font-bold text-[#355e3b]">{displayName}</h2>
              )}
              <p className="mt-1 text-sm text-black/50">{profile.email}</p>
            </div>

            {/* Details */}
            <div className="mt-6 divide-y divide-[#e8f0ea] rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-black/60">App Role</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${APP_ROLE_COLORS[profile.app_role] ?? "bg-gray-100 text-gray-600"}`}>
                  {profile.app_role}
                </span>
              </div>

              {profile.team_role && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-black/60">Team Role</span>
                  <span className="rounded-full bg-[#355e3b]/10 px-2.5 py-1 text-xs font-semibold capitalize text-[#355e3b]">
                    {profile.team_role.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-black/60">Phone</span>
                  <span className="text-sm font-medium">{profile.dial_code} {profile.phone}</span>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-black/60">Email</span>
                <span className="text-sm font-medium">{profile.email}</span>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 rounded-lg border border-[#c9d9cc] py-2 text-sm font-medium text-black hover:bg-[#f3f8f4] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="w-full rounded-lg border border-[#c9d9cc] py-2 text-sm font-medium text-[#355e3b] hover:bg-[#f3f8f4] transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </form>

        </section>
      </main>
      {showToast && <Toast message="Profile updated" />}
    </div>
  );
}
