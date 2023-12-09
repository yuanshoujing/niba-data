import { test, beforeEach, afterEach, expect } from "@jest/globals";

import { NBModel } from "../src";
import { padding } from "../src/helper";

class Organ extends NBModel {
  propsMap = {
    name: String,
    spell: String,
    kind: String,
    parent_id: String,
    state: Number,
    remark: String,
    avatar_id: String,
    create_time: Date,
  };

  fulltext = ["name", "spell", "remark"];

  indexes = [["kind", "spell"]];

  orders = { name: "asc" };

  constructor(args = {}) {
    const { name = "b_organs", daily = false } = args;
    super({ name, daily });
  }
}

async function save1000() {
  const organ = new Organ();
  for (let i = 0; i < 1000; i++) {
    await organ.save({
      name: `测试机构_${i}`,
      spell: `csjg_${i}`,
      avatar_id: null,
      kind: (i % 3) + 1 + "0",
      parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
      state: 1,
      remark: null,
      create_time: new Date(),
    });
  }
}

beforeEach(async () => {
  const organ = new Organ();
  const { db_name } = await organ.db.info();
  expect(db_name).toBe("b_organs");
});

afterEach(async () => {
  const organ = new Organ();
  const { ok } = await organ.destroy();
  expect(ok).toBe(true);
});

test("organ-db-name", async () => {
  const now = new Date();
  const month = padding(now.getMonth(), 2);
  const date = padding(now.getDate(), 2);
  const dt = `${now.getFullYear()}${month}${date}`;
  const organ = new Organ({ daily: true });
  expect(organ.dbName).toBe(`b_organs.${dt}`);

  const indexs = await organ.indexNames();
  expect(indexs.length).toBe(2);

  const { ok } = await organ.destroy();
  expect(ok).toBe(true);
});

test("organ-save-1000", async () => {
  const stime = new Date().getTime();
  await save1000();
  const etime = new Date().getTime();
  expect(etime - stime).toBeLessThan(5000);
  const all = await new Organ().all();
  expect(all.length).toBe(1000);
}, 6000);

test("organ-upsert-100", async () => {
  const organ = new Organ();
  for (let i = 0; i < 100; i++) {
    const saved = await organ.upsert({
      name: `测试机构_${i}`,
      spell: `csjg_${i}`,
      avatar_id: null,
      kind: "0",
      parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
      state: 1,
      remark: null,
      create_time: new Date(),
    });

    await organ.upsert(
      Object.assign(saved, {
        name: `测试机构_${i}_1`,
        spell: `csjg_${i}_1`,
        abcdefg: "xxxx",
      }),
    );
  }
});

test("organ-get", async () => {
  const organ = new Organ();
  const saved = await organ.save({
    name: `测试机构`,
    spell: `csjg`,
    avatar_id: null,
    kind: "0",
    parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
    state: 1,
    remark: null,
  });

  const indb = await organ.get(saved._id);
  expect(indb).toEqual(saved);
});

test("organ-delete", async () => {
  const organ = new Organ();
  const { _id } = await organ.save({
    name: `测试机构`,
    spell: `csjg`,
    avatar_id: null,
    kind: "0",
    parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
    state: 1,
    remark: null,
  });
  const result = await organ.delete(_id);
  expect(result).toBe(true);
});

test("organ-query", async () => {
  await save1000();

  const selector = {
    kind: "30",
    $and: [
      {
        spell: "csjg_86",
      },
    ],
  };

  const organ = new Organ();
  organ.devMode = true;
  console.log(await organ.indexNames());
  const result = await organ.query({ selector });
  expect(result.length).toBe(1);
  expect(result[0].name).toBe("测试机构_86");
});

test("organ-paged-query", async () => {
  await save1000();

  const organ = new Organ();
  const result = await organ.pagedQuery({
    selector: {
      spell: "csjg_86",
    },
  });
  expect(result.count).toBe(1);
  expect(result.total).toBe(1);
  expect(result.records.length).toBe(1);
  expect(result.records[0].name).toBe("测试机构_86");
});

test("organ-search", async () => {
  await save1000();

  const organ = new Organ();
  const result = await organ.search({
    kws: "_86",
  });
  expect(result.length).toBe(11);
  expect(result[10].name).toBe("测试机构_869");
});

test("organ-paged-search", async () => {
  await save1000();

  const organ = new Organ();
  const result = await organ.pagedSearch({
    kws: "_86",
    rows: 2,
  });
  expect(result.count).toBe(11);
  expect(result.total).toBe(6);
  expect(result.records.length).toBe(2);
  expect(result.records[1].name).toBe("测试机构_860");
});
