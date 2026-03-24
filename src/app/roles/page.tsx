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
  created_at: string;
  created_by: string | null;
};

const ENTITIES = [
  { key: "properties",   label: "Properties" },
  { key: "sections",     label: "Sections" },
  { key: "team_members", label: "Team Members" },
  { key: "roles",        label: "Roles" },
] as const;

type EntityKey = typeof ENTITIES[number]["key"];

type PermissionRow = {
  entity: EntityKey;
  can_add: boolean;
  can_edit: "yes" | "no" | "own_only";
};

function defaultPermissions(): PermissionRow[] {
  return ENTITIES.map((e) => ({ entity: e.key, can_add: false, can_edit: "no" }));
}

export default function RolesPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  // Add role modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [addError, setAddError] = useState("");

  // Permissions modal
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>(defaultPermissions());
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState("");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Done");

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
    setAddError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setAddError("You must be signed in."); return; }
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name: roleName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setAddError(payload.error ?? "Failed."); return; }
    setRoleName("");
    setShowAddModal(false);
    await fetchRoles();
    setToastMessage("Role added");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const openPermissions = async (role: Role) => {
    setPermRole(role);
    setPermError("");
    setPermLoading(true);

    const res = await fetch(`/api/role-permissions?role=${encodeURIComponent(role.name)}`);
    const payload = await res.json() as { data?: { entity: string; can_add: boolean; can_edit: string }[] };

    const saved = payload.data ?? [];
    const merged = defaultPermissions().map((def) => {
      const found = saved.find((s) => s.entity === def.entity);
      if (found) {
        return {
          entity: def.entity,
          can_add: found.can_add,
          can_edit: found.can_edit as PermissionRow["can_edit"],
        };
      }
      return def;
    });
    setPermissions(merged);
    setPermLoading(false);
  };

  const savePermissions = async () => {
    if (!permRole) return;
    setPermSaving(true);
    setPermError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setPermError("You must be signed in."); setPermSaving(false); return; }

    const res = await fetch("/api/role-permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ role_name: permRole.name, permissions }),
    });
    const payload = await res.json() as { error?: string };
    setPermSaving(false);
    if (!res.ok) { setPermError(payload.error ?? "Failed."); return; }
    setPermRole(null);
    setToastMessage("Permissions saved");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const setCanAdd = (entity: EntityKey, value: boolean) => {
    setPermissions((prev) => prev.map((p) => p.entity === entity ? { ...p, can_add: value } : p));
  };

  const setCanEdit = (entity: EntityKey, value: PermissionRow["can_edit"]) => {
    setPermissions((prev) => prev.map((p) => p.entity === entity ? { ...p, can_edit: value } : p));
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
                onClick={() => { setAddError(""); setRoleName(""); setShowAddModal(true); }}
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
                <div
                  key={r.id}
                  onClick={() => openPermissions(r)}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-6 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <ShieldCheck size={32} className="mb-2 text-[#355e3b]" />
                  <p className="text-sm font-semibold text-[#355e3b] capitalize">{r.name.replace(/_/g, " ")}</p>
                  <span className="mt-2 rounded-full bg-[#355e3b]/10 px-2.5 py-1 text-xs font-medium text-[#355e3b]">
                    {r.member_count} {r.member_count === 1 ? "member" : "members"}
                  </span>
                  <span className="mt-1 text-[10px] text-black/40">Click to set permissions</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Role modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Role</h2>
              <button onClick={() => setShowAddModal(false)} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
            </div>
            <form onSubmit={addRole} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Role name (e.g. Housekeeping)"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Role
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Permissions modal */}
      {permRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPermRole(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#355e3b] capitalize">{permRole.name.replace(/_/g, " ")} — Permissions</h2>
                <p className="text-xs text-black/50 mt-0.5">Define what members with this role can do</p>
              </div>
              <button onClick={() => setPermRole(null)} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
            </div>

            {permLoading ? (
              <p className="mt-6 text-sm text-black/50">Loading…</p>
            ) : (
              <div className="mt-5">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_140px_260px] gap-2 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
                  <span>Feature</span>
                  <span>Can Add</span>
                  <span>Can Edit</span>
                </div>

                <div className="space-y-2">
                  {permissions.map((perm) => {
                    const label = ENTITIES.find((e) => e.key === perm.entity)?.label ?? perm.entity;
                    return (
                      <div key={perm.entity} className="grid grid-cols-[1fr_140px_260px] items-center gap-2 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-3">
                        <span className="text-sm font-medium">{label}</span>

                        {/* Can Add: Yes / No */}
                        <div className="flex gap-1">
                          {([true, false] as const).map((val) => (
                            <button
                              key={String(val)}
                              onClick={() => setCanAdd(perm.entity, val)}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                perm.can_add === val
                                  ? val
                                    ? "bg-[#355e3b] text-white"
                                    : "bg-black/10 text-black"
                                  : "border border-[#c9d9cc] text-black/40 hover:border-[#355e3b] hover:text-[#355e3b]"
                              }`}
                            >
                              {val ? "Yes" : "No"}
                            </button>
                          ))}
                        </div>

                        {/* Can Edit: Yes / No / Own Only */}
                        <div className="flex gap-1">
                          {(["yes", "no", "own_only"] as const).map((val) => (
                            <button
                              key={val}
                              onClick={() => setCanEdit(perm.entity, val)}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                perm.can_edit === val
                                  ? val === "yes"
                                    ? "bg-[#355e3b] text-white"
                                    : val === "no"
                                    ? "bg-black/10 text-black"
                                    : "bg-amber-100 text-amber-700"
                                  : "border border-[#c9d9cc] text-black/40 hover:border-[#355e3b] hover:text-[#355e3b]"
                              }`}
                            >
                              {val === "own_only" ? "Own Only" : val === "yes" ? "Yes" : "No"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {permError && <p className="mt-3 text-xs text-red-600">{permError}</p>}

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={savePermissions}
                    disabled={permSaving}
                    className="rounded-lg bg-[#355e3b] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors disabled:opacity-50"
                  >
                    {permSaving ? "Saving…" : "Save Permissions"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
