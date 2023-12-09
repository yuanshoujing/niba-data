import { test, expect } from "@jest/globals";

import { padding, pickFields } from "../src/helper";

test("raw-test", async () => {
  expect(padding("abcc", 3, "0")).toBe("abcc");
  expect(padding("ab", 3, "0")).toBe("0ab");
  expect(padding("ab", 3)).toBe(" ab");
});

test("pick-fields", () => {
  const selector = {
    name: "Paul",
    imdb: {
      rating: 8,
    },
    imdb1: {
      ra: {
        x: "156",
      },
    },
    "imdb2.rating": 8,
    year: {
      $gt: 2010,
    },
    imdb3: {
      rating: { $ne: 8 },
    },
    $and: [
      {
        director: {
          $eq: "Lars von Trier",
        },
      },
      {
        year1: {
          $in: [2003, 2004],
        },
      },
    ],
    $or: [{ director1: "George Lucas" }, { director2: "Steven Spielberg" }],
    $not: {
      year2: 1901,
    },
    $nor: [{ year3: 1901 }, { year4: 1905 }, { year5: 1907 }],
    genre: {
      $all: ["Comedy", "Short"],
    },
    genre1: {
      $elemMatch: {
        $eq: "Horror",
      },
    },
  };
  const result = [];
  pickFields(selector, result);
  console.log("--> result: %O", result);
});
