// Shared helpers for all functions.
// Kept dependency-free (besides @netlify/blobs) on purpose so the project
// has exactly one npm dependency to install.

export const ADMIN_KEY = process.env.ADMIN_KEY || "changeme";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function isAdmin(req) {
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

// Netlify Blobs paginates list() results via a cursor. This walks every page
// so report generation doesn't silently drop data once a project has a lot
// of responses.
export async function listAllKeys(store, prefix) {
  let keys = [];
  let cursor;
  do {
    const res = await store.list({ prefix, cursor });
    keys = keys.concat(res.blobs.map((b) => b.key));
    cursor = res.cursor;
  } while (cursor);
  return keys;
}

// Fetches JSON values for a list of keys in small batches, instead of one
// giant Promise.all, to avoid overwhelming the Blobs API on large projects.
export async function getAllJSON(store, keys, batchSize = 40) {
  const out = [];
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const values = await Promise.all(
      batch.map((k) => store.get(k, { type: "json" }))
    );
    out.push(...values);
  }
  return out;
}
