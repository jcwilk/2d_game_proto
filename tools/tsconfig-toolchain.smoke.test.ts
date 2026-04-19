import { expect, test } from 'vitest';

// Ensures Vitest discovers tools/*.test.ts alongside .mjs tests (2gp-y4cn removes .mjs glob when unused).
test('tools TypeScript test glob is wired', () => {
  expect(true).toBe(true);
});
