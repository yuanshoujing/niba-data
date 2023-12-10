# niba-data

A super simple web storage tool that can be used in browsers as well as in Node environments.
一个超级简单的 Web 存储工具，可用于浏览器，也可用于 Node 环境。

## install 安装

```bash
npm i niba-data
```

## define model 定义模型

```javascript
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

  constructor() {
    super({ name: "organs" });
  }
}
```

## save 保存

```javascript
const organ = new Organ();
const { _id } = await organ.save({
  name: `测试机构`,
  spell: `csjg`,
  avatar_id: null,
  kind: "0",
  parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
  state: 1,
  remark: null,
  create_time: new Date(),
});
```

## upsert 保存或更新

```javascript
const organ = new Organ();
const saved = await organ.upsert({
  name: `测试机构`,
  spell: `csjg`,
  avatar_id: null,
  kind: "0",
  parent_id: "178b7af3-4c85-4dc0-8a25-8c80db425ae8",
  state: 1,
  remark: null,
  create_time: new Date(),
});

await organ.upsert({
  ...saved,
  ...{
    name: "测试机构X",
  },
});
```

## read 读取

```javascript
const indb = await organ.get(saved._id);
```

## delete 删除

```javascript
const result = await organ.delete(_id);
```

## query 查询

```javascript
const selector = {
  kind: "30",
  spell: "csjg_86",
};

const organ = new Organ();
const result = await organ.query({ selector, sort: ["name"] });
```

## 分页

```javascript
const organ = new Organ();
const result = await organ.pagedQuery({
  selector: {
    spell: "csjg_86",
  },
  sort: ["name"],
  page: 1,
  rows: 10,
});
```

## 全文检索

```javascript
const organ = new Organ();
const result = await organ.search({
  kws: "_86",
  sort: [{ name: "asc" }],
});
```

## 分页全文检索

```javascript
const organ = new Organ();
const result = await organ.pagedSearch({
  kws: "_86",
  rows: 2,
});
```
