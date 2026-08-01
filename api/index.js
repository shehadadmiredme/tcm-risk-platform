/**
 * api/index.js —— Vercel Serverless Function 入口
 *
 * 导出 Express 应用，vercel.json 将 /api/* 全部路由到本函数。
 */

module.exports = require('../server');
