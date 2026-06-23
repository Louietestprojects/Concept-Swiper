import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { json, isAdmin, listAllKeys, getAllJSON } from "./lib/shared.mjs";

export default async (req) => {
  const store = getStore("projects");
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id");

    if (id) {
      const project = await store.get(id, { type: "json" });
      if (!project) return json({ error: "Project not found" }, 404);
      return json(project);
    }

    const keys = await listAllKeys(store);
    const projects = await getAllJSON(store, keys);
    projects.sort((a, b) => b.createdAt - a.createdAt);
    return json(projects);
  }

  if (req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const name = (body.name || "").trim();
    if (!name) return json({ error: "Project name is required" }, 400);

    const timerSeconds = Math.min(30, Math.max(1, Number(body.timerSeconds) || 6));

    const project = {
      id: randomUUID(),
      name,
      timerSeconds,
      createdAt: Date.now(),
    };

    await store.setJSON(project.id, project);
    return json(project, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};
