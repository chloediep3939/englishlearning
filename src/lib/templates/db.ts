import { getDb } from '@/lib/db';
import type {
  PteTemplate,
  PteTemplateRow,
  PteTemplateFill,
  PteTemplateFillRow,
} from '@/lib/types';

function hydrateFill(row: PteTemplateFillRow): PteTemplateFill {
  let slot_values: Record<string, string> | null = null;
  if (row.slot_values_json) {
    try {
      const parsed = JSON.parse(row.slot_values_json) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        slot_values = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === 'string') slot_values[k] = v;
        }
      }
    } catch {
      // Malformed row — treat as pasted-whole (filled_text still works).
      slot_values = null;
    }
  }
  return {
    id: row.id,
    user_id: row.user_id,
    template_id: row.template_id,
    topic: row.topic,
    slot_values,
    filled_text: row.filled_text,
    created_at: row.created_at,
  };
}

export const pteTemplatesDb = {
  async create(
    userId: number,
    data: { title: string; frame_text: string },
  ): Promise<PteTemplate> {
    const db = await getDb();
    const result = await db
      .prepare(`INSERT INTO pte_templates (user_id, title, frame_text) VALUES (?, ?, ?)`)
      .bind(userId, data.title, data.frame_text)
      .run();
    const id = Number(result.meta.last_row_id);
    const created = await pteTemplatesDb.getById(userId, id);
    if (!created) throw new Error('Failed to retrieve created template');
    return created;
  },

  async getById(userId: number, id: number): Promise<PteTemplate | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT * FROM pte_templates WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first<PteTemplateRow>();
    return row ?? null;
  },

  async listByUser(userId: number): Promise<PteTemplate[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT t.*, COUNT(f.id) AS fill_count
         FROM pte_templates t
         LEFT JOIN pte_template_fills f ON f.template_id = t.id AND f.user_id = t.user_id
         WHERE t.user_id = ?
         GROUP BY t.id
         ORDER BY t.created_at DESC`,
      )
      .bind(userId)
      .all<PteTemplateRow>();
    return result.results ?? [];
  },

  async update(
    userId: number,
    id: number,
    fields: Partial<{ title: string; frame_text: string }>,
  ): Promise<PteTemplate | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.title !== undefined)      { sets.push('title = ?');      values.push(fields.title); }
    if (fields.frame_text !== undefined) { sets.push('frame_text = ?'); values.push(fields.frame_text); }
    if (sets.length === 0) return pteTemplatesDb.getById(userId, id);

    values.push(id, userId);
    const db = await getDb();
    await db
      .prepare(`UPDATE pte_templates SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
    return pteTemplatesDb.getById(userId, id);
  },

  async deleteById(userId: number, id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .prepare(`DELETE FROM pte_templates WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  },
};

export const pteTemplateFillsDb = {
  async create(
    userId: number,
    templateId: number,
    data: {
      topic: string;
      slot_values: Record<string, string> | null;
      filled_text: string;
    },
  ): Promise<PteTemplateFill> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO pte_template_fills (user_id, template_id, topic, slot_values_json, filled_text)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        templateId,
        data.topic,
        data.slot_values ? JSON.stringify(data.slot_values) : null,
        data.filled_text,
      )
      .run();
    const id = Number(result.meta.last_row_id);
    const created = await pteTemplateFillsDb.getById(userId, id);
    if (!created) throw new Error('Failed to retrieve created fill');
    return created;
  },

  async getById(userId: number, id: number): Promise<PteTemplateFill | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT * FROM pte_template_fills WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first<PteTemplateFillRow>();
    return row ? hydrateFill(row) : null;
  },

  /**
   * Partial update. `slot_values` and `filled_text` travel together from the
   * route (it re-assembles filled_text whenever slot_values change) so the
   * stored pair stays consistent.
   */
  async update(
    userId: number,
    id: number,
    fields: Partial<{
      topic: string;
      slot_values: Record<string, string> | null;
      filled_text: string;
    }>,
  ): Promise<PteTemplateFill | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.topic !== undefined)       { sets.push('topic = ?');            values.push(fields.topic); }
    if (fields.slot_values !== undefined) { sets.push('slot_values_json = ?');
                                            values.push(fields.slot_values ? JSON.stringify(fields.slot_values) : null); }
    if (fields.filled_text !== undefined) { sets.push('filled_text = ?');      values.push(fields.filled_text); }
    if (sets.length === 0) return pteTemplateFillsDb.getById(userId, id);

    values.push(id, userId);
    const db = await getDb();
    await db
      .prepare(`UPDATE pte_template_fills SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
    return pteTemplateFillsDb.getById(userId, id);
  },

  async listByTemplate(userId: number, templateId: number): Promise<PteTemplateFill[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM pte_template_fills
         WHERE user_id = ? AND template_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(userId, templateId)
      .all<PteTemplateFillRow>();
    return (result.results ?? []).map(hydrateFill);
  },

  async deleteById(userId: number, id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .prepare(`DELETE FROM pte_template_fills WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  },
};
