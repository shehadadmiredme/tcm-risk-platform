/**
 * lib/dataService.js —— 数据访问层统一接口
 *
 * 路由层只依赖本模块，不感知底层是 JSON 文件还是未来某天换成真数据库。
 * 切换存储：设置环境变量 DATA_PROVIDER=sql 即可（届时实现 lib/sqlProvider.js）。
 */

const { createJsonProvider } = require('./jsonProvider');

function resolveProvider() {
  if (process.env.DATA_PROVIDER === 'sql') {
    // 未来实现：lib/sqlProvider.js，按 yaocai_table.sql 的列名
    // eslint-disable-next-line global-require
    return require('./sqlProvider').createSqlProvider();
  }
  return createJsonProvider();
}

const provider = resolveProvider();

module.exports = {
  listHerbs(opts) {
    return provider.listHerbs(opts);
  },
  getHerb(name) {
    return provider.getHerb(name);
  },
  searchHerbs(params) {
    return provider.searchHerbs(params);
  },
  getStats() {
    return provider.getStats();
  },
  getGraph(types) {
    return provider.getGraph(types);
  }
};
