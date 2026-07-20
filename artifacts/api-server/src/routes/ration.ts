import { Router } from "express";
import { ConfirmRecordBody } from "@workspace/api-zod";
import { rationData, codifierData } from "../lib/data-loader";
import { findMatches } from "../lib/matcher";
import {
  deleteResult,
  getResult,
  listResults,
  patchResult,
  saveResult,
  type StoredCodificationResult,
} from "../lib/results-store";

const router = Router();

function mergeRecord(
  raw: (typeof rationData)[0],
  stored: StoredCodificationResult | undefined,
) {
  if (!stored) {
    return { ...raw, status: "pending", codification: null };
  }

  return {
    ...raw,
    status: stored.status,
    codification: {
      suggested_code: stored.suggested_code,
      suggested_name: stored.suggested_name,
      section: stored.section,
      subgroup: stored.subgroup,
      confidence: stored.confidence,
      confidence_label: stored.confidence_label,
      explanation: stored.explanation,
      candidates: stored.candidates_json,
      final_code: stored.final_code,
      final_name: stored.final_name,
      decision_source: stored.decision_source,
    },
  };
}

function buildSystemResult(record: (typeof rationData)[0]) {
  const match = findMatches(
    record.food_description,
    record.preparation_label,
    record.unit,
    codifierData,
  );
  const top = match.candidates[0];
  if (!top) return null;

  return {
    record_id: record.record_id,
    suggested_code: top.code,
    suggested_name: top.name,
    section: top.section,
    subgroup: top.subgroup,
    confidence: match.confidence,
    confidence_label: match.confidence_label,
    explanation: match.explanation,
    candidates_json: match.candidates,
    status: match.confidence >= 85 ? ("codified" as const) : ("needs_review" as const),
    final_code: null,
    final_name: null,
    decision_source: "system" as const,
  };
}

router.get("/", (_req, res) => {
  const resultMap = new Map(listResults().map((item) => [item.record_id, item]));
  res.json(rationData.map((record) => mergeRecord(record, resultMap.get(record.record_id))));
});

router.get("/stats", (_req, res) => {
  const results = listResults();
  const total = rationData.length;
  const processed = results.length;
  const confirmed = results.filter((item) => item.status === "confirmed").length;
  const needsReview = results.filter(
    (item) => item.status === "needs_review" || item.status === "sent_to_review",
  ).length;

  res.json({
    total,
    processed,
    confirmed,
    needs_review: needsReview,
    pending: total - processed,
    codifier_count: codifierData.length,
  });
});

router.post("/codify-all", (_req, res) => {
  for (const record of rationData) {
    if (getResult(record.record_id)) continue;
    const result = buildSystemResult(record);
    if (result) saveResult(result);
  }

  const resultMap = new Map(listResults().map((item) => [item.record_id, item]));
  res.json(rationData.map((record) => mergeRecord(record, resultMap.get(record.record_id))));
});

router.post("/:recordId/codify", (req, res) => {
  const record = rationData.find((item) => item.record_id === req.params.recordId);
  if (!record) return void res.status(404).json({ error: "Запись не найдена" });

  const result = buildSystemResult(record);
  if (!result) return void res.status(500).json({ error: "Совпадения не найдены" });

  res.json(mergeRecord(record, saveResult(result)));
});

router.post("/:recordId/confirm", (req, res) => {
  const record = rationData.find((item) => item.record_id === req.params.recordId);
  if (!record) return void res.status(404).json({ error: "Запись не найдена" });

  const parsed = ConfirmRecordBody.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: "Неверные данные запроса" });
  }

  const updated = patchResult(record.record_id, {
    status: "confirmed",
    final_code: parsed.data.code,
    final_name: parsed.data.name,
    decision_source: "specialist",
  });

  if (!updated) {
    return void res.status(404).json({ error: "Запись ещё не кодифицирована" });
  }

  res.json(mergeRecord(record, updated));
});

router.post("/:recordId/review", (req, res) => {
  const record = rationData.find((item) => item.record_id === req.params.recordId);
  if (!record) return void res.status(404).json({ error: "Запись не найдена" });

  const updated = patchResult(record.record_id, {
    status: "sent_to_review",
    decision_source: "specialist",
  });

  if (!updated) {
    return void res.status(404).json({ error: "Запись ещё не кодифицирована" });
  }

  res.json(mergeRecord(record, updated));
});

router.post("/:recordId/reset", (req, res) => {
  const record = rationData.find((item) => item.record_id === req.params.recordId);
  if (!record) return void res.status(404).json({ error: "Запись не найдена" });

  deleteResult(record.record_id);
  res.json(mergeRecord(record, undefined));
});

export default router;
