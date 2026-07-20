import { CodifierEntry } from "./data-loader";

/** Normalize Russian/Latin text to a word array for matching */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Normalize to a compact string for bigram matching */
function compact(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9]/g, "");
}

/** Jaccard similarity of two word arrays */
function wordJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Bigram (character-level) similarity */
function bigramSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  const bigramsB = new Set<string>();
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/** Score a single codifier entry against the query */
function scoreEntry(
  qWords: string[],
  qCompact: string,
  prepLabel: string,
  unit: string,
  entry: CodifierEntry
): number {
  // Name (40%)
  const nameWords = normalize(entry.name);
  const nameScore =
    wordJaccard(qWords, nameWords) * 0.5 +
    bigramSim(qCompact, compact(entry.name)) * 0.5;

  // Synonyms (25%) – take max across all synonyms
  const synScore =
    entry.synonyms.length === 0
      ? 0
      : Math.max(
          ...entry.synonyms.map((s) => {
            const sw = normalize(s);
            return wordJaccard(qWords, sw) * 0.5 + bigramSim(qCompact, compact(s)) * 0.5;
          })
        );

  // Keywords (20%)
  const kwWords = normalize(entry.keywords.join(" "));
  const kwScore = wordJaccard(qWords, kwWords);

  // Description (10%)
  const descWords = normalize(entry.description);
  const descScore = wordJaccard(qWords, descWords);

  // Section + subgroup (5%)
  const secWords = normalize(entry.section + " " + entry.subgroup);
  const secScore = wordJaccard(qWords, secWords);

  let total =
    nameScore * 0.4 +
    synScore * 0.25 +
    kwScore * 0.2 +
    descScore * 0.1 +
    secScore * 0.05;

  // Preparation bonus (+8%)
  if (prepLabel && entry.preparation) {
    const a = compact(prepLabel);
    const b = compact(entry.preparation);
    if (a && b && (a.includes(b) || b.includes(a) || bigramSim(a, b) > 0.55)) {
      total += 0.08;
    }
  }

  // Unit bonus (+4%)
  if (unit && entry.unit) {
    const a = compact(unit);
    const b = compact(entry.unit);
    if (a && b && a.includes(b)) {
      total += 0.04;
    }
  }

  return Math.min(1, total);
}

function buildExplanation(topName: string, topScore: number): string {
  if (topScore >= 0.8) {
    return `Высокое сходство с позицией «${topName}». Совпадают ключевые слова, ингредиенты и способ приготовления.`;
  } else if (topScore >= 0.6) {
    return `Частичное совпадение с позицией «${topName}». Рекомендуется проверка специалиста перед подтверждением.`;
  } else {
    return `Низкое сходство. Наиболее близкая позиция — «${topName}», однако совпадение неточное. Требуется ручная кодификация.`;
  }
}

export interface MatchCandidate {
  code: string;
  name: string;
  section: string;
  subgroup: string;
  score: number;
}

export interface MatchResult {
  candidates: MatchCandidate[];
  confidence: number;
  confidence_label: string;
  explanation: string;
}

export function findMatches(
  foodDescription: string,
  preparationLabel: string,
  unit: string,
  codifier: CodifierEntry[]
): MatchResult {
  const qWords = normalize(foodDescription);
  const qCompact = compact(foodDescription);

  const scored = codifier.map((entry) => ({
    entry,
    score: scoreEntry(qWords, qCompact, preparationLabel, unit, entry),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top5 = scored.slice(0, 5);

  const candidates: MatchCandidate[] = top5.map(({ entry, score }) => ({
    code: entry.code,
    name: entry.name,
    section: entry.section,
    subgroup: entry.subgroup,
    score: Math.round(score * 100),
  }));

  const topScore = top5[0]?.score ?? 0;
  const secondScore = top5[1]?.score ?? 0;
  const gap = topScore - secondScore;

  // Heuristic confidence: top score (80%) + distinctiveness gap (20%)
  const confidence = Math.min(100, Math.round(topScore * 80 + gap * 20));

  let confidence_label: string;
  if (confidence >= 85) {
    confidence_label = "Высокая уверенность";
  } else if (confidence >= 60) {
    confidence_label = "Требуется проверка";
  } else {
    confidence_label = "Код не определён";
  }

  const explanation = top5[0]
    ? buildExplanation(top5[0].entry.name, topScore)
    : "Не удалось найти подходящие позиции.";

  return { candidates, confidence, confidence_label, explanation };
}
