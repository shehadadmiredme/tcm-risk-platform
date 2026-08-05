/**
 * lib/formulaService.js —— 方剂数据库访问层
 *
 * 数据源：data/tcm_formula.db（中医方剂数据库，84,294 条方剂）
 * 表结构：source(出处) / formula(方剂) / formula_ingredient(成分明细)
 * 使用 Node 内置 node:sqlite（Node 22.5+，零外部依赖），只读打开。
 *
 * 说明：中文检索用 LIKE（trigram FTS 对中文短词匹配不可靠）；
 *       方剂名命中优先排序，其次按 id。
 */

const path = require('path');

let db = null;

function getDb() {
  if (db) return db;
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(path.join(__dirname, '..', 'data', 'tcm_formula.db'), {
    readOnly: true,
  });
  return db;
}

/**
 * 搜索方剂：按名称 / 配方原文 / 功效 / 出处 模糊匹配
 * @param {string} q 查询词（必填）
 * @param {number} limit 返回条数，默认 20，最大 50
 * @returns {{count:number, results:object[]}}
 */
function searchFormulas(q, limit, offset) {
  const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const like = `%${q}%`;
  const db = getDb();
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM formula
       WHERE name LIKE ? OR recipe_raw LIKE ? OR efficacy LIKE ? OR source_text LIKE ?`
    )
    .get(like, like, like, like);
  const rows = db
    .prepare(
      `SELECT id, name, source_text, efficacy, usage_method, caution, recipe_raw, preparation, alias_of,
         CASE
           WHEN name LIKE :like THEN 'name'
           WHEN recipe_raw LIKE :like THEN 'recipe'
           WHEN source_text LIKE :like THEN 'source'
           ELSE 'efficacy'
         END AS match_field
       FROM formula
       WHERE name LIKE :like OR recipe_raw LIKE :like OR efficacy LIKE :like OR source_text LIKE :like
       ORDER BY
         CASE
           WHEN name LIKE :like THEN 0
           WHEN recipe_raw LIKE :like THEN 1
           WHEN source_text LIKE :like THEN 2
           ELSE 3
         END, id
       LIMIT :limit OFFSET :offset`
    )
    .all({ like: `%${q}%`, limit: n, offset: off });
  return { count: countRow.c, results: rows };
}

/**
 * 方剂详情（含成分明细列表）
 * @param {number|string} id formula.id
 * @returns {object|null}
 */
function getFormula(id) {
  const db = getDb();
  const formula = db.prepare('SELECT * FROM formula WHERE id = ?').get(Number(id));
  if (!formula) return null;
  const ingredients = db
    .prepare(
      `SELECT seq, raw_text, herb_name, herb_processing, dosage, dosage_unit, dosage_note
       FROM formula_ingredient
       WHERE formula_id = ? ORDER BY seq`
    )
    .all(Number(id));
  return { ...formula, ingredients };
}

/**
 * 按方剂名获取所有同名方剂（含成分明细），用于图谱重名方剂节点展开
 * @param {string} name 方剂名称（精确匹配）
 * @returns {object[]}
 */
function getFormulasByName(name) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM formula WHERE name = ?').all(String(name));
  return rows.map(function (f) {
    const ingredients = db
      .prepare(
        `SELECT seq, raw_text, herb_name, herb_processing, dosage, dosage_unit, dosage_note
         FROM formula_ingredient WHERE formula_id = ? ORDER BY seq`
      )
      .all(f.id);
    return Object.assign({}, f, { ingredients });
  });
}

/** 数据统计（用于首页展示方剂规模） */
function getStats() {
  const db = getDb();
  return {
    formulaCount: db.prepare('SELECT COUNT(*) AS c FROM formula').get().c,
    sourceCount: db.prepare('SELECT COUNT(*) AS c FROM source').get().c,
    ingredientCount: db.prepare('SELECT COUNT(*) AS c FROM formula_ingredient').get().c,
  };
}

module.exports = {
  searchFormulas,
  getFormula,
  getFormulasByName,
  getStats,
};
