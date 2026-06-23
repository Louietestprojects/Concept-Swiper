import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, isAdmin, listAllKeys, getAllJSON } from "./lib/shared.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const metaStore = getStore("concepts");
  const imageStore = getStore("concept-images");

  if (req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return json({ error: "projectId is required" }, 400);

    const keys = await listAllKeys(metaStore, `${projectId}__`);
    const concepts = await getAllJSON(metaStore, keys);
    concepts.sort((a, b) => a.order - b.order);

    const withUrls = concepts.map((c) => ({
      ...c,
      imageUrl: `/api/image?id=${c.id}`,
    }));
    return json(withUrls);
  }

  if (req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { projectId, name, imageBase64 } = body;

    if (!projectId || !imageBase64) {
      return json({ error: "projectId and imageBase64 are required" }, 400);
    }

    const id = randomUUID();
    const cleanBase64 = String(imageBase64).replace(/^data:image\/\w+;base64,/, "");
    const bytes = Buffer.from(cleanBase64, "base64");

    if (bytes.length > 4_000_000) {
      return json({ error: "Image is too large (keep PNGs under ~4MB)" }, 413);
    }

    await imageStore.set(id, bytes);

    const existingKeys = await listAllKeys(metaStore, `${projectId}__`);

    const concept = {
      id,
      projectId,
      name: (name || "").trim() || `Concept ${existingKeys.length + 1}`,
      order: existingKeys.length,
      createdAt: Date.now(),
    };

    await metaStore.setJSON(`${projectId}__${id}`, concept);
    return json({ ...concept, imageUrl: `/api/image?id=${id}` }, 201);
  }

  if (req.method === "DELETE") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);

    const id = url.searchParams.get("id");
    const projectId = url.searchParams.get("projectId");
    if (!id || !projectId) {
      return json({ error: "id and projectId are required" }, 400);
    }

    await metaStore.delete(`${projectId}__${id}`);
    await imageStore.delete(id);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};
