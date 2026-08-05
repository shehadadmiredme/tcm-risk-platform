/**
 * server.js —— Express 应用（本地开发与 Vercel 共用同一实例）
 *
 * - 本地：NODE_ENV !== 'production' 时托管 public/ 静态文件 + 兜底 index.html
 * - Vercel：NODE_ENV=production，public/ 由平台静态托管，API 走 api/index.js
 */

const path = require('path');
const express = require('express');
const dataService = require('./lib/dataService');
const formulaService = require('./lib/formulaService');

const app = express();
app.use(express.json());

// 统一响应包装：{ data: … } 成功 / { error: … } 失败
const ok = (res, data) => res.json({ data });
const fail = (res, status, message) => res.status(status).json({ error: message });

/* ---------- API 路由 ---------- */

// 统计信息（药材 + 方剂）
app.get('/api/stats', async (req, res) => {
  try {
    const herbStats = await dataService.getStats();
    const formulaStats = formulaService.getStats();
    ok(res, Object.assign({}, herbStats, formulaStats));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 药材列表（输入联想）
app.get('/api/herbs', async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    ok(res, await dataService.listHerbs({ limit: Number(limit) || 30, offset: Number(offset) || 0 }));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 药材搜索：/api/herbs/search?q=板蓝根&mode=all
app.get('/api/herbs/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return fail(res, 400, '缺少 q 参数');
    ok(res, await dataService.searchHerbs({ q, mode: req.query.mode }));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 药材详情：/api/herbs/人参
app.get('/api/herbs/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const herb = await dataService.getHerb(name);
    if (!herb) return fail(res, 404, '未找到该药材');
    ok(res, herb);
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 图谱数据：/api/graph?types=herb,meridian
app.get('/api/graph', async (req, res) => {
  try {
    const types = req.query.types ? String(req.query.types).split(',') : null;
    ok(res, await dataService.getGraph(types));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

/* ---------- 方剂查询路由 ---------- */

// 方剂搜索：/api/formulas/search?q=红糖姜水&limit=30&offset=30
app.get('/api/formulas/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return fail(res, 400, '缺少 q 参数');
    ok(res, formulaService.searchFormulas(q, req.query.limit, req.query.offset));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 同名方剂列表：/api/formulas/by-name?name=理中丸（图谱重名节点展开，须在 :id 前定义）
app.get('/api/formulas/by-name', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    if (!name) return fail(res, 400, '缺少 name 参数');
    ok(res, formulaService.getFormulasByName(name));
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 方剂详情：/api/formulas/:id（含成分明细）
app.get('/api/formulas/:id', async (req, res) => {
  try {
    const formula = formulaService.getFormula(req.params.id);
    if (!formula) return fail(res, 404, '未找到该方剂');
    ok(res, formula);
  } catch (e) {
    fail(res, 500, e.message);
  }
});

/* ---------- 本地开发静态托管（Vercel 生产环境不启用） ---------- */

if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// 本地直接运行时监听（require 进来时（api/index.js）不启动）
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log('✔ 中药风险信息公开平台已启动: http://localhost:' + port);
  });
}

module.exports = app;
