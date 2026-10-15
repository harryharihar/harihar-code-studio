import { SearchResult } from "./search";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "to", "of",
  "in", "on", "for", "and", "or", "it", "you", "your", "our", "can",
  "do", "does", "will", "if", "this", "that", "i", "we", "they",
  "he", "she", "as", "at", "by", "with", "not", "have", "has", "had",
  "from", "but", "so", "please", "source", "sources",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function computeGroundedness(
  answer: string,
  sources: Pick<SearchResult, "content">[],
): number {
  const answerWords = tokenize(answer);

  if (answerWords.length === 0) {
    return 0;
  }

  const sourceWords = new Set(
    sources.flatMap((source) => tokenize(source.content)),
  );

  const supported = answerWords.filter((word) =>
    sourceWords.has(word),
  ).length;

  return (
    Math.round((supported / answerWords.length) * 100) / 100
  );
}
