import React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function AdminGate({ children }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="w-8 h-8 text-primary" />
        <h2 className="font-heading text-2xl text-primary">Administrators only</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This section is limited to administrators. Ask a colleague with admin access to make
          this change.
        </p>
      </div>
    );
  }

  return children;
}