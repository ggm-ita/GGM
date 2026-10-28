import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — the app runs without a backend."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

/* Entity name → Postgres table. */
const TABLES = {
  Retailer: "retailers",
  Visit: "visits",
  Interaction: "interactions",
  User: "profiles",
};

const DEFAULT_LIMIT = 1000;

const dbError = (error) => {
  const err = new Error(error?.message || "Database request failed");
  err.status = error?.status;
  err.details = error?.details;
  return err;
};

/* ------------------------------------------------------------------ *
 * Query translation: the app's filter objects → PostgREST operators.
 * Supported: equality, $in, $regex (case-insensitive contains), $gt,
 * $gte, $lt, $lte, $ne, null, arrays and a top-level $or.
 * ------------------------------------------------------------------ */

const quoteOrValue = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const orConditions = (conditions) => {
  const parts = [];
  (conditions || []).forEach((condition) => {
    Object.entries(condition || {}).forEach(([field, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if ("$regex" in value) parts.push(`${field}.ilike.${quoteOrValue(`%${value.$regex}%`)}`);
        if ("$in" in value) {
          parts.push(`${field}.in.(${(value.$in || []).map(quoteOrValue).join(",")})`);
        }
        if ("$gte" in value) parts.push(`${field}.gte.${quoteOrValue(value.$gte)}`);
        if ("$lte" in value) parts.push(`${field}.lte.${quoteOrValue(value.$lte)}`);
        if ("$gt" in value) parts.push(`${field}.gt.${quoteOrValue(value.$gt)}`);
        if ("$lt" in value) parts.push(`${field}.lt.${quoteOrValue(value.$lt)}`);
        if ("$ne" in value) parts.push(`${field}.neq.${quoteOrValue(value.$ne)}`);
        return;
      }
      if (value === null) {
        parts.push(`${field}.is.null`);
        return;
      }
      parts.push(`${field}.eq.${quoteOrValue(value)}`);
    });
  });
  return parts.join(",");
};

const applyQuery = (builder, query) => {
  let next = builder;
  Object.entries(query || {}).forEach(([field, value]) => {
    if (field === "$or") {
      const expression = orConditions(value);
      if (expression) next = next.or(expression);
      return;
    }
    if (field === "$and") {
      (value || []).forEach((condition) => {
        next = applyQuery(next, condition);
      });
      return;
    }
    if (value === null) {
      next = next.is(field, null);
      return;
    }
    if (Array.isArray(value)) {
      next = next.in(field, value);
      return;
    }
    if (value && typeof value === "object") {
      if ("$regex" in value) next = next.ilike(field, `%${value.$regex}%`);
      if ("$in" in value) next = next.in(field, value.$in);
      if ("$gte" in value) next = next.gte(field, value.$gte);
      if ("$lte" in value) next = next.lte(field, value.$lte);
      if ("$gt" in value) next = next.gt(field, value.$gt);
      if ("$lt" in value) next = next.lt(field, value.$lt);
      if ("$ne" in value) next = next.neq(field, value.$ne);
      return;
    }
    next = next.eq(field, value);
  });
  return next;
};

const applySort = (builder, sort) => {
  if (!sort) return builder;
  return String(sort)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .reduce(
      (next, token) =>
        token.startsWith("-")
          ? next.order(token.slice(1), { ascending: false })
          : next.order(token, { ascending: true }),
      builder
    );
};

const pageOf = (rows, offset, limit) => {
  const items = rows || [];
  const hasMore = items.length === limit;
  return {
    items,
    has_more: hasMore,
    next_cursor: hasMore ? String(offset + limit) : null,
  };
};

