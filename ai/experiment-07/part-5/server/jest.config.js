// Jest + SWC: TypeScript ko bina type-check ke fast chalata hai. Type-check ke liye `npx tsc --noEmit`.
module.exports = {
  testEnvironment: "node",
  testTimeout: 30000, // PGlite (a real Postgres inside the tests) can take a few seconds to start
  transform: { "^.+\\.(t|j)sx?$": ["@swc/jest", { jsc: { target: "es2022" } }] },
  testMatch: ["<rootDir>/test/**/*.test.ts"],
};
