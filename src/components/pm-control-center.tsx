"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
};

type PropertySection = {
  id: string;
  property_id: string;
  section_name: string;
};

type PropertyAssignment = {
  id: string;
  team_member_id: string;
  property_id: string;
  role: Role;
};

const roles: Role[] = ["gsm", "property_manager", "housekeeping", "maintenance"];

export function PmControlCenter() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
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

  const [sectionPropertyId, setSectionPropertyId] = useState("");
  const [sectionName, setSectionName] = useState("");

  const [assignmentMemberId, setAssignmentMemberId] = useState("");
  const [assignmentPropertyId, setAssignmentPropertyId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<PropertyAssignment["role"]>("gsm");

  const refreshData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const [teamRes, propertiesRes, sectionsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id, full_name, email")
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("id, name, address")
        .order("created_at", { ascending: false }),
      supabase
        .from("property_sections")
        .select("id, property_id, section_name")
        .order("created_at", { ascending: false }),
      supabase
        .from("property_assignments")
        .select("id, team_member_id, property_id, role")
        .order("created_at", { ascending: false }),
    ]);

    const firstError = [
      teamRes.error,
      propertiesRes.error,
      sectionsRes.error,
      assignmentsRes.error,
    ].find(Boolean);

    if (firstError) {
      setActionStatus(`Data load warning: ${firstError.message}`);
      return;
    }

    setTeamMembers(teamRes.data ?? []);
    setProperties(propertiesRes.data ?? []);
    setSections(sectionsRes.data ?? []);
    setAssignments(assignmentsRes.data ?? []);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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

    const { error } = await supabase.from("team_members").insert({
      full_name: memberName,
      email: memberEmail || null,
    });

    if (error) {
      setActionStatus(`Create team member failed: ${error.message}`);
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

    const { error } = await supabase.from("properties").insert({
      name: propertyName,
      address: propertyAddress || null,
    });

    if (error) {
      setActionStatus(`Create property failed: ${error.message}`);
      return;
    }

    setPropertyName("");
    setPropertyAddress("");
    setActionStatus("Property created.");
    await refreshData();
  };

  const createSection = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("property_sections").insert({
      property_id: sectionPropertyId,
      section_name: sectionName,
    });

    if (error) {
      setActionStatus(`Create section failed: ${error.message}`);
      return;
    }

    setSectionName("");
    setActionStatus("Property section created.");
    await refreshData();
  };

  const createAssignment = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from("property_assignments").insert({
      team_member_id: assignmentMemberId,
      property_id: assignmentPropertyId,
      role: assignmentRole,
    });

    if (error) {
      setActionStatus(`Create assignment failed: ${error.message}`);
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

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Phase 2: Auth + CRUD Control Center</h2>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-sm text-zinc-600">{status}</p>
        <button
          type="button"
          onClick={refreshData}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
        >
          Refresh Data
        </button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <form onSubmit={signIn} className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <h3 className="font-medium">Auth</h3>
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
              Sign In
            </button>
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              type="button"
              onClick={signUp}
            >
              Sign Up
            </button>
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm" type="button" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </form>

        <form onSubmit={createTeamMember} className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <h3 className="font-medium">Create Team Member</h3>
          <input
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Full name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Email (optional)"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
            Add Member
          </button>
        </form>

        <form onSubmit={createProperty} className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <h3 className="font-medium">Create Property</h3>
          <input
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Property name"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Address (optional)"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
            Add Property
          </button>
        </form>

        <form onSubmit={createSection} className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <h3 className="font-medium">Create Property Section</h3>
          <select
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            value={sectionPropertyId}
            onChange={(e) => setSectionPropertyId(e.target.value)}
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Section name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
          />
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
            Add Section
          </button>
        </form>

        <form onSubmit={createAssignment} className="space-y-3 rounded-lg border border-zinc-200 p-4 md:col-span-2">
          <h3 className="font-medium">Assign Role to Property</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={assignmentRole}
              onChange={(e) => setAssignmentRole(e.target.value as PropertyAssignment["role"])}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white" type="submit">
            Create Assignment
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4">
          <h4 className="font-medium">Team Members ({teamMembers.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {teamMembers.slice(0, 5).map((member) => (
              <li key={member.id}>
                {member.full_name}
                {member.email ? ` (${member.email})` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <h4 className="font-medium">Properties ({properties.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {properties.slice(0, 5).map((property) => (
              <li key={property.id}>
                {property.name}
                {property.address ? ` - ${property.address}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <h4 className="font-medium">Sections ({sections.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {sections.slice(0, 5).map((section) => (
              <li key={section.id}>{section.section_name}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <h4 className="font-medium">Assignments ({assignments.length})</h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {assignments.slice(0, 5).map((assignment) => (
              <li key={assignment.id}>{assignment.role}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