const offsetOf = (cursor) => {
  const value = Number(cursor);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const limitOf = (limit) => {
  const value = Number(limit);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT;
};

/* ------------------------------------------------------------------ *
 * Entity client — mirrors the entity API the app was written against.
 * ------------------------------------------------------------------ */

const entity = (name) => {
  const table = TABLES[name];

  return {
    /* Paged read: { items, has_more, next_cursor }. */
    filter: async (query = {}, options = {}) => {
      const limit = limitOf(options.limit);
      const offset = offsetOf(options.cursor);
      let builder = supabase.from(table).select("*");
      builder = applyQuery(builder, query);
      builder = applySort(builder, options.sort);
      builder = builder.range(offset, offset + limit - 1);
      const { data, error } = await builder;
      if (error) throw dbError(error);
      return pageOf(data, offset, limit);
    },

    /* Unpaged read returning a plain array. `{ distinct }` returns the
       sorted unique values of one column. */
    list: async (options = {}) => {
      if (options.distinct) {
        const { data, error } = await supabase.rpc("distinct_values", {
          p_table: table,
          p_column: options.distinct,
        });
        if (error) throw dbError(error);
        return data || [];
      }
      let builder = supabase.from(table).select("*");
      builder = applyQuery(builder, options.query || {});
      builder = applySort(builder, options.sort);
      builder = builder.limit(limitOf(options.limit));
      const { data, error } = await builder;
      if (error) throw dbError(error);
      return data || [];
    },

    get: async (id) => {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw dbError(error);
      if (!data) throw new Error(`${name} not found`);
      return data;
    },

    count: async (query = {}) => {
      const builder = applyQuery(supabase.from(table).select("*", { count: "exact", head: true }), query);
      const { count, error } = await builder;
      if (error) throw dbError(error);
      return count || 0;
    },

    create: async (data) => {
      const { data: row, error } = await supabase.from(table).insert(data).select("*").single();
      if (error) throw dbError(error);
      return row;
    },

    update: async (id, data) => {
      const { data: row, error } = await supabase
        .from(table)
        .update(data)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw dbError(error);
      return row;
    },

    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw dbError(error);
      return { id };
    },

    bulkCreate: async (rows) => {
      if (!rows?.length) return [];
      const { data, error } = await supabase.from(table).insert(rows).select("*");
      if (error) throw dbError(error);
      return data || [];
    },

    /* Rows carry an `id` plus the fields to change; only those fields are
       written, so untouched columns keep their values. */
    bulkUpdate: async (rows) => {
      if (!rows?.length) return [];
      const { error } = await supabase.rpc("bulk_update", { p_table: table, p_rows: rows });
      if (error) throw dbError(error);
      return rows;
    },

    /* Group by one column with the max of another, e.g. the last contact
       per retailer: { rows: [{ retailer_id, max_occurred_at, count }] }. */
    aggregate: async ({ query = {}, groupBy, max = [] } = {}) => {
      const column = max[0];
      const { data, error } = await supabase.rpc("entity_aggregate", {
        p_table: table,
        p_group: groupBy,
        p_max: column,
      });
      if (error) throw dbError(error);
      return {
        rows: (data || []).map((row) => ({
          [groupBy]: row.group_value,
          [`max_${column}`]: row.max_value,
          count: Number(row.total) || 0,
        })),
      };
    },
  };
};

const entities = Object.keys(TABLES).reduce(
  (acc, name) => ({ ...acc, [name]: entity(name) }),
  {}
);

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

const authRequired = () => {
  const err = new Error("Authentication required");
  err.status = 401;
  return err;
};

const notRegistered = () => {
  const err = new Error("User not registered for this app");
  err.status = 403;
  err.data = { extra_data: { reason: "user_not_registered" } };
  return err;
};

/* A recovery link lands on /reset-password either with type=recovery in the
   query/fragment (implicit flow) or with a ?code= that the client exchanges
   for a session (PKCE flow). */
const recoveryLinkPresent = () => {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  if (url.searchParams.get("type") === "recovery" || hash.get("type") === "recovery") return true;
  return url.searchParams.has("code");
};

/* Resolves true as soon as a session exists, or false after `ms`. */
const sessionWithin = (ms) =>
  new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true);
    });
    unsubscribe = () => data?.subscription?.unsubscribe();

    timer = setTimeout(() => finish(false), ms);
    supabase.auth.getSession().then(({ data: result }) => {
      if (result.session) finish(true);
    });
  });

