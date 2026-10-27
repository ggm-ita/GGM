import { db } from "@/api/supabaseClient";

import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { ITALY_REGIONS, provinceOptions } from "@/lib/italy";
import { int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const SCOPE_TYPES = [
  { key: "all", label: "All Italy" },
  { key: "regions", label: "Regions" },
  { key: "provinces", label: "Provinces" },
];

export default function ScopeDialog({
  open,
  onOpenChange,
  mode = "edit",
  user,
  retailers = [],
  onSaved,
}) {
  const { user: currentUser } = useAuth();
  const isInvite = mode === "invite";
  const isSelf = !isInvite && user?.email && user.email === currentUser?.email;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [scopeType, setScopeType] = useState("all");
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email || "");
    setRole(user?.role || "user");
    setScopeType(user?.scope_type || (isInvite ? "all" : ""));
    setRegions(user?.regions || []);
    setProvinces(user?.provinces || []);
    setProvinceQuery("");
    setError("");
  }, [open, user, isInvite]);

  const allProvinces = useMemo(() => provinceOptions(retailers), [retailers]);
  const visibleProvinces = useMemo(() => {
    const needle = provinceQuery.trim().toLowerCase();
    if (!needle) return allProvinces;
    return allProvinces.filter((p) =>
      `${p.code} ${p.name} ${p.region}`.toLowerCase().includes(needle)
    );
  }, [allProvinces, provinceQuery]);

  const visibleCount = useMemo(() => {
    if (scopeType === "all") return retailers.length;
    if (scopeType === "regions")
      return retailers.filter((r) => regions.includes(r.region)).length;
    if (scopeType === "provinces")
      return retailers.filter((r) => provinces.includes(r.province_code)).length;
    return 0;
  }, [scopeType, regions, provinces, retailers]);

  const toggle = (value, list, setList) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = async () => {
    setError("");
    if (isInvite && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (scopeType === "regions" && !regions.length) {
      setError("Pick at least one region.");
      return;
    }
    if (scopeType === "provinces" && !provinces.length) {
      setError("Pick at least one province.");
      return;
    }

    setSaving(true);
    const payload = {
      role,
      scope_type: scopeType,
      regions: scopeType === "regions" ? regions : [],
      provinces: scopeType === "provinces" ? provinces : [],
    };

    try {
      if (isInvite) {
        await db.users.inviteUser(email.trim(), role);
        const list = await db.entities.User.list();
        const created = (list || []).find(
          (u) => String(u.email).toLowerCase() === email.trim().toLowerCase()
        );
        if (created) await db.entities.User.update(created.id, payload);
        onSaved?.(
          created
            ? "Invitation sent and territory assigned."
            : "Invitation sent. Assign the territory once the account appears in the list."
        );
      } else {
        await db.entities.User.update(user.id, payload);
        onSaved?.("Territory updated.");
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The change could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto ggm-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">
            {isInvite ? "Add a user" : "Territory & role"}
          </DialogTitle>
          <DialogDescription>
            {isInvite
              ? "The user receives an email invitation and sees only the retailers you assign."
              : user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {isInvite && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@ggm.it"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staff-role">Role</Label>
                <select
                  id="staff-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
                >
                  <option value="user">Staff — follows retailers</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
            </div>
          )}

          {!isInvite && (
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isSelf}
                className={cn(
                  "h-10 rounded-lg border border-border bg-secondary px-2 text-sm",
                  isSelf && "opacity-60"
                )}
              >
                <option value="user">Staff — follows retailers</option>
                <option value="admin">Admin — full access</option>
              </select>
              {isSelf && (
                <p className="text-[11px] text-muted-foreground">
                  You cannot change your own role.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Retailers this user can see</Label>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border">
              {SCOPE_TYPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScopeType(item.key)}
                  className={cn(
                    "border-r border-border py-2 text-xs font-medium last:border-r-0",
                    scopeType === item.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {scopeType
                ? `${int(visibleCount)} of ${int(retailers.length)} retailers in this territory.`
                : "No territory yet — this user sees nothing until you assign one."}
            </p>
          </div>

          {scopeType === "regions" && (
            <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 ggm-scroll">
              {ITALY_REGIONS.map((region) => (
                <label key={region} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={regions.includes(region)}
                    onChange={() => toggle(region, regions, setRegions)}
                    className="accent-primary"
                  />
                  {region}
                </label>
              ))}
            </div>
          )}

          {scopeType === "provinces" && (
            <div className="grid gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={provinceQuery}
                  onChange={(e) => setProvinceQuery(e.target.value)}
                  placeholder="Search a province"
                  className="pl-9"
                />
              </div>
              <div className="grid max-h-52 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 ggm-scroll sm:grid-cols-2">
                {visibleProvinces.map((province) => (
                  <label key={province.code} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={provinces.includes(province.code)}
                      onChange={() => toggle(province.code, provinces, setProvinces)}
                      className="accent-primary"
                    />
                    <span className="truncate">
                      {province.code} · {province.name}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {province.count}
                    </span>
                  </label>
                ))}
                {!visibleProvinces.length && (
                  <p className="text-xs text-muted-foreground">No province matches.</p>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isInvite ? "Send invitation" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}