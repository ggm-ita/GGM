import { db, supabase } from "@/api/supabaseClient";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 60000;

/* The signed-in user's notifications. RLS already restricts the rows to the
   caller, so no user filter is needed. A light poll keeps the badge fresh while
   the app is open, and opening the panel refreshes on demand. */
export function useNotifications(user) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const userId = user?.id;
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const page = await db.entities.Notification.filter({}, { sort: "-created_date", limit: 40 });
      if (alive.current) {
        setItems(page.items || []);
        setError("");
      }
    } catch {
      if (alive.current) setError("Notifications could not be loaded.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [load]);

  /* Live updates: a new row arrives the moment a trigger writes it, so the badge
     changes without a page refresh. The poll above stays as a fallback. */
  useEffect(() => {
    if (!userId || !supabase) return undefined;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const markRead = useCallback(
    async (id) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      try {
        await db.entities.Notification.update(id, { is_read: true });
      } catch {
        load();
      }
    },
    [load]
  );

  const markAllRead = useCallback(async () => {
    const unread = items.filter((item) => !item.is_read);
    if (!unread.length) return;
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    try {
      await db.entities.Notification.bulkUpdate(
        unread.map((item) => ({ id: item.id, is_read: true }))
      );
    } catch {
      load();
    }
  }, [items, load]);

  return {
    items,
    unread: items.filter((item) => !item.is_read).length,
    loading,
    error,
    reload: load,
    markRead,
    markAllRead,
  };
}
