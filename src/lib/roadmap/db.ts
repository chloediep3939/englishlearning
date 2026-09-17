import { getDb } from '@/lib/db';
import {
  ROADMAP_RETEST_DAYS,
  type RoadmapItem,
  type RoadmapItemWithProgress,
  type RoadmapPassDir,
  type RoadmapSkill,
  type RoadmapSkillSummary,
  type RoadmapStatus,
  type RoadmapLatestRun,
  type RoadmapTestRun,
  type RoadmapTestSource,
  type RoadmapTool,
} from '@/lib/types';
import { judgeScore } from './threshold';

// roadmap_items / roadmap_skills / roadmap_tools là nội dung tham chiếu dùng
// chung (không có user_id). Chỉ roadmap_progress là dữ liệu của user và mọi
// truy vấn vào nó đều lọc theo user_id.

// Tham số cho datetime('now', ?) — bind thay vì nối chuỗi vào SQL.
const RETEST_OFFSET = `-${ROADMAP_RETEST_DAYS} days`;

// Row thô: các cột ngưỡng đọc ra là string/number chưa thu hẹp kiểu, nên
// khai lại lỏng hơn RoadmapItem rồi hydrate mới ép kiểu.
interface ItemRow extends Omit<RoadmapItem, 'pass_dir' | 'pass_unit'> {
  pass_dir: string | null;
  pass_unit: string | null;
  status: string | null;
  note: string | null;
  tested_at: string | null;
  stale: number | null;
}

function hydrateItem(row: ItemRow): RoadmapItemWithProgress {
  const status: RoadmapStatus =
    row.status === 'pass' || row.status === 'fail' ? row.status : 'untested';
  return {
    item_key: row.item_key,
    skill_code: row.skill_code,
    group_name: row.group_name,
    label: row.label,
    how_to_test: row.how_to_test,
    pass_when: row.pass_when,
    position: row.position,
    pass_dir: row.pass_dir === 'gte' || row.pass_dir === 'lte' ? row.pass_dir : null,
    pass_value: row.pass_value,
    pass_total: row.pass_total,
    pass_unit: row.pass_unit === 'count' || row.pass_unit === 'percent' ? row.pass_unit : null,
    status,
    note: row.note,
    tested_at: status === 'untested' ? null : row.tested_at,
    needs_retest: status === 'pass' && row.stale === 1,
  };
}

