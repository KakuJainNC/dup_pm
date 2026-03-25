"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Role } from "@/lib/supabase/types";

type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
};

type Property = {
  id: string;
  name: string;
  address: string | null;
  property_section_id: string;
  property_sections?: {
    id: string;
    section_name: string;
  } | null;
};

type PropertySection = {
  id: string;
  section_name: string;
};

type PropertyAssignment = {
  id: string;
  team_member_id: string;
  property_id: string;
  role: Role;
};

const roles: Role[] = ["gsm", "housekeeping", "maintenance", "property_manager"];

function formatRole(role: string): string {
  if (role.toLowerCase() === "gsm") return "GSM";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PmControlCenter() {
  const [mounted, setMounted] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient>>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [actionStatus, setActionStatus] = useState("Ready");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [sections, setSections] = useState<PropertySection[]>([]);
  const [assignments, setAssignments] = useState<PropertyAssignment[]>([]);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertySectionId, setPropertySectionId] = useState("");

  const [sectionName, setSectionName] = useState("");

  const [assignmentMemberId, setAssignmentMemberId] = useState("");
  const [assignmentPropertyId, setAssignmentPropertyId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<PropertyAssignment["role"]>("gsm");

  const getAuthHeader = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return accessToken ? `Bearer ${accessToken}` : null;
  }, [supabase]);

  const requestApi = useCallback(
    async <T,>(path: string, options?: RequestInit) => {
      const authHeader = await getAuthHeader();
      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(options?.headers ?? {}),
        },
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: T; error?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Request failed.");
      }

      return payload;
    },
    [getAuthHeader],
  );

  const refreshData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      const [teamRes, propertiesRes, sectionsRes, assignmentsRes] = await Promise.all([
        requestApi<TeamMember[]>("/api/team-members"),
        requestApi<Property[]>("/api/properties"),
        requestApi<PropertySection[]>("/api/property-sections"),
        requestApi<PropertyAssignment[]>("/api/property-assignments"),
      ]);

      setTeamMembers(teamRes?.data ?? []);
      setProperties(propertiesRes?.data ?? []);
      setSections(sectionsRes?.data ?? []);
      setAssignments(assignmentsRes?.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load data.";
      setActionStatus(`Data load warning: ${message}`);
    }
  }, [requestApi, supabase]);

  useEffect(() => {
    setMounted(true);
    setSupabase(getSupabaseBrowserClient());
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await refreshData();
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      void refreshData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refreshData]);

  const signUp = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setActionStatus(`Sign up failed: ${error.message}`);
      return;
    }

    setActionStatus("Sign up success. Check email if confirmation is enabled.");
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setActionStatus(`Sign in failed: ${error.message}`);
      return;
    }

    setActionStatus(`Signed in as ${authEmail}`);
    await refreshData();
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActionStatus("Signed out.");
  };

  const createTeamMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    try {
      await requestApi("/api/team-members", {
        method: "POST",
        body: JSON.stringify({
          full_name: memberName,
          email: memberEmail || null,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create member.";
      setActionStatus(`Create team member failed: ${message}`);
      return;
    }

    setMemberName("");
    setMemberEmail("");
    setActionStatus("Team member created.");
    await refreshData();
  };

  const createProperty = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    try {
      await requestApi("/api/properties", {
        method: "POST",
        body: JSON.stringify({
          name: propertyName,
          address: propertyAddress || null,
          property_section_id: propertySectionId,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create property.";
      setActionStatus(`Create property failed: ${message}`);
      return;
    }

    setPropertyName("");
    setPropertyAddress("");
    setPropertySectionId("");
    setActionStatus("Property created.");
    await refreshData();
  };

  const createSection = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    try {
      await requestApi("/api/property-sections", {
        method: "POST",
        body: JSON.stringify({
          section_name: sectionName,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create section.";
      setActionStatus(`Create section failed: ${message}`);
      return;
    }

    setSectionName("");
    setActionStatus("Property section created.");
    await refreshData();
  };

  const createAssignment = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    try {
      await requestApi("/api/property-assignments", {
        method: "POST",
        body: JSON.stringify({
          team_member_id: assignmentMemberId,
          property_id: assignmentPropertyId,
          role: assignmentRole,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create assignment.";
      setActionStatus(`Create assignment failed: ${message}`);
      return;
    }

    setActionStatus("Role assignment created.");
    await refreshData();
  };

  const status = !supabase
    ? "Missing Supabase env vars in this deployment."
    : actionStatus !== "Ready"
      ? actionStatus
      : session?.user?.email
        ? `Signed in as ${session.user.email}`
        : "Signed out. You can still view data if your RLS allows public read.";

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-[#c9d9cc] bg-[#fcfefd] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#355e3b]">Phase 2: Auth + CRUD Control Center</h2>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-sm text-black">{status}</p>
        <button
          type="button"
          onClick={refreshData}
          className="rounded-md border border-[#b8cbbd] px-2 py-1 text-xs"
        >
          Refresh Data
        </button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <form onSubmit={signIn} className="space-y-3 rounded-lg border border-[#c9d9cc] p-4">
          <h3 className="font-medium">Auth</h3>
          <input
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">
              Sign In
            </button>
            <button
              className="rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              type="button"
              onClick={signUp}
            >
              Sign Up
            </button>
            <button className="rounded-md border border-[#b8cbbd] px-3 py-2 text-sm" type="button" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </form>

        <form onSubmit={createTeamMember} className="space-y-3 rounded-lg border border-[#c9d9cc] p-4">
          <h3 className="font-medium">Create Team Member</h3>
          <input
            required
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Full name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Email (optional)"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
          <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">
            Add Member
          </button>
        </form>

        <form onSubmit={createProperty} className="space-y-3 rounded-lg border border-[#c9d9cc] p-4">
          <h3 className="font-medium">Create Property</h3>
          <input
            required
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Property name"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Address (optional)"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
          />
          <select
            required
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            value={propertySectionId}
            onChange={(e) => setPropertySectionId(e.target.value)}
          >
            <option value="">Select property section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.section_name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">
            Add Property
          </button>
        </form>

        <form onSubmit={createSection} className="space-y-3 rounded-lg border border-[#c9d9cc] p-4">
          <h3 className="font-medium">Create Property Section</h3>
          <input
            required
            className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
            placeholder="Property section name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
          />
          <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">
            Add Section
          </button>
        </form>

        <form onSubmit={createAssignment} className="space-y-3 rounded-lg border border-[#c9d9cc] p-4 md:col-span-2">
          <h3 className="font-medium">Assign Role to Property</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              value={assignmentMemberId}
              onChange={(e) => setAssignmentMemberId(e.target.value)}
            >
              <option value="">Select member</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
            <select
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              value={assignmentPropertyId}
              onChange={(e) => setAssignmentPropertyId(e.target.value)}
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <select
              required
              className="w-full rounded-md border border-[#b8cbbd] px-3 py-2 text-sm"
              value={assignmentRole}
              onChange={(e) => setAssignmentRole(e.target.value as PropertyAssignment["role"])}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-md bg-[#355e3b] px-3 py-2 text-sm text-[#eef5ef]" type="submit">
            Create Assignment
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#c9d9cc] p-4">
          <h4 className="font-medium">Team Members ({teamMembers.length})</h4>
          <ul className="mt-2 space-y-2 text-sm text-black">
            {teamMembers.slice(0, 5).map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <img
                  src="/default-user.jpg"
                  alt="user"
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span>
                  {member.full_name}
                  {member.email ? ` (${member.email})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[#c9d9cc] p-4">
          <h4 className="font-medium">Properties ({properties.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-black">
            {properties.slice(0, 5).map((property) => (
              <li key={property.id}>
                {property.name}
                {property.property_sections?.section_name
                  ? ` (${property.property_sections.section_name})`
                  : ""}
                {property.address ? ` - ${property.address}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[#c9d9cc] p-4">
          <h4 className="font-medium">Sections ({sections.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-black">
            {sections.slice(0, 5).map((section) => (
              <li key={section.id}>{section.section_name}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[#c9d9cc] p-4">
          <h4 className="font-medium">Assignments ({assignments.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-black">
            {assignments.slice(0, 5).map((assignment) => (
              <li key={assignment.id}>{formatRole(assignment.role)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
