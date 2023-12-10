import PouchDB from "pouchdb";
import PouchdbFind from "pouchdb-find";

import { v4 as uuidv4 } from "uuid";

import logger from "./logger";
import Pager from "./pager";
import { padding, merge$and, pickFields } from "./helper";

PouchDB.plugin(PouchdbFind);

/**
 * 基础模型
 *
 * @author 袁首京 <yuanshoujing@gmail.com>
 */
class BaseModel {
  /**
   *
   * @abstract
   * @param {string} name - 模型名称
   * @param {bool} daily - 是否按天分库
   */
  constructor({ name, daily = true, prefix = "nbdb" }) {
    this.model_ = name;
    this.daily_ = daily;
    this.devMode_ = false;
    this.prefix_ = prefix;
    this.propsMap = {};
    this.fulltext = [];
  }

  /**
   * @param {bool} value
   */
  set devMode(value = false) {
    this.devMode_ = value;
  }

  /**
   * @member {string} - 库名称
   */
  get dbName() {
    let result = this.model_;
    if (this.daily_) {
      const now = new Date();
      const month = padding(now.getMonth(), 2);
      const date = padding(now.getDate(), 2);
      const dt = `${now.getFullYear()}${month}${date}`;
      result = this.model_ + "." + dt;
    }

    return result;
  }

  /**
   * @member {PouchDB} - 库实例
   */
  get db() {
    this.db_ ??= new PouchDB(this.dbName, {
      auto_compaction: true,
      prefix: this.prefix_,
    });

    return this.db_;
  }

  destroy = async () => {
    return await this.db.destroy();
  };

  /**
   * 预处理
   * @param {Object} obj 待处理对象
   */
  preproccess = (obj) => {
    const result = {};
    const fullTextValues = [];
    for (const [k, v] of Object.entries(this.propsMap)) {
      // 日期类型转字符串
      if (v === Date && obj[k] instanceof Date) {
        Object.assign(result, {
          [k]: obj[k].toISOString(),
        });
      } else {
        Object.assign(result, {
          [k]: obj[k] ?? null,
        });
      }

      // 生成全文索引字段
      if (this.fulltext.includes(k)) {
        fullTextValues.push(obj[k]);
      }
    }

    const fulltext_ = fullTextValues.join(" ");
    if (fulltext_) {
      Object.assign(result, {
        fulltext_,
      });
    }
    return result;
  };

  /**
   * 后处理
   */
  postproccess = (obj) => {
    const result = {};

    Object.entries(obj).forEach(([k, v]) => {
      if ("fulltext_" === k) {
        return;
      }
      Object.assign(result, { [k]: v });
    });

    for (const [k, v] of Object.entries(this.propsMap)) {
      // 日期类型转换
      if (v === Date && typeof obj[k] === "string") {
        Object.assign(result, {
          [k]: new Date(Date.parse(obj[k])),
        });
      }
    }
    return result;
  };

  /**
   * 保存
   *
   * @method
   * @param {object} entity - 要保存的实体
   * @returns {object} - 保存后的实体
   */
  save = async (entity) => {
    const properties = this.preproccess(entity);

    const wait4save = Object.assign(properties, {
      _id: uuidv4(),
    });

    let resp = await this.db.put(wait4save);

    const result = Object.assign(wait4save, {
      _rev: resp.rev,
    });

    return this.postproccess(result);
  };

  /**
   * 更新
   *
   * @method
   * @param {string} _id - 标识
   * @param {string} params - 要更新的属性和值
   * @returns {object} - 更新后的实体
   */
  update = async (_id, params = {}) => {
    const properties = this.preproccess(params);
    // logger.debug("--> _id: ", _id);

    const indb = await this.db.get(_id);
    Object.assign(indb, properties);
    // logger.debug("--> indb: ", indb);

    const resp = await this.db.put(indb);

    const result = Object.assign(indb, {
      _rev: resp.rev,
    });
    return this.postproccess(result);
  };

  /**
   * 保存或更新
   *
   * @method
   * @param {object} entity - 要保存或更新的实体
   * @returns {object} - 保存或更新后的实体
   */
  upsert = async (entity) => {
    if (entity._id) {
      return await this.update(entity._id, entity);
    } else {
      return await this.save(entity);
    }
  };

  /**
   * 删除
   * @param {string} _id - 标识
   * @returns
   */
  delete = async (_id) => {
    const indb = await this.db.get(_id);
    if (!indb) {
      return true;
    }

    const { ok } = await this.db.remove(indb);
    return ok;
  };

  indexNames = async () => {
    const { indexes } = await this.db.getIndexes();
    console.log(JSON.stringify(indexes));
    return indexes
      .map((v) => {
        return v.name;
      })
      .filter((v) => {
        return v !== "_all_docs";
      });
  };

