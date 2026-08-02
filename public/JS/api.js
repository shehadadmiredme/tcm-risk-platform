/**
 * public/JS/api.js —— 与后端 API 通信的统一封装
 *
 * - 使用相对路径：本地 localhost:3000 与 Vercel 部署同域，无需 CORS
 * - 响应约定：成功 {data: …} / 失败 {error: …}，本封装统一解包并抛错
 * - 依赖：浏览器原生 fetch
 */
(function () {
  'use strict';

  var API_BASE = '';

  function fetchJSON(path, opts) {
    return fetch(API_BASE + path, opts).then(function (res) {
      return res.json().then(function (json) {
        if (res.ok) return json.data;
        var err = new Error((json && json.error) || 'HTTP ' + res.status);
        err.status = res.status;
        throw err;
      });
    });
  }

  window.API = {
    base: API_BASE,

    /** 药材搜索：GET /api/herbs/search?q=&mode= */
    searchHerbs: function (q, mode) {
      var url = '/api/herbs/search?q=' + encodeURIComponent(q);
      if (mode) url += '&mode=' + encodeURIComponent(mode);
      return fetchJSON(url);
    },

    /** 药材详情：GET /api/herbs/:name */
    getHerb: function (name) {
      return fetchJSON('/api/herbs/' + encodeURIComponent(name));
    },

    /** 数据统计：GET /api/stats */
    getStats: function () {
      return fetchJSON('/api/stats');
    },

    /** 图谱数据：GET /api/graph?types= */
    getGraph: function (types) {
      var url = '/api/graph';
      if (types && types.length) url += '?types=' + types.join(',');
      return fetchJSON(url);
    },

    /** 方剂搜索：GET /api/formulas/search?q=&limit=&offset= */
    searchFormulas: function (q, limit, offset) {
      var url = '/api/formulas/search?q=' + encodeURIComponent(q);
      if (limit) url += '&limit=' + encodeURIComponent(limit);
      if (offset) url += '&offset=' + encodeURIComponent(offset);
      return fetchJSON(url);
    },

    /** 方剂详情：GET /api/formulas/:id（含成分明细） */
    getFormula: function (id) {
      return fetchJSON('/api/formulas/' + encodeURIComponent(id));
    },

    /** 同名方剂列表：GET /api/formulas/by-name?name=（图谱重名节点展开） */
    getFormulasByName: function (name) {
      return fetchJSON('/api/formulas/by-name?name=' + encodeURIComponent(name));
    }
  };
})();
