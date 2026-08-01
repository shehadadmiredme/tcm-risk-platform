/**
 * lib/jsonProvider.js —— 数据访问层 JSON 文件实现
 *
 * 底层数据源：data/yaocai_data.json（544 条药材） + data/graph.json（图谱构建产物）
 * 关键点：
 *  - 静态 require 而非 fs.readFileSync，保证 Vercel Serverless 打包时文件进入函数 bundle
 *  - 载入时对全部文本字段做 OCR 噪音归一化（与图谱构建共用 normalize）
 *  - 模块级缓存单例，重复请求不重复解析
 *
 * 若未来切换到真数据库，实现 lib/sqlProvider.js 并保证接口一致即可。
 */

const { normalizeText } = require('./normalize');

// 原始药材数据（静态 require，随函数打包）
const rawHerbs = require('../data/yaocai_data.json');

// 载入时归一化所有字符串字段
const herbs = rawHerbs.map((h) => {
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    out[k] = typeof v === 'string' ? normalizeText(v) : v;
  }
  return out;
});

// 名称集合（用于配伍禁忌目标判定）
const herbNames = new Set(herbs.map((h) => h['药材名称']));

// 图谱产物（惰性加载 + 缓存）
let graphCache = null;
function getGraphData() {
  if (!graphCache) graphCache = require('../data/graph.json');
  return graphCache;
}

// 拼音索引（可选产物，惰性加载；不存在则返回 null）
let pinyinCache = null;
function getPinyinIndex() {
  if (pinyinCache === null) {
    try {
      pinyinCache = require('../data/pinyin_index.json');
    } catch (e) {
      pinyinCache = false;
    }
  }
  return pinyinCache || null;
}

const provider = {
  /** 列表（名称联想用） */
  listHerbs({ limit = 30, offset = 0 }) {
    const items = herbs.slice(offset, offset + limit);
    return { total: herbs.length, items };
  },

  /** 按名称精确取单条 */
  getHerb(name) {
    return herbs.find((h) => h['药材名称'] === name) || null;
  },

  /**
   * 搜索
   * mode: name（仅名称）| keyword（全字段）| pinyin（拼音反查）| all（名称+关键词+拼音）
   */
  searchHerbs({ q, mode }) {
    const query = String(q || '').trim();
    const modeAll = !mode || mode === 'all';
    const results = [];
    const seen = new Set();

    // 名称子串命中（优先）
    if (mode === 'name' || modeAll || mode === 'keyword') {
      for (const h of herbs) {
        if (h['药材名称'].includes(query)) {
          results.push(Object.assign({ _match: 'name' }, h));
          seen.add(h['药材名称']);
        }
      }
    }

    // 关键词（全字段子串）命中
    if ((mode === 'keyword' || modeAll) && query) {
      for (const h of herbs) {
        if (seen.has(h['药材名称'])) continue;
        const fullText = Object.values(h).join(' ');
        if (fullText.includes(query)) {
          results.push(Object.assign({ _match: 'keyword' }, h));
          seen.add(h['药材名称']);
        }
      }
    }

    // 拼音反查（query 为纯 ASCII 时）
    if ((mode === 'pinyin' || (modeAll && /^[a-zA-Z\s]+$/.test(query))) && query) {
      const idx = getPinyinIndex();
      if (idx) {
        const ql = query.toLowerCase().replace(/\s+/g, '');
        for (const [name, py] of Object.entries(idx)) {
          if (seen.has(name)) continue;
          if (py.full.includes(ql) || py.initial.includes(ql)) {
            const h = provider.getHerb(name);
            if (h) {
              results.push(Object.assign({ _match: 'pinyin' }, h));
              seen.add(name);
            }
          }
        }
      }
    }

    // 排序：名称命中优先，其余按药材顺序
    results.sort((a, b) => {
      if (a._match === 'name' && b._match !== 'name') return -1;
      if (b._match === 'name' && a._match !== 'name') return 1;
      return 0;
    });

    return { query, mode: mode || 'all', count: results.length, results };
  },

  /** 统计信息 */
  getStats() {
    const g = getGraphData();
    const toxicCount = herbs.filter((h) =>
      /大毒|有毒|小毒/.test((h['性味与归经'] || '') + (h['注意'] || ''))
    ).length;
    const st = g.stats || {};
    return {
      total: herbs.length,
      toxicCount,
      conflictPairs: st.conflictPairs || 0,
      meridianCount: st.meridianCount || 0,
      effectCount: st.effectCount || 0,
      symptomCount: st.symptomCount || 0,
      nodeCount: st.nodes || 0,
      edgeCount: st.edges || 0,
      dataVersion: (g.meta && g.meta.dataVersion) || ''
    };
  },

  /**
   * 图谱数据
   * @param {string[]|null} types 节点类型白名单（服务端裁剪，降低 payload）
   */
  getGraph(types) {
    const g = getGraphData();
    if (!types || !types.length) return g;
    const typeSet = new Set(types);
    const nodes = g.nodes.filter((n) => typeSet.has(n.type));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = g.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    return Object.assign({}, g, {
      nodes,
      edges,
      stats: Object.assign({}, g.stats, { nodes: nodes.length, edges: edges.length })
    });
  }
};

module.exports = { createJsonProvider: () => provider, herbNames };