  all = async () => {
    const { rows } = await this.db.allDocs({
      include_docs: true,
    });
    // logger.debug("--> all rows: ", rows);

    const result = [];
    rows.forEach(({ doc, id }) => {
      if (id.indexOf("_design") < 0) {
        result.push(this.postproccess(doc));
      }
    });

    return result;
  };

  get = async (_id) => {
    const resp = await this.db.get(_id);
    return this.postproccess(resp);
  };

  query = async ({
    selector = {},
    fields = [],
    sort = [],
    skip = 0,
    limit = 0,
  }) => {
    const sortFields = [];
    const sortSelectors = {};
    sort.forEach((v) => {
      if (typeof v === "string") {
        sortFields.push(v);

        Object.assign(sortSelectors, {
          [v]: { $exists: true },
        });
      } else {
        Object.keys(v).forEach((k) => {
          sortFields.push(k);
          Object.assign(sortSelectors, {
            [k]: { $exists: true },
          });
        });
      }
    });

    const mergedSelector = merge$and(selector);

    let indexFields = [];
    pickFields(mergedSelector, indexFields);
    // logger.debug("--> indexFields: %O", indexFields);
    indexFields = [...sortFields, ...indexFields];

    if (
      indexFields.length > 1 ||
      (indexFields.length == 1 && indexFields[0] !== "_id")
    ) {
      const idxResult = await this.db.createIndex({
        index: {
          fields: indexFields,
        },
      });
      // logger.debug("--> idxResult: %O", idxResult);
      // logger.debug("--> indexes: %O", JSON.stringify(await this.db.getIndexes()));
    }

    const querySelector = {
      ...mergedSelector,
      ...sortSelectors,
    };

    const defaultFields = ["_id", "_rev", ...Object.keys(this.propsMap)];

    const params = {
      selector: querySelector,
      fields: fields && fields.length > 0 ? fields : defaultFields,
    };
    if (skip > 0) {
      Object.assign(params, { skip });
    }
    if (limit > 0) {
      Object.assign(params, { limit });
    }
    if (sort.length > 0) {
      Object.assign(params, { sort });
    }
    logger.debug("--> query params: %s", JSON.stringify(params));

    if (this.devMode_ && Object.keys(querySelector).length > 0) {
      const explanation = await this.db.explain(params);
      logger.debug("--> explanation: %O", explanation);
    }

    const result = await this.db.find(params);
    // logger.debug("--> result: %O", result);

    const list = result.docs.map((v) => {
      return this.postproccess(v);
    });

    return list;
  };

  pagedQuery = async ({
    selector = {},
    fields = [],
    sort = [],
    page = 1,
    rows = 20,
  }) => {
    const ids = await this.query({
      selector,
      fields: ["_id"],
    });

    // logger.debug("--> length: ", ids.length);
    const pager = new Pager(ids.length, rows);
    const skip = pager.startIdx(page);
    // logger.debug("--> pager: %O, %d", pager, skip);

    const result = await this.query({
      selector,
      fields,
      sort,
      skip,
      limit: rows,
    });

    // logger.debug("--> docs: ", result);
    pager.records = result;
    return pager.toJSON();
  };

  /**
   * 全文索引搜索
   * @param {string} [kws] 关键字
   * @param {object} [selector] 查询条件
   * @param {string[]} [fields] 返回属性
   * @param {string[]|object[]} [sort] 排序属性
   * @param {integer} [skip] 起始索引
   * @param {integer} [limit] 返回记录数
   * @returns
   */
  search = async ({
    kws = "",
    selector = {},
    fields = [],
    sort = [],
    skip = 0,
    limit = 0,
  }) => {
    const querySelector = {
      ...(selector ?? {}),
      ...(kws && this.fulltext.length > 0
        ? {
            fulltext_: {
              $regex: new RegExp(kws, "i"),
            },
          }
        : {}),
    };

    const result = await this.query({
      selector: querySelector,
      fields,
      sort,
      skip,
      limit,
    });
    return result;
  };

  /**
   * 全文索引分页搜索
   * @param {string} [kws] 关键字
   * @param {object} [selector] 查询条件
   * @param {string[]} [fields] 返回属性
   * @param {string[]|object[]} [sort] 排序属性
   * @param {integer} [page] 页码
   * @param {integer} [rows] 每页录数
   * @returns
   */
  pagedSearch = async ({
    kws = "",
    selector = {},
    fields = [],
    sort = [],
    page = 1,
    rows = 20,
  }) => {
    const ids = await this.search({ kws, selector, fields: ["_id"] });

    const pager = new Pager(ids.length, rows);
    const skip = pager.startIdx(page);

    const result = await this.search({
      kws,
      selector,
      fields,
      sort,
      skip,
      limit: rows,
    });

    pager.records = result;
    return pager.toJSON();
  };
}

export default BaseModel;
