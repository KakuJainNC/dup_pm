"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ShieldCheck } from "@phosphor-icons/react";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";
import { NAV_ITEMS, type NavItemKey } from "@/lib/nav-config";

type Role = {
  id: string;
  name: string;
  member_count: number;
  created_at: string;
  created_by: string | null;
};

// ── Activities (permissions) ──────────────────────────────────────
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

// ── Visibility ────────────────────────────────────────────────────
type VisibilityRow = {
  nav_key: NavItemKey;
  visible: boolean;
};

function defaultVisibility(): VisibilityRow[] {
  return NAV_ITEMS.map((n) => ({ nav_key: n.key, visible: true }));
}

type ModalTab = "activities" | "visibility";

function formatRole(role: string): string {
  if (role.toLowerCase() === "gsm") return "GSM";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  // Permissions / visibility modal
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("activities");
  const [permissions, setPermissions] = useState<PermissionRow[]>(defaultPermissions());
  const [visibility, setVisibility] = useState<VisibilityRow[]>(defaultVisibility());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

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

  const openModal = async (role: Role) => {
    setPermRole(role);
    setModalTab("activities");
    setModalError("");
    setLoading(true);

    const [permRes, visRes] = await Promise.all([
      fetch(`/api/role-permissions?role=${encodeURIComponent(role.name)}`, { cache: "no-store" }),
      fetch(`/api/role-visibility?role=${encodeURIComponent(role.name)}`, { cache: "no-store" }),
    ]);

    const permPayload = await permRes.json() as { data?: { entity: string; can_add: boolean; can_edit: string }[] };
    const visPayload = await visRes.json() as { data?: { nav_key: string; visible: boolean }[] };

    // Merge saved permissions with defaults
    const savedPerms = permPayload.data ?? [];
    setPermissions(defaultPermissions().map((def) => {
      const found = savedPerms.find((s) => s.entity === def.entity);
      return found
        ? { entity: def.entity, can_add: found.can_add, can_edit: found.can_edit as PermissionRow["can_edit"] }
        : def;
    }));

    // Merge saved visibility with defaults (new nav items default to visible)
    const savedVis = visPayload.data ?? [];
    setVisibility(defaultVisibility().map((def) => {
      const found = savedVis.find((s) => s.nav_key === def.nav_key);
      return found ? { nav_key: def.nav_key, visible: found.visible } : def;
    }));

    setLoading(false);
  };

  const save = async () => {
    if (!permRole) return;
    setSaving(true);
    setModalError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setModalError("You must be signed in."); setSaving(false); return; }

    const [permRes, visRes] = await Promise.all([
      fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ role_name: permRole.name, permissions }),
      }),
      fetch("/api/role-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ role_name: permRole.name, visibility }),
      }),
    ]);

    const permPayload = await permRes.json() as { error?: string };
    const visPayload = await visRes.json() as { error?: string };

    setSaving(false);

    if (!permRes.ok || !visRes.ok) {
      setModalError(permPayload.error ?? visPayload.error ?? "Failed to save.");
      return;
    }

    setPermRole(null);
    setToastMessage("Permissions saved");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const setCanAdd = (entity: EntityKey, value: boolean) =>
    setPermissions((prev) => prev.map((p) => p.entity === entity ? { ...p, can_add: value } : p));

  const setCanEdit = (entity: EntityKey, value: PermissionRow["can_edit"]) =>
    setPermissions((prev) => prev.map((p) => p.entity === entity ? { ...p, can_edit: value } : p));

  const setNavVisible = (nav_key: NavItemKey, value: boolean) =>
    setVisibility((prev) => prev.map((v) => v.nav_key === nav_key ? { ...v, visible: value } : v));

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
                  onClick={() => openModal(r)}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-6 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <ShieldCheck size={32} className="mb-2 text-[#355e3b]" />
                  <p className="text-sm font-semibold text-[#355e3b]">{formatRole(r.name)}</p>
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
              <button onClick={() => { setRoleName(""); setAddError(""); setShowAddModal(false); }} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
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

      {/* Permissions / Visibility modal */}
      {permRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPermRole(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#355e3b]">{formatRole(permRole.name)} — Permissions</h2>
                <p className="text-xs text-black/50 mt-0.5">Configure what this role can do and see</p>
              </div>
              <button onClick={() => setPermRole(null)} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
            </div>

            {/* Inner tabs */}
            <div className="mt-4 flex gap-1 rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-1 w-fit">
              {(["activities", "visibility"] as ModalTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  className={`rounded-lg px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                    modalTab === tab
                      ? "bg-[#355e3b] text-white shadow-sm"
                      : "text-black hover:text-[#355e3b]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-black/50">Loading…</p>
            ) : (
              <div className="mt-4">

                {/* ── Activities tab ── */}
                {modalTab === "activities" && (
                  <>
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
                            <div className="flex gap-1">
                              {([true, false] as const).map((val) => (
                                <button
                                  key={String(val)}
                                  onClick={() => setCanAdd(perm.entity, val)}
                                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    perm.can_add === val
                                      ? val ? "bg-[#355e3b] text-white" : "bg-black/10 text-black"
                                      : "border border-[#c9d9cc] text-black/40 hover:border-[#355e3b] hover:text-[#355e3b]"
                                  }`}
                                >
                                  {val ? "Yes" : "No"}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {(["yes", "no", "own_only"] as const).map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setCanEdit(perm.entity, val)}
                                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    perm.can_edit === val
                                      ? val === "yes" ? "bg-[#355e3b] text-white"
                                        : val === "no" ? "bg-black/10 text-black"
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
                  </>
                )}

                {/* ── Visibility tab ── */}
                {modalTab === "visibility" && (
                  <>
                    <div className="grid grid-cols-[1fr_180px] gap-2 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
                      <span>Navigation Tab</span>
                      <span>Visible to Role</span>
                    </div>
                    <div className="space-y-2">
                      {visibility.map((v) => {
                        const item = NAV_ITEMS.find((n) => n.key === v.nav_key);
                        return (
                          <div key={v.nav_key} className="grid grid-cols-[1fr_180px] items-center gap-2 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-3 py-3">
                            <span className="text-sm font-medium">{item?.label ?? v.nav_key}</span>
                            <div className="flex gap-1">
                              {([true, false] as const).map((val) => (
                                <button
                                  key={String(val)}
                                  onClick={() => setNavVisible(v.nav_key, val)}
                                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    v.visible === val
                                      ? val ? "bg-[#355e3b] text-white" : "bg-black/10 text-black"
                                      : "border border-[#c9d9cc] text-black/40 hover:border-[#355e3b] hover:text-[#355e3b]"
                                  }`}
                                >
                                  {val ? "Visible" : "Hidden"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {modalError && <p className="mt-3 text-xs text-red-600">{modalError}</p>}

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="rounded-lg bg-[#355e3b] px-6 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
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