export const roadmapDb = {
  async listSkills(): Promise<RoadmapSkill[]> {
    const db = await getDb();
    const result = await db
      .prepare(`SELECT code, label, note, position FROM roadmap_skills ORDER BY position`)
      .all<RoadmapSkill>();
    return result.results ?? [];
  },

  async listTools(): Promise<RoadmapTool[]> {
    const db = await getDb();
    const result = await db
      .prepare(`SELECT task, tool, note FROM roadmap_tools ORDER BY position`)
      .all<RoadmapTool>();
    return result.results ?? [];
  },

  /**
   * Mọi mục của một kỹ năng (hoặc của tất cả kỹ năng khi skillCode = null),
   * kèm tiến độ của user. Mục chưa test không có row progress → 'untested'.
   */
  async listItems(userId: number, skillCode: string | null = null): Promise<RoadmapItemWithProgress[]> {
    const db = await getDb();
    const sql = `
      SELECT i.item_key, i.skill_code, i.group_name, i.label, i.how_to_test,
             i.pass_when, i.position,
             i.pass_dir, i.pass_value, i.pass_total, i.pass_unit,
             p.status, p.note, p.tested_at,
             CASE WHEN p.tested_at IS NOT NULL
                       AND p.tested_at <= datetime('now', ?)
                  THEN 1 ELSE 0 END AS stale
      FROM roadmap_items i
      LEFT JOIN roadmap_progress p
        ON p.item_key = i.item_key AND p.user_id = ?
      ${skillCode ? 'WHERE i.skill_code = ?' : ''}
      ORDER BY i.position
    `;
    const stmt = skillCode
      ? db.prepare(sql).bind(RETEST_OFFSET, userId, skillCode)
      : db.prepare(sql).bind(RETEST_OFFSET, userId);
    const result = await stmt.all<ItemRow>();
    return (result.results ?? []).map(hydrateItem);
  },

  /** Đếm theo kỹ năng cho trang tổng và ô tóm tắt ở /dashboard. */
  async getSummary(userId: number): Promise<RoadmapSkillSummary[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT s.code, s.label, s.note, s.position,
                COUNT(i.item_key) AS total,
                SUM(CASE WHEN p.status = 'pass' THEN 1 ELSE 0 END) AS pass,
                SUM(CASE WHEN p.status = 'fail' THEN 1 ELSE 0 END) AS fail,
                SUM(CASE WHEN p.status = 'pass'
                          AND p.tested_at <= datetime('now', ?)
                         THEN 1 ELSE 0 END) AS needs_retest
         FROM roadmap_skills s
         JOIN roadmap_items i ON i.skill_code = s.code
         LEFT JOIN roadmap_progress p
           ON p.item_key = i.item_key AND p.user_id = ?
         GROUP BY s.code
         ORDER BY s.position`,
      )
      .bind(RETEST_OFFSET, userId)
      .all<{
        code: string;
        label: string;
        note: string | null;
        position: number;
        total: number;
        pass: number;
        fail: number;
        needs_retest: number;
      }>();

    return (result.results ?? []).map((r) => {
      const total = Number(r.total) || 0;
      const pass = Number(r.pass) || 0;
      const fail = Number(r.fail) || 0;
      return {
        code: r.code,
        label: r.label,
        note: r.note,
        position: r.position,
        total,
        pass,
        fail,
        untested: total - pass - fail,
        needs_retest: Number(r.needs_retest) || 0,
      };
    });
  },

  /**
   * Chỉ phần ngưỡng của một mục. Công cụ tự động cần biết hướng ngưỡng để
   * quyết định nộp con số nào: mục 'gte' nộp số câu ĐÚNG, mục 'lte' nộp số
   * LỖI. Nộp nhầm chiều là chấm ngược hoàn toàn.
   */
  async getThreshold(itemKey: string): Promise<{
    pass_dir: RoadmapPassDir | null;
    pass_value: number | null;
    pass_total: number | null;
  } | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT pass_dir, pass_value, pass_total FROM roadmap_items WHERE item_key = ?`)
      .bind(itemKey)
      .first<{ pass_dir: string | null; pass_value: number | null; pass_total: number | null }>();
    if (!row) return null;
    return {
      pass_dir: row.pass_dir === 'gte' || row.pass_dir === 'lte' ? row.pass_dir : null,
      pass_value: row.pass_value,
      pass_total: row.pass_total,
    };
  },

  /**
   * Mục nào đã có bài làm được trong app, và dùng công cụ nào ('T1', 'T8'…).
   * UI dựa vào đây để hiện nút "Làm bài" và mở đúng loại bài.
   */
  async listItemTests(): Promise<Record<string, string>> {
    const db = await getDb();
    const result = await db
      .prepare(`SELECT item_key, tool FROM roadmap_item_tests`)
      .all<{ item_key: string; tool: string }>();
    const out: Record<string, string> = {};
    for (const r of result.results ?? []) out[r.item_key] = r.tool;
    return out;
  },

  async itemExists(itemKey: string): Promise<boolean> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT 1 AS n FROM roadmap_items WHERE item_key = ?`)
      .bind(itemKey)
      .first<{ n: number }>();
    return row !== null;
  },

  /**
   * Ghi trạng thái + ghi chú cho một mục.
   * status 'untested' = xoá row (quay về mặc định "chưa test").
   * tested_at chỉ đổi khi status đổi hoặc khi lần đầu ghi — sửa mỗi ghi chú
   * thì không tính là test lại.
   */
  async setProgress(
    userId: number,
    itemKey: string,
    input: { status: RoadmapStatus; note: string | null },
  ): Promise<void> {
    const db = await getDb();

    if (input.status === 'untested') {
      await db
        .prepare(`DELETE FROM roadmap_progress WHERE user_id = ? AND item_key = ?`)
        .bind(userId, itemKey)
        .run();
      return;
    }

    await db
      .prepare(
        `INSERT INTO roadmap_progress (user_id, item_key, status, note, tested_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, item_key) DO UPDATE SET
           status = excluded.status,
           note = excluded.note,
           tested_at = CASE WHEN roadmap_progress.status = excluded.status
                            THEN roadmap_progress.tested_at
                            ELSE excluded.tested_at END,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(userId, itemKey, input.status, input.note)
      .run();
  },
};

// ============================================================================
// Lịch sử tự kiểm tra. Mỗi lần làm bài (tự nhập điểm, hoặc sau này là công cụ
// T1…T8) ghi một dòng, và nếu mục có ngưỡng số thì cập nhật luôn ✓/✗.
// ============================================================================

interface TestRunRow {
  id: number;
  user_id: number;
  item_key: string;
  source: string;
  score: number;
  total: number | null;
  passed: number;
  completed: number;
  note: string | null;
  created_at: string;
}

function hydrateRun(row: TestRunRow): RoadmapTestRun {
  return {
    id: row.id,
    user_id: row.user_id,
    item_key: row.item_key,
    source: row.source as RoadmapTestSource,
    score: row.score,
    total: row.total,
    passed: row.passed === 1,
    completed: row.completed !== 0,
    note: row.note,
    created_at: row.created_at,
  };
}

