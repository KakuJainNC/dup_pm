"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PageBand } from "@/components/page-band";
import { Toast } from "@/components/toast";

type NotificationConfig = {
  id: string;
  entity: "team" | "properties" | "sections";
  recipient_name: string | null;
  recipient_email: string | null;
};

const ENTITY_LABELS: Record<string, string> = {
  team: "New Team Member",
  properties: "New Property",
  sections: "New Section",
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  team: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128Z" />
    </svg>
  ),
  properties: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
      <path d="M240,208H224V136l2.34,2.34A8,8,0,0,0,237.66,127L139.31,28.68a16,16,0,0,0-22.62,0L18.34,127a8,8,0,0,0,11.32,11.31L32,136v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM48,120l80-80,80,80v88H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48Zm96,88H112V160h32Z" />
    </svg>
  ),
  sections: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
};

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NotificationConfig | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, [supabase]);

  const fetchConfigs = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const payload = await res.json() as { data?: NotificationConfig[] };
    setConfigs(payload.data ?? []);
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchConfigs();
  }, [fetchConfigs]);

  const openEdit = (config: NotificationConfig) => {
    setEditing(config);
    setRecipientName(config.recipient_name ?? "");
    setRecipientEmail(config.recipient_email ?? "");
    setError("");
    setShowModal(true);
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const authHeader = await getAuthHeader();
    if (!authHeader) { setError("You must be signed in."); return; }
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ entity: editing?.entity, recipient_name: recipientName, recipient_email: recipientEmail }),
    });
    const payload = await res.json() as { error?: string };
    if (!res.ok) { setError(payload.error ?? "Failed."); return; }
    setShowModal(false);
    await fetchConfigs();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f3f8f4] font-sans text-black">
      <PageBand title="Notifications" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#355e3b]">Notification Recipients</h1>
          <p className="mt-1 text-sm text-black/60">Configure who receives an email when a new entry is added.</p>

          <div className="mt-6 overflow-hidden rounded-xl border border-[#c9d9cc]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#c9d9cc] bg-[#f3f8f4]">
                  <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Trigger</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Recipient Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#355e3b]">Recipient Email</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[#c9d9cc] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#f9fcfa]"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[#355e3b]">
                        {ENTITY_ICONS[c.entity]}
                        <span className="font-medium">{ENTITY_LABELS[c.entity]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black/70">{c.recipient_name ?? <span className="italic text-black/30">Not set</span>}</td>
                    <td className="px-4 py-3 text-black/70">{c.recipient_email ?? <span className="italic text-black/30">Not set</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg border border-[#c9d9cc] px-3 py-1.5 text-xs font-medium text-[#355e3b] hover:bg-[#e8f0ea] transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#355e3b]">Edit — {ENTITY_LABELS[editing.entity]}</h2>
              <button onClick={() => setShowModal(false)} className="text-xl leading-none text-black hover:text-[#355e3b]">&times;</button>
            </div>
            <form onSubmit={saveEdit} className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Recipient name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
              <input
                type="email"
                required
                className="w-full rounded-lg border border-[#b8cbbd] px-3 py-2 text-sm outline-none focus:border-[#355e3b]"
                placeholder="Recipient email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button className="w-full rounded-lg bg-[#355e3b] py-2 text-sm font-medium text-white hover:bg-[#2d5233] transition-colors" type="submit">
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {showToast && <Toast message="Done" />}
    </div>
  );
}
