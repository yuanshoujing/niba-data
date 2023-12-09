import { watch } from "rollup";

export function padding(str, width, c = " ") {
  return str.length < width ? c.repeat(width - str.length) + str : str;
}

export function pickFields(selector = {}, result = [], parentKey = "") {
  for (const [k, v] of Object.entries(selector)) {
    if (["$and", "$or", "$nor"].includes(k)) {
      for (const o of v) {
        pickFields(o, result);
      }
    } else if (["$not"].includes(k)) {
      pickFields(v, result);
    } else if (
      [
        "$all",
        "$elemMatch",
        "$allMatch",
        "$keyMapMatch",
        "$lt",
        "$lte",
        "$eq",
        "$ne",
        "$gte",
        "$gt",
        "$exists",
        "$type",
        "$in",
        "$nin",
        "$size",
        "$mod",
        "$regex",
      ].includes(k)
    ) {
      continue;
    } else if (
      Object.keys(v).findIndex((o) => {
        return o.startsWith("$");
      }) > -1
    ) {
      const key = parentKey ? parentKey + "." + k : k;
      result.push(key);
    } else if (
      Object.keys(v).findIndex((o) => {
        return /^\d+$/.test(o) === false;
      }) > -1
    ) {
      const key = parentKey ? parentKey + "." + k : k;
      pickFields(v, result, key);
    } else {
      const key = parentKey ? parentKey + "." + k : k;
      result.push(key);
    }
  }
}
