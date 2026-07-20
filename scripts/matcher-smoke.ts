import { codifierData, rationData } from "../artifacts/api-server/src/lib/data-loader";
import { findMatches } from "../artifacts/api-server/src/lib/matcher";

let high = 0;
let review = 0;
let unresolved = 0;

for (const record of rationData) {
  const result = findMatches(
    record.food_description,
    record.preparation_label,
    record.unit,
    codifierData,
  );

  if (result.candidates.length === 0) {
    throw new Error(`No candidates returned for ${record.record_id}`);
  }

  if (result.confidence < 0 || result.confidence > 100) {
    throw new Error(`Invalid confidence for ${record.record_id}: ${result.confidence}`);
  }

  if (result.confidence >= 85) high += 1;
  else if (result.confidence >= 60) review += 1;
  else unresolved += 1;
}

console.log(
  `Matcher smoke test passed for ${rationData.length} records: ` +
    `${high} high-confidence, ${review} review, ${unresolved} unresolved.`,
);
