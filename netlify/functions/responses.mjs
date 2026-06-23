import { getStore } from "@netlify/blobs";
import { json, isAdmin, listAllKeys, getAllJSON } from "./lib/shared.mjs";

const VALID_SWIPES = new Set(["left", "right", "timeout"]);
const VALID_METRICS = new Set(["purchase_intent", "uniqueness"]);

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("responses");

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const { projectId, sessionId, conceptId, metric, swipe } = body;
    const timeMs = Number(body.timeMs) || 0;

    if (!projectId || !sessionId || !conceptId) {
      return json({ error: "projectId, sessionId, and conceptId are required" }, 400);
    }
    if (!VALID_METRICS.has(metric)) {
      return json({ error: "metric must be purchase_intent or uniqueness" }, 400);
    }
    if (!VALID_SWIPES.has(swipe)) {
      return json({ error: "swipe must be left, right, or timeout" }, 400);
    }

    // Each (project, respondent, concept, metric) combo gets its own unique
    // key, written once. That means concurrent submissions from hundreds of
    // respondents never read-modify-write the same object, so nobody's data
    // can clobber anybody else's.
    const key = `${projectId}__${sessionId}__${conceptId}__${metric}`;

    await store.setJSON(key, {
      projectId,
      sessionId,
      conceptId,
      metric,
      swipe,
      timeMs,
      submittedAt: Date.now(),
    });

    return json({ ok: true }, 201);
  }

  if (req.method === "GET") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);

    const projectId = url.searchParams.get("projectId");
    if (!projectId) return json({ error: "projectId is required" }, 400);

    const keys = await listAllKeys(store, `${projectId}__`);
    const records = await getAllJSON(store, keys);
    return json(records);
  }

  return json({ error: "Method not allowed" }, 405);
};
