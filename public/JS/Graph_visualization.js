/**
 * public/JS/Graph_visualization.js —— 图谱可视化页逻辑
 *
 * 数据流：GET /api/graph → ECharts graph 系列渲染
 * 交互：节点点击详情 / 类型与关系筛选 / 布局切换 / 搜索高亮 / 重置视图
 * 依赖：ECharts 5（CDN）+ JS/api.js
 */
(function () {
  'use strict';

  var canvas = document.getElementById('graphCanvas');
  var placeholder = canvas ? canvas.querySelector('.canvas-placeholder') : null;
  var nodeDetail = document.getElementById('nodeDetail');
  var searchInput = document.getElementById('graphSearchInput');

  var chart = null;
  var graphData = null;      // 后端原始数据
  var currentLayout = 'force';
  var roamMode = 'move';     // move | scale

  var TYPE_LABELS = {
    herb: '药材',
    meridian: '经络',
    effect: '功效',
    symptom: '症状',
    caution: '禁忌/毒性'
  };
  var TYPE_COLORS = {
    herb: '#0F766E',
    meridian: '#D97706',
    effect: '#2563EB',
    symptom: '#7C3AED',
    caution: '#DC2626'
  };
  var EDGE_COLORS = {
    '归经': 'rgba(217,119,6,0.65)',
    '功效': 'rgba(37,99,235,0.6)',
    '主治': 'rgba(124,58,237,0.55)',
    '配伍禁忌': 'rgba(220,38,38,0.85)',
    '毒性': 'rgba(220,38,38,0.95)'
  };

  var enabledNodeTypes = new Set(Object.keys(TYPE_LABELS));
  var enabledEdgeTypes = new Set(Object.keys(EDGE_COLORS));

  /* ---------- 渲染 ---------- */

  function symbolSizeFor(n) {
    switch (n.type) {
      case 'herb':
        return n.toxic ? 50 : 40;
      case 'meridian':
        return 22 + Math.min(14, n.value * 0.08);
      case 'effect':
        return 18 + Math.min(12, n.value * 0.15);
      case 'symptom':
        return 12 + Math.min(10, n.value * 0.2);
      default: // caution
        return 18 + Math.min(14, n.value * 0.5);
    }
  }

  function borderColorFor(n) {
    if (n.type === 'herb' && n.toxic) return '#F87171';
    return 'rgba(255,255,255,0.35)';
  }

  function buildOption() {
    // 按当前筛选过滤节点与边
    var nodeIds = new Set();
    var nodes = graphData.nodes
      .filter(function (n) { return enabledNodeTypes.has(n.type); })
      .map(function (n) { nodeIds.add(n.id); return n; });
    var links = graphData.edges.filter(function (e) {
      return enabledEdgeTypes.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target);
    });

    var categories = Object.keys(TYPE_LABELS).map(function (t) {
      return { name: TYPE_LABELS[t] };
    });

    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(16,30,28,0.94)',
        borderColor: 'rgba(255,255,255,0.15)',
        textStyle: { color: '#E2F0EE', fontSize: 13 },
        padding: 12,
        formatter: function (p) {
          if (p.dataType === 'node') {
            var d = p.data;
            var line = '<b>' + d.name + '</b><br/>' + (TYPE_LABELS[d.type] || d.type);
            if (d.toxic) line += ' · <span style="color:#F87171">有毒</span>';
            return line;
          }
          return '';
        }
      },
      series: [{
        type: 'graph',
        layout: currentLayout,
        roam: true,
        draggable: true,
        data: nodes.map(function (n) {
          return {
            id: n.id,
            name: n.name,
            type: n.type,
            toxic: n.toxic,
            value: n.value,
            category: TYPE_LABELS[n.type],
            symbolSize: symbolSizeFor(n),
            itemStyle: { color: TYPE_COLORS[n.type], borderColor: borderColorFor(n), borderWidth: n.type === 'herb' && n.toxic ? 2 : 1 },
            label: { show: true, fontSize: 10, color: 'rgba(226,240,238,0.92)', offset: [0, -8] }
          };
        }),
        links: links.map(function (e) {
          return {
            source: e.source,
            target: e.target,
            lineStyle: { color: EDGE_COLORS[e.type] || 'rgba(255,255,255,0.25)', width: 1.2 },
            type: e.type
          };
        }),
        categories: categories,
        force: { repulsion: 220, edgeLength: [50, 150], gravity: 0.08, friction: 0.55 },
        lineStyle: { opacity: 0.55, curveness: 0.08 },
        emphasis: {
          focus: 'adjacency',
          label: { fontSize: 13 },
          lineStyle: { width: 2.5, opacity: 0.9 }
        },
        labelLayout: { hideOverlap: true }
      }]
    };
    return option;
  }

  function renderChart() {
    if (!window.echarts) {
      renderError('ECharts 加载失败，请检查网络后刷新');
      return;
    }
    if (placeholder) placeholder.remove();
    if (!chart) {
      chart = echarts.init(canvas);
      chart.on('click', onNodeClick);
      window.addEventListener('resize', function () {
        if (chart) chart.resize();
      });
    }
    chart.setOption(buildOption(), true);
  }

  /* ---------- 统计 ---------- */

  function fillStats(g) {
    var set = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('statNodes', g.stats.nodes);
    set('statEdges', g.stats.edges);
    set('statToxic', g.stats.toxicCount);
  }

  /* ---------- 节点点击 ---------- */

  function onNodeClick(params) {
    if (!params || params.dataType !== 'node') return;
    var node = params.data;
    if (node.type === 'herb') {
      window.API
        .getHerb(node.name)
        .then(function (herb) { renderHerbDetail(node, herb); })
        .catch(function () { renderGenericDetail(node); });
    } else {
      renderGenericDetail(node);
    }
  }

  function renderHerbDetail(node, herb) {
    var box = document.createElement('div');
    box.className = 'detail-content';

    var head = document.createElement('div');
    head.className = 'detail-head';
    var title = document.createElement('span');
    title.className = 'detail-name';
    title.textContent = herb['药材名称'];
    head.appendChild(title);
    if (node.toxic) {
      var badge = document.createElement('span');
      badge.className = 'detail-badge';
      badge.textContent = '有毒';
      head.appendChild(badge);
    }
    box.appendChild(head);

    addRow(box, '性味与归经', herb['性味与归经'] || '无');
    addRow(box, '功能与主治', herb['功能与主治'] || '无');
    addRow(box, '用法与用量', herb['用法与用量'] || '无');
    if (herb['注意'] && herb['注意'] !== '无') addRow(box, '注意', herb['注意']);

    fillDetail(box);
  }

  function renderGenericDetail(node) {
    var box = document.createElement('div');
    box.className = 'detail-content';

    var head = document.createElement('div');
    head.className = 'detail-head';
    var title = document.createElement('span');
    title.className = 'detail-name';
    title.textContent = node.name;
    head.appendChild(title);
    var tag = document.createElement('span');
    tag.className = 'detail-type';
    tag.textContent = TYPE_LABELS[node.type] || node.type;
    head.appendChild(tag);
    box.appendChild(head);

    // 相关药材
    var related = [];
    var neighborNames = new Set();
    graphData.edges.forEach(function (e) {
      if (e.source === node.id && e.target.indexOf('herb:') === 0) neighborNames.add(e.target.slice(5));
      if (e.target === node.id && e.source.indexOf('herb:') === 0) neighborNames.add(e.source.slice(5));
    });
    if (neighborNames.size) {
      addRow(box, '相关药材', Array.from(neighborNames).slice(0, 30).join('、') + (neighborNames.size > 30 ? '…' : ''));
    } else {
      addRow(box, '说明', '该节点为图谱中的概念节点，点击其相连的药材查看详情。');
    }

    fillDetail(box);
  }

  function addRow(box, label, value) {
    var row = document.createElement('div');
    row.className = 'detail-row';
    var l = document.createElement('b');
    l.textContent = label + '：';
    row.appendChild(l);
    row.appendChild(document.createTextNode(value));
    box.appendChild(row);
  }

  function fillDetail(box) {
    nodeDetail.innerHTML = '';
    nodeDetail.appendChild(box);
  }

  /* ---------- 错误态 ---------- */

  function renderError(msg) {
    if (placeholder) {
      placeholder.querySelector('h3').textContent = '图谱加载失败';
      placeholder.querySelector('p').textContent = msg;
    }
  }

  /* ---------- 交互绑定 ---------- */

  function bindFilters() {
    // 节点类型筛选
    document.querySelectorAll('[data-node-type]').forEach(function (label) {
      label.addEventListener('change', function () {
        var type = label.getAttribute('data-node-type');
        if (label.querySelector('input').checked) enabledNodeTypes.add(type);
        else enabledNodeTypes.delete(type);
        if (chart) chart.setOption(buildOption(), true);
      });
    });
    // 关系类型筛选
    document.querySelectorAll('[data-edge-type]').forEach(function (label) {
      label.addEventListener('change', function () {
        var type = label.getAttribute('data-edge-type');
        if (label.querySelector('input').checked) enabledEdgeTypes.add(type);
        else enabledEdgeTypes.delete(type);
        if (chart) chart.setOption(buildOption(), true);
      });
    });
  }

  function bindToolbar() {
    // 布局切换
    document.querySelectorAll('.layout-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.layout-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentLayout = btn.getAttribute('data-layout') || 'force';
        if (chart) chart.setOption(buildOption(), true);
      });
    });

    // 平移/缩放模式
    var btnPan = document.getElementById('btnPan');
    var btnZoom = document.getElementById('btnZoom');
    function setRoam(mode) {
      roamMode = mode;
      if (btnPan) btnPan.classList.toggle('active', mode === 'move');
      if (btnZoom) btnZoom.classList.toggle('active', mode === 'scale');
      if (chart) chart.setOption({ series: [{ roam: mode }] }, false);
    }
    if (btnPan) btnPan.addEventListener('click', function () { setRoam('move'); });
    if (btnZoom) btnZoom.addEventListener('click', function () { setRoam('scale'); });

    // 重置视图
    var btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', function () {
      if (!chart) return;
      chart.setOption(buildOption(), true);
    });
  }

  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      if (!chart) return;
      var q = searchInput.value.trim();
      // 取消全部高亮
      chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
      if (!q) return;
      var data = buildOption().series[0].data;
      data.forEach(function (n, idx) {
        if (n.name.indexOf(q) >= 0) {
          chart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx });
        }
      });
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    window.API
      .getGraph()
      .then(function (g) {
        graphData = g;
        fillStats(g);
        renderChart();
        bindFilters();
        bindToolbar();
        bindSearch();
      })
      .catch(function (err) {
        renderError(err.message || '网络异常');
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
