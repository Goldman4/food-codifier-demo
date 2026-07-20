import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = resolve(import.meta.dirname, "..");
const rationPath = resolve(root, "data/ration_week.json");
const codifierPath = resolve(root, "data/demo_food_codifier_1000.json");

const ration = loadJson(rationPath);
const codifier = loadJson(codifierPath);

assert(Array.isArray(ration), "ration_week.json must contain an array");
assert(Array.isArray(codifier), "demo_food_codifier_1000.json must contain an array");
assert(ration.length > 0, "Ration dataset is empty");
assert(codifier.length > 0, "Codifier dataset is empty");

const rationFields = [
  "record_id",
  "date",
  "meal_time",
  "place_label",
  "food_description",
  "preparation_label",
  "quantity",
  "unit",
];
const codifierFields = [
  "code",
  "name",
  "section",
  "subgroup",
  "synonyms",
  "description",
  "preparation",
  "unit",
  "keywords",
];

for (const [index, item] of ration.entries()) {
  for (const field of rationFields) {
    assert(field in item, `Ration record ${index} is missing field ${field}`);
  }
}

for (const [index, item] of codifier.entries()) {
  for (const field of codifierFields) {
    assert(field in item, `Codifier item ${index} is missing field ${field}`);
  }
  assert(Array.isArray(item.synonyms), `Codifier item ${index}: synonyms must be an array`);
  assert(Array.isArray(item.keywords), `Codifier item ${index}: keywords must be an array`);
}

const recordIds = new Set(ration.map((item) => item.record_id));
const codes = new Set(codifier.map((item) => item.code));
assert(recordIds.size === ration.length, "Duplicate record_id values found");
assert(codes.size === codifier.length, "Duplicate codifier codes found");

console.log(`Data validation passed: ${ration.length} ration records, ${codifier.length} codifier entries.`);
