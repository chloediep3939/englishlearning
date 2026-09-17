'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '@/lib/common/api-json';

interface Options<TData, TAnswer> {
  /** GET bốc đề, và cũng là URL POST nộp bài. */
  url: string;
  /** Số câu của đề đã tải. */
  count: (data: TData) => number;
  /** Payload POST từ các câu đã trả lời; `partial` = đóng giữa chừng. */
  buildPayload: (answers: TAnswer[], partial: boolean) => unknown;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Khung điều phối chung của mọi bài tự kiểm tra trên lộ trình:
 * bốc đề theo lượt, ghi câu trả lời (chống ghi đôi khi bấm nhanh), lưu kết
 * quả hoặc lưu bài dở, và đóng thì hỏi lưu nếu còn bài chưa lưu.
 *
 * Tách ra ở loại bài thứ ba (bộ từ, cặp từ, trọng âm) theo CLAUDE.md §2.1.
 */
export function useTestSession<TData, TAnswer>({ url, count, buildPayload, onClose, onSaved }: Options<TData, TAnswer>) {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<TAnswer[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Bài có âm thanh: đã bấm "Bắt đầu" trong lượt này chưa.
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setAnswers([]);
    setSaved(false);
    setSaveError(null);
    setStarted(false);
    apiJson<TData>(url)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Không tải được đề.'));
    return () => {
      alive = false;
    };
  }, [url, round]);

  const total = data ? count(data) : 0;
  const position = answers.length;
  const finished = data !== null && total > 0 && position >= total;

  /**
   * Chỉ ghi khi số câu đã trả lời vẫn bằng vị trí lúc render. Bấm phím hai lần
   * thật nhanh trong cùng một render sẽ gọi hai lần — lần hai phải bị bỏ, nếu
   * không một câu bị ghi đôi và cả bài lệch một nhịp.
   */
  const record = (answer: TAnswer) =>
    setAnswers((prev) => (prev.length === position ? [...prev, answer] : prev));

  const undo = () => setAnswers((prev) => prev.slice(0, -1));

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await apiJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(answers, !finished)),
      });
      setSaved(true);
      onSaved?.();
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Lưu không được.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [url, answers, finished, buildPayload, onSaved]);

  /** X / Esc: chưa làm gì hoặc đã lưu thì đóng luôn; còn lại hỏi. */
  const requestClose = useCallback(() => {
    if (answers.length === 0 || saved) onClose();
    else setConfirmOpen(true);
  }, [answers.length, saved, onClose]);

  const restart = () => {
    setConfirmOpen(false);
    setRound((r) => r + 1);
  };

  return {
    data,
    error,
    answers,
    total,
    position,
    finished,
    record,
    undo,
    saved,
    saving,
    saveError,
    save,
    confirmOpen,
    setConfirmOpen,
    requestClose,
    restart,
    started,
    setStarted,
  };
}
