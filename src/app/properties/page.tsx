"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Buildings, House } from "@phosphor-icons/react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type PropertySection = {
  id: string;
  section_name: string;
  created_at: string;
  created_by: string | null;
};

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_section_id: string;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  property_sections?: { section_name: string } | null;
};

type TeamMember = {
  id: string;
  full_name: string;
  role: string | null;
};

type Tab = "sections" | "properties";
type PropertySubTab = "all" | "active" | "deactivated";

export default function PropertiesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [activeTab, setActiveTab] = useState<Tab>("sections");
  const [propertySubTab, setPropertySubTab] = useState<PropertySubTab>("all");

  const [sections, setSections] = useState<PropertySection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [sectionSearch, setSectionSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  // Section form
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionError, setSectionError] = useState("");

  // Property form
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propSectionId, setPropSectionId] = useState("");
  const [propManagerId, setPropManagerId] = useState("");
  const [propMaintenanceId, setPropMaintenanceId] = useState("");
  const [propHousekeepingId, setPropHousekeepingId] = useState("");
  const [propHousePhone, setPropHousePhone] = useState("");
  const [propMainDoorCode, setPropMainDoorCode] = useState("");
  const [propGarageCode, setPropGarageCode] = useState("");
  const [propWifiPassword, setPropWifiPassword] = useState("");
  const [propError, setPropError] = useState("");

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

  const fetchData = useCallback(async () => {
    const [secRes, propRes, tmRes] = await Promise.all([
      fetch("/api/property-sections"),
      fetch("/api/properties"),
      fetch("/api/team-members"),
    ]);
    const secPayload = await secRes.json() as { data?: PropertySection[] };
    const propPayload = await propRes.json() as { data?: Property[] };
    const tmPayload = await tmRes.json() as { data?: TeamMember[] };
    setSections((secPayload.data ?? []).sort((a, b) => a.section_name.localeCompare(b.section_name)));
    setProperties((propPayload.data ?? []).sort((a, b) => a.name.localeCompare(b.name)));
    setTeamMembers((tmPayload.data ?? []).sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchData();
  }, [fetchData]);

  // ── Add section ──
  const addSection = async (e: FormEvent) => {
    e.preventDefault();
    setSectionError("");
    const duplicate = sections.some(
      (s) => s.section_name.toLowerCase() === sectionName.trim().toLowerCase()
    );
    if (duplicate) { setSectionError("A section with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setSectionError("You must be signed in."); return; }
    const res = await fetch("/api/property-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ section_name: sectionName }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setSectionError(payload.error ?? "Failed."); return; }
    setSectionName("");
    setShowSectionModal(false);
    await fetchData();
    showSuccess("Section added");
  };

  // ── Add property ──
  const addProperty = async (e: FormEvent) => {
    e.preventDefault();
    setPropError("");
    const duplicate = properties.some(
      (p) => p.name.toLowerCase() === propName.trim().toLowerCase()
    );
    if (duplicate) { setPropError("A property with this name already exists."); return; }
    const authHeader = await getAuthHeader();
    if (!authHeader) { setPropError("You must be signed in."); return; }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        name: propName,
        address: propAddress || null,
        property_section_id: propSectionId,
        property_manager_member_id: propManagerId || null,
        maintenance_member_id: propMaintenanceId || null,
        housekeeping_member_id: propHousekeepingId || null,
        house_phone: propHousePhone || null,
        main_door_code: propMainDoorCode || null,
        garage_code: propGarageCode || null,
        wifi_password: propWifiPassword || null,
      }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setPropError(payload.error ?? "Failed."); return; }
    setPropName("");
    setPropAddress("");
    setPropSectionId("");
    setPropManagerId("");
    setPropMaintenanceId("");
    setPropHousekeepingId("");
    setPropHousePhone("");
    setPropMainDoorCode("");
    setPropGarageCode("");
    setPropWifiPassword("");
    setShowPropertyModal(false);
    await fetchData();
    showSuccess("Property added");
  };

  // Property counts per section
  const activeCountPerSection = properties.reduce<Record<string, number>>((acc, p) => {
    if (p.is_active) acc[p.property_section_id] = (acc[p.property_section_id] ?? 0) + 1;
    return acc;
  }, {});
  const inactiveCountPerSection = properties.reduce<Record<string, number>>((acc, p) => {
    if (!p.is_active) acc[p.property_section_id] = (acc[p.property_section_id] ?? 0) + 1;
    return acc;
  }, {});

  const filteredSections = sections.filter((s) =>
    s.section_name.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const activeCount = properties.filter((p) => p.is_active).length;
  const deactivatedCount = properties.filter((p) => !p.is_active).length;

  const filteredProperties = properties
    .filter((p) =>
      p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
      (p.address ?? "").toLowerCase().includes(propertySearch.toLowerCase()) ||
      (p.property_sections?.section_name ?? "").toLowerCase().includes(propertySearch.toLowerCase())
    )
    .filter((p) => {
      if (propertySubTab === "active") return p.is_active;
      if (propertySubTab === "deactivated") return !p.is_active;
      return true;
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Properties" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-1 w-fit mb-6">
            {(["sections", "properties"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-[#355e3b] text-white shadow-sm"
                    : "text-black hover:text-[#355e3b]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Sections tab ── */}
          {activeTab === "sections" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#355e3b]">Sections</h1>
                <div className="flex items-center gap-2">
                  <input
                    className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                    placeholder="Search sections"
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                  />
                  <button
                    onClick={() => { setSectionName(""); setSectionError(""); setShowSectionModal(true); }}
                    className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {filteredSections.length === 0 ? (
                <p className="mt-4 text-sm text-black">No sections found.</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-[#c9d9cc]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#c9d9cc] bg-[#f3f8f4]">
                        <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Section Name</th>
                        <th className="px-4 py-3 text-right font-semibold text-[#355e3b]">Active</th>
                        <th className="px-4 py-3 text-right font-semibold text-[#355e3b]">Inactive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSections.map((s, i) => (
                        <tr
                          key={s.id}
                          onClick={() => router.push(`/properties/sections/${s.id}`)}
                          className={`cursor-pointer border-b border-[#c9d9cc] last:border-0 hover:bg-[#eaf3ec] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}
                        >
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <Buildings size={18} className="shrink-0 text-[#355e3b]" />
                              {s.section_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {activeCountPerSection[s.id] ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                              {inactiveCountPerSection[s.id] ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Properties tab ── */}
          {activeTab === "properties" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#355e3b]">Properties</h1>
                <div className="flex items-center gap-2">
                  <input
                    className="w-36 rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                    placeholder="Search properties"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                  />
                  <button
                    onClick={() => { setPropName(""); setPropAddress(""); setPropSectionId(""); setPropManagerId(""); setPropMaintenanceId(""); setPropHousekeepingId(""); setPropHousePhone(""); setPropMainDoorCode(""); setPropGarageCode(""); setPropWifiPassword(""); setPropError(""); setShowPropertyModal(true); }}
                    className="rounded-lg bg-[#355e3b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Property sub-tabs */}
              <div className="flex gap-1 rounded-xl border border-[#c9d9cc] bg-[#f3f8f4] p-1 w-fit mt-4">
                {([
                  {
                    key: "all" as PropertySubTab,
                    label: "All",
                    count: properties.length,
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm0,64H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Z" />
                      </svg>
                    ),
                  },
                  {
                    key: "active" as PropertySubTab,
                    label: "Active",
                    count: activeCount,
                    icon: <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />,
                  },
                  {
                    key: "deactivated" as PropertySubTab,
                    label: "Inactive",
                    count: deactivatedCount,
                    icon: <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />,
                  },
                ]).map(({ key, label, count, icon }) => (
                  <button
                    key={key}
                    onClick={() => setPropertySubTab(key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      propertySubTab === key
                        ? "bg-[#355e3b] text-white shadow-sm"
                        : "text-black hover:text-[#355e3b]"
                    }`}
                  >
                    {icon}
                    {label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      propertySubTab === key ? "bg-white/20 text-white" : "bg-[#355e3b]/10 text-[#355e3b]"
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {filteredProperties.length === 0 ? (
                <p className="mt-4 text-sm text-black">No properties found.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {filteredProperties.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => router.push(`/properties/${p.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#c9d9cc] bg-[#f3f8f4] px-4 py-3 hover:bg-[#eaf3ec] transition-colors"
                    >
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${p.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        <House size={24} className="text-[#355e3b]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-black/60">
                          {[p.property_sections?.section_name, p.address].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── Add Section modal ── */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Section</h2>
              <button onClick={() => { setSectionName(""); setSectionError(""); setShowSectionModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addSection} className="mt-4 space-y-3">
              <input
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Section name"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
              />
              {sectionError && <p className="text-xs text-red-600">{sectionError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Add Section
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Property modal ── */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Add Property</h2>
              <button onClick={() => { setPropName(""); setPropAddress(""); setPropSectionId(""); setPropManagerId(""); setPropMaintenanceId(""); setPropHousekeepingId(""); setPropHousePhone(""); setPropMainDoorCode(""); setPropGarageCode(""); setPropWifiPassword(""); setPropError(""); setShowPropertyModal(false); }} className="text-black hover:text-[#355e3b] text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={addProperty} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Property Name</label>
                <input required className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter property name" value={propName} onChange={(e) => setPropName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Address</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter address (optional)" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Section</label>
                <select required className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={propSectionId} onChange={(e) => setPropSectionId(e.target.value)}>
                  <option value="">Choose a section</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.section_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Property Manager</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={propManagerId} onChange={(e) => setPropManagerId(e.target.value)}>
                  <option value="">Choose a property manager (optional)</option>
                  {teamMembers.filter((m) => m.role === "property_manager").map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Maintenance</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={propMaintenanceId} onChange={(e) => setPropMaintenanceId(e.target.value)}>
                  <option value="">Choose a maintenance member (optional)</option>
                  {teamMembers.filter((m) => m.role === "maintenance").map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Housekeeping</label>
                <select className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" value={propHousekeepingId} onChange={(e) => setPropHousekeepingId(e.target.value)}>
                  <option value="">Choose a housekeeping member (optional)</option>
                  {teamMembers.filter((m) => m.role === "housekeeping").map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">House Phone</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter house phone number (optional)" value={propHousePhone} onChange={(e) => setPropHousePhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Main Door Code</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter main door access code (optional)" value={propMainDoorCode} onChange={(e) => setPropMainDoorCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Garage Code</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter garage access code (optional)" value={propGarageCode} onChange={(e) => setPropGarageCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">Wi-Fi Password</label>
                <input className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]" placeholder="Enter Wi-Fi password (optional)" value={propWifiPassword} onChange={(e) => setPropWifiPassword(e.target.value)} />
              </div>
              {propError && <p className="text-xs text-red-600">{propError}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">Add Property</button>
            </form>
          </div>
        </div>
      )}

      {showToast && <Toast message={toastMessage} />}
    </div>
  );
}
