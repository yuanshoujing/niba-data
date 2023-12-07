/**
 * 分页器
 *
 * @author 袁首京 <yuanshoujing@gmail.com>
 */
export default class Pager {
  /**
   *
   * @abstract
   * @param {string} count - 总记录数
   * @param {bool} rows - 每页多少条
   */
  constructor(count = 0, rows = 20) {
    this.records = []; // 数据
    this.count = count; // 总数
    this.rows = rows; // 行
    this.page = 1; // 页
  }

  /**
   * 总页数
   */
  get total() {
    if (this.count < 1) {
      return 1;
    }

    let result = parseInt(this.count / this.rows);
    if (this.count % this.rows > 0) {
      result += 1;
    }

    return result;
  }

  /**
   * 前一页
   */
  get prev() {
    const result = this.page - 1;
    if (result < 1) {
      return 1;
    }

    return result;
  }

  /**
   * 后一页
   */
  get next() {
    const result = this.page + 1;
    if (result > this.total) {
      return this.total;
    }

    return result;
  }

  /**
   * 获取指定页的记录的开始索引
   * @param {number} page 页码
   * @returns
   */
  startIdx(page = 1) {
    if (page < 1) {
      this.page = 1;
    } else {
      this.page = page;
    }
    return this.rows * (this.page - 1);
  }

  toJSON = () => {
    return {
      records: this.records,
      count: this.count,
      rows: this.rows,
      page: this.page,
      total: this.total,
      prev: this.prev,
      next: this.next,
    };
  };
}
