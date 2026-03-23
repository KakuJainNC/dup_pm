"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ShieldCheck } from "@phosphor-icons/react";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type Role = {
  id: string;
  name: string;
  member_count: number;
};

export default function RolesPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles");
    const payload = await res.json() as { data?: Role[] };
    setRoles(payload.data ?? []);
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchRoles();
  }, [fetchRoles]);

  const addRole = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in."); return; }
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: roleName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setError(payload.error ?? "Failed."); return; }
    setRoleName("");
    setShowModal(false);
    await fetchRoles();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Roles" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#355e3b]">Roles</h1>
            <div className="flex items-center gap-2">
              <input
                className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Search roles"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => { setError(""); setRoleName(""); setShowModal(true); }}
                className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-black">No roles found.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((r) => (
                <div key={r.id} className="flex flex-col items-center justify-center rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <ShieldCheck size={32} className="mb-2 text-[#355e3b]" />
                  <p className="text-sm font-semibold text-[#355e3b] capitalize">{r.name.replace(/_/g, " ")}</p>
                  <span className="mt-2 rounded-full bg-[#355e3b]/10 px-2.5 py-1 text-xs font-medium text-[#355e3b]">
                    {r.member_count} {r.member_count === 1 ? "member" : "members"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Role</h2>
              <button onClick={() => setShowModal(false)} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
            </div>
            <form onSubmit={addRole} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Role name (e.g. Housekeeping)"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Role
              </button>
            </form>
          </div>
        </div>
      )}
      {showToast && <Toast message="Done" />}
    </div>
  );
}
