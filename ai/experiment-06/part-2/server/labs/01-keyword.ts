// Attempt 1: rules on words. No AI, no key, no cost.
// Run: npm run lab:1

const RULES = [
  { intent: "reminder", words: ["yaad", "remind", "baje"] },
  { intent: "task", words: ["karna hai", "bhejna", "todo"] },
  { intent: "note", words: ["note"] },
];

function guessIntent(text: string) {
  const t = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => t.includes(w))) return rule.intent;
  }
  return "other";
}

// Each sentence with the answer a human would give.
const TESTS = [
  { text: "Kal subah 9 baje client ko call karna hai", expected: "reminder" },
  { text: "Note kar lo, gaadi B2 parking mein slot 45 par hai", expected: "note" },
  { text: "Mujhe yaad nahi ki meeting kab hai", expected: "question" },
  { text: "Rahul ko presentation bhejni hai", expected: "task" },
];

let score = 0;
for (const test of TESTS) {
  const got = guessIntent(test.text);
  const ok = got === test.expected;
  if (ok) score++;
  console.log(`${ok ? "✓" : "✗"} "${test.text}"`);
  console.log(`    got: ${got}${ok ? "" : `   (expected: ${test.expected})`}\n`);
}
console.log(`Score: ${score}/${TESTS.length}`);