export const roadmapTestRunsDb = {
  /**
   * Ghi một lần tự kiểm tra và tự đánh dấu ✓/✗ cho mục đó.
   *
   * Mục không có ngưỡng số (4 mục ngưỡng thuần chữ) vẫn ghi được lịch sử,
   * nhưng KHÔNG tự đánh dấu — trả về `judged: false` để UI nói rõ với user là
   * họ phải tự bấm ✓/✗, thay vì im lặng bỏ qua.
   */
  async record(
    userId: number,
    itemKey: string,
    input: {
      source: RoadmapTestSource;
      score: number;
      note: string | null;
      /**
       * Mặc định true. false = user đóng popup giữa chừng và chọn lưu: ghi
       * lịch sử nhưng KHÔNG chấm, không đụng roadmap_progress.
       */
      completed?: boolean;
      /** Tổng số câu thật đã làm — bài dở dùng số này thay vì pass_total. */
      totalOverride?: number;
      /** Chi tiết tuỳ công cụ (vd điểm từng nhóm âm), lưu vào detail_json. */
      detail?: unknown;
    },
  ): Promise<{ run: RoadmapTestRun; judged: boolean; passed: boolean | null }> {
    const completed = input.completed !== false;
    const db = await getDb();

    const item = await db
      .prepare(
        `SELECT pass_dir, pass_value, pass_total, pass_unit
         FROM roadmap_items WHERE item_key = ?`,
      )
      .bind(itemKey)
      .first<{
        pass_dir: string | null;
        pass_value: number | null;
        pass_total: number | null;
        pass_unit: string | null;
      }>();
    if (!item) throw new Error(`Unknown roadmap item: ${itemKey}`);

    const judged = completed
      ? judgeScore(
      {
        pass_dir: item.pass_dir === 'gte' || item.pass_dir === 'lte' ? item.pass_dir : null,
        pass_value: item.pass_value,
        pass_total: item.pass_total,
        pass_unit: item.pass_unit === 'count' || item.pass_unit === 'percent' ? item.pass_unit : null,
      },
      input.score,
    )
      : null;
    const passed = judged;

    const result = await db
      .prepare(
        `INSERT INTO roadmap_test_runs (user_id, item_key, source, score, total, passed, completed, note, detail_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        itemKey,
        input.source,
        input.score,
        input.totalOverride ?? item.pass_total,
        passed === true ? 1 : 0,
        completed ? 1 : 0,
        input.note,
        input.detail === undefined ? null : JSON.stringify(input.detail),
      )
      .run();

    const run = await db
      .prepare(`SELECT * FROM roadmap_test_runs WHERE id = ?`)
      .bind(Number(result.meta.last_row_id))
      .first<TestRunRow>();
    if (!run) throw new Error('Failed to read back the test run just written');

    // Chỉ tự đánh dấu khi thật sự chấm được.
    if (passed !== null) {
      const stamp = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const scoreText = item.pass_total !== null ? `${input.score}/${item.pass_total}` : `${input.score}`;
      const auto = `Tự kiểm ${scoreText} · ${stamp}`;
      await roadmapDb.setProgress(userId, itemKey, {
        status: passed ? 'pass' : 'fail',
        note: input.note ? `${auto} — ${input.note}` : auto,
      });
    }

    return { run: hydrateRun(run), judged: passed !== null, passed };
  },

  async listByItem(userId: number, itemKey: string, limit = 10): Promise<RoadmapTestRun[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM roadmap_test_runs
         WHERE user_id = ? AND item_key = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .bind(userId, itemKey, limit)
      .all<TestRunRow>();
    return (result.results ?? []).map(hydrateRun);
  },

  /**
   * Lần tự kiểm gần nhất của mỗi mục — để hàng trong danh sách hiện luôn
   * "✓ 48/50" thay vì chỉ một dấu tích trơn.
   */
  async latestByItem(userId: number): Promise<Record<string, RoadmapLatestRun>> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT r.item_key, r.score, r.total, r.passed, r.created_at
         FROM roadmap_test_runs r
         WHERE r.user_id = ?
           AND r.id = (SELECT r2.id FROM roadmap_test_runs r2
                       WHERE r2.user_id = r.user_id AND r2.item_key = r.item_key
                         AND r2.completed = 1
                       ORDER BY r2.created_at DESC, r2.id DESC LIMIT 1)`,
      )
      .bind(userId)
      .all<{ item_key: string; score: number; total: number | null; passed: number; created_at: string }>();
    const out: Record<string, RoadmapLatestRun> = {};
    for (const r of result.results ?? []) {
      out[r.item_key] = {
        score: r.score,
        total: r.total,
        passed: r.passed === 1,
        created_at: r.created_at,
      };
    }
    return out;
  },

  /** Đếm số lần đã tự kiểm theo mục — dùng cho badge trên danh sách. */
  async countsByItem(userId: number): Promise<Record<string, number>> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT item_key, COUNT(*) AS n FROM roadmap_test_runs
         WHERE user_id = ? GROUP BY item_key`,
      )
      .bind(userId)
      .all<{ item_key: string; n: number }>();
    const out: Record<string, number> = {};
    for (const r of result.results ?? []) out[r.item_key] = Number(r.n) || 0;
    return out;
  },
};
