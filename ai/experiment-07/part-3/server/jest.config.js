// Jest + SWC: TypeScript ko bina type-check ke fast chalata hai. Type-check ke liye `npx tsc --noEmit`.
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.(t|j)sx?$": ["@swc/jest", { jsc: { target: "es2022" } }] },
  testMatch: ["<rootDir>/test/**/*.test.ts"],
};
