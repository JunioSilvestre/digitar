import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import type { TocDocument } from "./toc";

export const saveDocument = createServerFn({ method: "POST" })
  .validator((doc: TocDocument) => doc)
  .handler(async ({ data }) => {
    const sql = await getSql();
    // Use the id "default" as we are storing a single document for now
    await sql`
      INSERT INTO documents (id, title, data, updated_at)
      VALUES ('default', ${data.title}, ${JSON.stringify(data.items)}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        data = EXCLUDED.data,
        updated_at = NOW();
    `;
    return { ok: true };
  });

export const loadDocument = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<{ title: string; data: any }>`
      SELECT title, data FROM documents WHERE id = 'default'
    `;
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      title: row.title,
      items: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
      selectedId: null,
    } as TocDocument;
  });
