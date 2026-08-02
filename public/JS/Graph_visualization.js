/**
 * public/JS/Graph_visualization.js —— 图谱可视化页逻辑（子图聚焦模式）
 *
 * 交互模式（参考 GitHub 依赖图）：不一次性渲染全部 841 节点，
 * 而是每次聚焦展示「一个中心药材 + 它的直接关系邻居」的局部子图，
 * 通过搜索 / 点击节点不断切换中心，图谱始终清晰可读。
 *
 * 数据流：GET /api/graph 获取全量 → 前端裁剪子图 → ECharts graph 渲染
 * 依赖：ECharts 5（CDN）+ JS/api.js
 */
(function () {
  'use strict';

  var canvas = document.getElementById('graphCanvas');
  var placeholder = canvas ? canvas.querySelector('.canvas-placeholder') : null;
  var nodeDetail = document.getElementById('nodeDetail');
  var searchInput = document.getElementById('graphSearchInput');

  var chart = null;
  var graphData = null;      // 后端全量数据
  var currentCenter = null;  // 当前中心节点 id
  var currentLayout = 'force';
  var roamMode = 'move';

  // 默认初始中心药材（关系最丰富、最常用的「药中甘草」）
  var DEFAULT_CENTER = 'herb:甘草';

  var TYPE_LABELS = {
    herb: '药材',
    formula: '方剂',
    meridian: '经络',
    effect: '功效',
    symptom: '症状',
    caution: '禁忌/毒性'
  };
  var TYPE_COLORS = {
    herb: '#0F766E',
    formula: '#EC4899',
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
    '毒性': 'rgba(220,38,38,0.95)',
    '组成': 'rgba(236,72,153,0.6)'
  };
  var EDGE_LABELS = {
    '归经': '归经',
    '功效': '功效',
    '主治': '主治',
    '配伍禁忌': '禁忌',
    '毒性': '毒性',
    '组成': '组成'
  };

  var enabledNodeTypes = new Set(Object.keys(TYPE_LABELS));
  var enabledEdgeTypes = new Set(Object.keys(EDGE_COLORS));

  /* ---------- 子图提取 ---------- */

  /** 从全量数据提取「中心节点 + 一跳邻居 + 相关边」的局部子图 */
  function extractSubgraph(centerId) {
    var ids = new Set([centerId]);
    graphData.edges.forEach(function (e) {
      if (e.source === centerId) ids.add(e.target);
      if (e.target === centerId) ids.add(e.source);
    });
    var nodes = graphData.nodes.filter(function (n) { return ids.has(n.id); });
    var edges = graphData.edges.filter(function (e) {
      return ids.has(e.source) && ids.has(e.target);
    });
    return { nodes: nodes, edges: edges };
  }

  /* ---------- 渲染 ---------- */

  function symbolSizeFor(n, isCenter) {
    var base;
    switch (n.type) {
      case 'herb': base = n.toxic ? 46 : 36; break;
      case 'formula': base = 20 + Math.min(12, n.value * 0.4); break;
      case 'meridian': base = 20 + Math.min(12, n.value * 0.08); break;
      case 'effect': base = 16 + Math.min(10, n.value * 0.15); break;
      case 'symptom': base = 12 + Math.min(8, n.value * 0.2); break;
      default: base = 16 + Math.min(12, n.value * 0.5); break; // caution
    }
    return isCenter ? base + 16 : base;
  }

  function borderColorFor(n, isCenter) {
    if (isCenter) return '#fff';
    if (n.type === 'herb' && n.toxic) return '#F87171';
    return 'rgba(255,255,255,0.35)';
  }

  function buildOption() {
    var sub = currentCenter ? extractSubgraph(currentCenter) : { nodes: [], edges: [] };

    // 类型筛选 + 记录可见 id
    var nodeIds = new Set();
    var nodes = sub.nodes
      .filter(function (n) { return enabledNodeTypes.has(n.type); })
      .map(function (n) { nodeIds.add(n.id); return n; });
    var links = sub.edges.filter(function (e) {
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
            if (d.type === 'herb' && d.id === currentCenter) line += '<br/><span style="color:#34D399">当前中心药材（点击其他节点可切换）</span>';
            return line;
          }
          return '';
        }
      },
      legend: {
        data: categories.map(function (c) { return c.name; }),
        textStyle: { color: 'rgba(226,240,238,0.85)', fontSize: 11 },
        top: 8,
        right: 12,
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 10
      },
      series: [{
        type: 'graph',
        layout: currentLayout,
        roam: roamMode,
        draggable: true,
        data: nodes.map(function (n) {
          var isCenter = n.id === currentCenter;
          return {
            id: n.id,
            name: n.name,
            type: n.type,
            toxic: n.toxic,
            value: n.value,
            category: TYPE_LABELS[n.type],
            symbolSize: symbolSizeFor(n, isCenter),
            itemStyle: {
              color: TYPE_COLORS[n.type],
              borderColor: borderColorFor(n, isCenter),
              borderWidth: isCenter ? 3 : (n.type === 'herb' && n.toxic ? 2 : 1),
              shadowBlur: isCenter ? 24 : 0,
              shadowColor: 'rgba(52,211,153,0.55)'
            },
            label: {
              show: true,
              fontSize: isCenter ? 14 : 10,
              color: isCenter ? '#fff' : 'rgba(226,240,238,0.9)',
              fontWeight: isCenter ? 700 : 400,
              offset: [0, -10]
            }
          };
        }),
        links: links.map(function (e) {
          return {
            source: e.source,
            target: e.target,
            value: EDGE_LABELS[e.type] || e.type,
            lineStyle: { color: EDGE_COLORS[e.type] || 'rgba(255,255,255,0.25)', width: e.type === '配伍禁忌' || e.type === '毒性' ? 2 : 1.2 },
            label: { show: e.type === '配伍禁忌' || e.type === '毒性', fontSize: 9, color: 'rgba(248,113,113,0.9)', formatter: '{v}' }
          };
        }),
        categories: categories,
        force: { repulsion: 280, edgeLength: [70, 160], gravity: 0.08, friction: 0.6 },
        lineStyle: { opacity: 0.6, curveness: 0.1 },
        emphasis: {
          focus: 'adjacency',
          label: { fontSize: 12 },
          lineStyle: { width: 3, opacity: 0.95 }
        }
        // 不使用 hideOverlap：保证所有节点名称始终显示，不因标签重叠被隐藏
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
      window.addEventListener('resize', function () { if (chart) chart.resize(); });
    }
    chart.setOption(buildOption(), true);
  }

  /* ---------- 中心切换 ---------- */

  function setCenter(nodeId) {
    if (!graphData || !nodeId) return;
    currentCenter = nodeId;
    renderChart();

    var centerNode = graphData.nodes.find(function (n) { return n.id === nodeId; });
    if (!centerNode) return;
    if (centerNode.type === 'herb') {
      window.API
        .getHerb(centerNode.name)
        .then(function (herb) { renderHerbDetail(centerNode, herb); })
        .catch(function () { renderGenericDetail(centerNode); });
    } else {
      renderGenericDetail(centerNode);
    }
  }

  /* ---------- 节点点击 ---------- */

  function onNodeClick(params) {
    if (!params || params.dataType !== 'node') return;
    var node = params.data;
    if (node.type === 'herb' && node.id !== currentCenter) {
      setCenter(node.id); // 点击药材 → 聚焦其关系网
    } else if (node.type !== 'herb') {
      renderGenericDetail(node); // 点击概念节点 → 查看相关药材
    }
  }

  /* ---------- 详情渲染 ---------- */

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
    var tag = document.createElement('span');
    tag.className = 'detail-type';
    tag.textContent = '当前中心 · 点击节点可切换';
    head.appendChild(tag);
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

    // 方剂节点补充出处信息
    if (node.type === 'formula' && node.source_text) {
      addRow(box, '出处', node.source_text);
    }

    // 收集所有相关药材（去重）
    var neighborNames = [];
    var seen = new Set();
    graphData.edges.forEach(function (e) {
      var nb = null;
      if (e.source === node.id && e.target.indexOf('herb:') === 0) nb = e.target.slice(5);
      if (e.target === node.id && e.source.indexOf('herb:') === 0) nb = e.source.slice(5);
      if (nb && !seen.has(nb)) {
        seen.add(nb);
        neighborNames.push(nb);
      }
    });

    if (neighborNames.length) {
      var countRow = document.createElement('div');
      countRow.className = 'detail-row';
      var b = document.createElement('b');
      b.textContent = node.type === 'formula' ? '组成药材' : '相关药材';
      countRow.appendChild(b);
      countRow.appendChild(
        document.createTextNode(
          node.type === 'formula'
            ? '（组成 ' + neighborNames.length + ' 味，点击可聚焦）'
            : '（共 ' + neighborNames.length + ' 种，点击可聚焦）'
        )
      );
      box.appendChild(countRow);

      var pills = document.createElement('div');
      pills.className = 'related-pills';
      neighborNames.forEach(function (name) {
        var pill = document.createElement('span');
        pill.className = 'related-pill';
        pill.textContent = name;
        pill.title = '点击聚焦查看「' + name + '」的关系网';
        pill.addEventListener('click', function () {
          setCenter('herb:' + name);
        });
        pills.appendChild(pill);
      });
      box.appendChild(pills);
    } else {
      addRow(box, '说明', '该节点暂无关联药材。');
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

  /* ---------- 错误态 ---------- */

  function renderError(msg) {
    if (placeholder) {
      placeholder.querySelector('h3').textContent = '图谱加载失败';
      placeholder.querySelector('p').textContent = msg;
    }
  }

  /* ---------- 交互绑定 ---------- */

  function bindFilters() {
    document.querySelectorAll('[data-node-type]').forEach(function (label) {
      label.addEventListener('change', function () {
        var type = label.getAttribute('data-node-type');
        if (label.querySelector('input').checked) enabledNodeTypes.add(type);
        else enabledNodeTypes.delete(type);
        if (chart) chart.setOption(buildOption(), true);
      });
    });
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
    document.querySelectorAll('.layout-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.layout-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentLayout = btn.getAttribute('data-layout') || 'force';
        if (chart) chart.setOption(buildOption(), true);
      });
    });

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

    // 重置：回到默认中心药材
    var btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (graphData) setCenter(DEFAULT_CENTER);
    });
  }

  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim();
      if (!q) return;
      // 匹配药材 / 方剂名称，聚焦到该节点的子图
      var match = graphData.nodes.find(function (n) {
        return (n.type === 'herb' || n.type === 'formula') && n.name.indexOf(q) >= 0;
      });
      if (match && match.id !== currentCenter) {
        setCenter(match.id);
      }
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
        // 初始聚焦默认中心药材
        setCenter(DEFAULT_CENTER);
      })
      .catch(function (err) {
        renderError(err.message || '网络异常');
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
