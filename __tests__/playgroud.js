import { test, expect } from "@jest/globals";

import { padding } from "../src/helper";

test("raw-test", async () => {
  expect(padding("abcc", 3, "0")).toBe("abcc");
  expect(padding("ab", 3, "0")).toBe("0ab");
  expect(padding("ab", 3)).toBe(" ab");
});
