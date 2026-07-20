import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger";

export interface RationEntry {
  record_id: string;
  date: string;
  meal_time: string;
  place_code: number;
  place_label: string;
  food_description: string;
  preparation_code: number;
  preparation_label: string;
  quantity: number;
  unit: string;
}

export interface CodifierEntry {
  code: string;
  name: string;
  section: string;
  subgroup: string;
  synonyms: string[];
  description: string;
  preparation: string;
  unit: string;
  keywords: string[];
}

export function getDataDirectory(): string {
  const configured = process.env["DATA_DIR"];
  if (configured) return resolve(configured);

  const candidates = [
    resolve(process.cwd(), "data"),
    resolve(process.cwd(), "../../data"),
    resolve(process.cwd(), "../../../data"),
  ];

  const found = candidates.find((candidate) =>
    existsSync(resolve(candidate, "ration_week.json")),
  );

  if (!found) {
    throw new Error(
      `Cannot locate data directory. Checked: ${candidates.join(", ")}. ` +
        "Set DATA_DIR to the folder containing ration_week.json.",
    );
  }

  return found;
}

function loadJson<T>(filename: string): T {
  const absPath = resolve(getDataDirectory(), filename);
  try {
    const raw = readFileSync(absPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error({ err, absPath }, "Failed to load JSON data file");
    throw new Error(`Cannot load data file at ${absPath}: ${String(err)}`);
  }
}

export const rationData = loadJson<RationEntry[]>("ration_week.json");
export const codifierData = loadJson<CodifierEntry[]>(
  "demo_food_codifier_1000.json",
);

logger.info(
  { rationCount: rationData.length, codifierCount: codifierData.length },
  "Data files loaded",
);
