import { db } from "@/api/supabaseClient";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import ScopeDialog from "@/components/staff/ScopeDialog";
import { Loader2, UserPlus, Pencil, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllRetailers, int } from "@/lib/retailers";
import { scopeLabel } from "@/lib/italy";
import { cn } from "@/lib/utils";

export default function Staff() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [list, shops] = await Promise.all([
      db.entities.User.list(),
      fetchAllRetailers(),
    ]);
    setUsers(list || []);
    setRetailers(shops);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saved = (message) => {
    setNotice(message);
    load();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-primary">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Create the team accounts and give each one its territory: all Italy, some regions, or
            selected provinces.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Create user
        </Button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          users.map((member) => {
            const admin = member.role === "admin";
            const unscoped = !admin && !member.scope_type;
            return (
              <div
                key={member.id}
                className="flex flex-wrap items-start gap-3 border-b border-border p-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {member.full_name || member.email}
                      {member.email === currentUser?.email ? " · you" : ""}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        admin
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground"
                      )}
                    >
                      {admin ? <ShieldCheck className="w-3 h-3" /> : null}
                      {admin ? "Admin" : "Staff"}
                    </span>
                    {unscoped && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        <AlertTriangle className="w-3 h-3" /> No territory
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{member.email}</div>
                  <div className="mt-1 text-xs">
                    <span className="text-muted-foreground">Sees: </span>
                    {scopeLabel(member)}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(member)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Territory
                </Button>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {int(users.length)} users · {int(retailers.length)} retailers in the database. Admins
        always see every retailer and can manage users and balances.
      </p>

      <ScopeDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        mode="invite"
        retailers={retailers}
        onSaved={saved}
      />
      <ScopeDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        user={editing}
        retailers={retailers}
        onSaved={saved}
      />
    </div>
  );
}