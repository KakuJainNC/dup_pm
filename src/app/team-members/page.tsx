"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
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

const ROLES = ["gsm", "property_manager", "housekeeping", "maintenance"];
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
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+52");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [error, setError] = useState("");

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

  useEffect(() => {
    setMounted(true);
    setImageMap(getImageMap());
    void fetchMembers();
  }, [fetchMembers]);

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
    setRole(ROLES[0]);
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
      body: JSON.stringify({ full_name: name, email }),
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
  };

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <div className="bg-[#355e3b] px-10 py-4 text-center">
        <h1 className="text-xl font-semibold text-white uppercase tracking-widest">Team</h1>
      </div>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-10">
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
            <ul className="mt-4 space-y-2">
              {filtered.map((m) => {
                const img = m.email ? imageMap[m.email] : null;
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3">
                    {img ? (
                      <img src={img} alt={m.full_name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <img src="/default-user.jpg" alt={m.full_name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.full_name}</p>
                      {m.email && <p className="text-xs text-black">{m.email}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
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
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace("_", " ")}</option>
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
    </div>
  );
}
