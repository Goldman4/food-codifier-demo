import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MatchCandidate } from "./matcher";
import { getDataDirectory } from "./data-loader";
import { logger } from "./logger";

export type ResultStatus =
  | "codified"
  | "needs_review"
  | "confirmed"
  | "sent_to_review";

export type DecisionSource = "system" | "specialist";

export interface StoredCodificationResult {
  record_id: string;
  suggested_code: string;
  suggested_name: string;
  section: string;
  subgroup: string;
  confidence: number;
  confidence_label: string;
  explanation: string;
  candidates_json: MatchCandidate[];
  status: ResultStatus;
  final_code: string | null;
  final_name: string | null;
  decision_source: DecisionSource;
  created_at: string;
  updated_at: string;
}

const resultsPath = resolve(getDataDirectory(), "codification_results.local.json");
const results = new Map<string, StoredCodificationResult>();

function loadResults(): void {
  if (!existsSync(resultsPath)) return;

  try {
    const parsed = JSON.parse(readFileSync(resultsPath, "utf-8")) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Expected an array of stored results");
    }

    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as StoredCodificationResult).record_id === "string"
      ) {
        const result = item as StoredCodificationResult;
        results.set(result.record_id, result);
      }
    }

    logger.info({ resultCount: results.size, resultsPath }, "Local results loaded");
  } catch (err) {
    logger.warn({ err, resultsPath }, "Failed to load local results; starting empty");
  }
}

function persistResults(): void {
  mkdirSync(dirname(resultsPath), { recursive: true });
  const serialized = JSON.stringify([...results.values()], null, 2);
  writeFileSync(resultsPath, `${serialized}\n`, "utf-8");
}

loadResults();

export function listResults(): StoredCodificationResult[] {
  return [...results.values()];
}

export function getResult(recordId: string): StoredCodificationResult | undefined {
  return results.get(recordId);
}

export function saveResult(
  value: Omit<StoredCodificationResult, "created_at" | "updated_at">,
): StoredCodificationResult {
  const previous = results.get(value.record_id);
  const now = new Date().toISOString();
  const stored: StoredCodificationResult = {
    ...value,
    created_at: previous?.created_at ?? now,
    updated_at: now,
  };
  results.set(stored.record_id, stored);
  persistResults();
  return stored;
}

export function patchResult(
  recordId: string,
  patch: Partial<Omit<StoredCodificationResult, "record_id" | "created_at">>,
): StoredCodificationResult | undefined {
  const previous = results.get(recordId);
  if (!previous) return undefined;

  const updated: StoredCodificationResult = {
    ...previous,
    ...patch,
    record_id: recordId,
    created_at: previous.created_at,
    updated_at: new Date().toISOString(),
  };
  results.set(recordId, updated);
  persistResults();
  return updated;
}

export function deleteResult(recordId: string): void {
  results.delete(recordId);
  persistResults();
}