const auth = {
  isAuthenticated: async () => {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },

  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw authRequired();
    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw dbError(profileError);
    if (profile) return { ...profile, email: profile.email || user.email };

    /* No profile row yet (sign-up before the database trigger existed):
       create it so a signed-in account is always usable. */
    const metadata = user.user_metadata || {};
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        full_name: metadata.full_name || metadata.name || String(user.email || "").split("@")[0],
        role: "user",
      })
      .select("*")
      .single();
    if (insertError) throw notRegistered();
    return { ...created, email: created.email || user.email };
  },

  loginViaEmailPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  resetPasswordRequest: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  /* True only when the page was opened from a password-recovery email. */
  hasRecoverySession: async () => {
    if (!recoveryLinkPresent()) return false;
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    /* PKCE links carry ?code=…; give the client a moment to exchange it. */
    return sessionWithin(3000);
  },

  resetPassword: async ({ newPassword }) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    /* The recovery link is spent: sign out so the user logs in with the
       password they just chose. */
    await supabase.auth.signOut();
  },

  logout: async (redirectUrl) => {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin: (url) => {
    let returnTo = "/";
    try {
      const target = new URL(url || window.location.href, window.location.origin);
      returnTo = target.pathname + target.search;
    } catch {
      returnTo = "/";
    }
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  },
};

/* ------------------------------------------------------------------ *
 * Platform surface the app expects
 * ------------------------------------------------------------------ */

const users = {
  /* Accounts are created by administrators only. The `invite-user` edge
     function re-checks the caller's role server-side before it uses the
     service-role key, so nobody else can provision users. The admin sets the
     initial password and no invitation e-mail is sent. */
  createUser: async (email, password, role = "user", fullName = "") => {
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { email, password, role, fullName },
    });
    if (error) {
      throw new Error(
        "Could not reach the invite-user function. Deploy it before creating users (see README)."
      );
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },
};

const app = {
  getPublicSettings: async () => ({
    id: "ggm-retailer-hub",
    public_settings: {},
  }),
};

/* Uploads are renamed to a random UUID, so only a sanitised, allow-listed
   extension survives: nothing executable can be parked in the bucket. */
const ALLOWED_UPLOAD_EXTENSIONS = ["csv", "pdf", "png", "jpg", "jpeg", "webp", "txt"];

const integrations = {
  Core: {
    UploadFile: async ({ file } = {}) => {
      if (!file) return { file_url: "" };
      const raw = file.name?.includes(".") ? file.name.split(".").pop() : "";
      const extension = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
        throw new Error(`File type not allowed: .${extension || "unknown"}`);
      }
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("public").upload(path, file);
      if (error) throw dbError(error);
      const { data } = supabase.storage.from("public").getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
  },
};

/* Without Supabase env vars the app still renders against an empty, inert
   backend instead of crashing at start-up. */
const notConfigured = () =>
  new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

const inertEntity = {
  filter: async () => ({ items: [], has_more: false, next_cursor: null }),
  list: async () => [],
  get: async () => null,
  count: async () => 0,
  create: async () => ({}),
  update: async () => ({}),
  delete: async () => ({}),
  bulkCreate: async () => [],
  bulkUpdate: async () => [],
  aggregate: async () => ({ rows: [] }),
};

const inertDb = {
  auth: {
    isAuthenticated: async () => false,
    me: async () => null,
    loginViaEmailPassword: async () => {
      throw notConfigured();
    },
    resetPasswordRequest: async () => {
      throw notConfigured();
    },
    hasRecoverySession: async () => false,
    resetPassword: async () => {
      throw notConfigured();
    },
    logout: async () => undefined,
    redirectToLogin: () => undefined,
  },
  entities: new Proxy({}, { get: () => inertEntity }),
  users: {
    createUser: async () => {
      throw notConfigured();
    },
  },
  app,
  integrations: { Core: { UploadFile: async () => ({ file_url: "" }) } },
};

export const db = isSupabaseConfigured
  ? { auth, entities, users, app, integrations }
  : inertDb;
export default db;
