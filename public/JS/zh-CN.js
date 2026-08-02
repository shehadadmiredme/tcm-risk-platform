/**
 * 中文（简体）语言包
 * 覆盖项目中所有 data-i18n 键值
 */
I18N.register('zh-CN', {

    // ── 网站级 ──
    site: {
        title: '常用中药偏方风险信息公开平台'
    },

    // ── 导航栏 ──
    nav: {
        brand: '常用中药偏方风险信息公开平台',
        logoAlt: '留神',
        home: '首页',
        query: '查询',
        prescriptionQuery: '药方查询',
        herbQuery: '药材查询',
        graph: '图谱可视化',
        disclaimer: '免责声明',
        aboutAndDisclaimer: '关于平台及免责声明'
    },

    // ── 首页 ──
    home: {
        slide1: {
            badge: '面向公众的中药风险信息科普平台',
            title: '常用中药偏方风险信息公开平台',
            desc: '基于知识图谱整合多源不良反应数据，面向普通民众、基层医疗工作者和中医药爱好者，提供中药/偏方风险信息、古籍对比、安全用药提示等内容展示。',
            disclaimer: '仅做信息展示，不做诊断、不荐药、不替代医嘱。'
        },
        slide2: {
            badge: '山东中医药大学 · 大数据科创项目',
            title: '中药安全用药风险科普',
            desc: '依托知识图谱技术，整合药典、古籍、药监数据，挖掘常用中药、民间偏方潜在不良反应，助力大众科学使用中医药。'
        },
        slide3: {
            badge: '安全用药 · 拒绝偏方误区',
            title: '多源数据 · 风险公开',
            desc: '覆盖100+常用中药、50+常见偏方，提供用药禁忌、配伍风险、古籍对比，为基层医疗与大众提供参考。'
        },
        actions: {
            herbRisk: '快速查药材风险',
            prescriptionRisk: '快速查偏方风险',
            safetyManual: '查看安全用药手册',
            graphOverview: '知识图谱概览'
        },
        side: {
            noticeTitle: '平台公告 / 提示',
            noticeContent: '本平台仅提供风险信息科普和公开展示，不提供医疗建议。若出现不适，请及时咨询医生、药师等专业人员。',
            herbCount: '100+',
            herbCountLabel: '常用中药',
            prescriptionCount: '50+',
            prescriptionCountLabel: '常见偏方',
            hotTitle: '热门检索',
            hotContent: '板蓝根、菊花、枸杞、金银花、生姜、红糖姜水、川贝炖梨……'
        },
        quickLinks: {
            query: '查询',
            graph: '图谱可视化',
            disclaimer: '免责声明'
        }
    },

    // ── 药材查询页 ──
    herb: {
        title: '药材查询 — 常用中药偏方风险信息公开平台',
        searchPlaceholder: '请输入药材名称，如：板蓝根、菊花、枸杞...',
        searchBtn: '搜索',
        nameLabel: '药品名称',
        aliasLabel: '别名/常用名：',
        section: {
            basicInfo: '基础信息',
            adverseEffects: '可能出现的不良症状',
            riskGroup: '易感人群/注意事项',
            indications: '常用于什么症状'
        }
    },

    // ── 药方查询页 ──
    prescription: {
        title: '药方查询 — 常用中药偏方风险信息公开平台',
        searchPlaceholder: '请输入方剂成分，如：红糖姜水、川贝炖梨...',
        searchBtn: '搜索',
        tabs: {
            query: '方剂查询',
            analyze: '药方风险分析'
        },
        section: {
            composition: '组成成分',
            indications: '适用人群或症状',
            adverseEffects: '不良反应与注意事项',
            credibility: '估计对比与可信度'
        },
        search: {
            loading: '搜索中…',
            resultsLabel: '搜索结果',
            totalPrefix: '共',
            totalSuffix: '条相关方剂',
            notFound: '未找到相关方剂，请尝试其他关键词。',
            clickHint: '点击方剂名称查看详情',
            sourceLabel: '出处：',
            noRecord: '未记载',
            credibilityHint: '出处为古籍原文记载，可信度需结合现代医学研究评估。'
        },
        analyze: {
            intro: '输入您自拟或他人提供的药方，平台将逐味分析药材风险并给出配伍警示。',
            placeholder: '每行一味药材，可标注用量，例如：\n生姜 30g\n红糖 20g\n附子 5g',
            tagsLabel: '已识别药材',
            analyzeBtn: '开始分析',
            clearBtn: '清空',
            emptyTitle: '等待药方输入',
            emptyHint: '在左上方输入框中逐行录入药材，点击「开始分析」后，此处将展示风险分析结果。',
            warningDev: '当前为前端演示版本，风险分析引擎即将上线。',
            result: {
                devBadge: '功能开发中',
                overallTitle: '整体风险评级',
                overallEmpty: '风险评级机制即将上线，敬请期待。',
                herbTitle: '逐味药材风险',
                herbEmpty: '将逐味展示药材的毒性等级、禁忌人群与不良反应。',
                compatTitle: '配伍风险提示',
                compatEmpty: '将展示方剂中潜在的相反、相畏及不适宜同用的组合。',
                notReady: '待分析'
            }
        }
    },

    // ── 公共组件 ──
    common: {
        notice: {
            title: '温馨提示',
            content: '平台内容来源于公开文献、药典、药监信息与古籍记载，仅用于风险信息公开与科普展示；所有结论应以医生、药师及官方最新公告为准。'
        },
        footer: {
            intro: '常用中药偏方风险信息公开平台致力于普及中医药安全用药知识，为民众提供中药/偏方风险科普服务。',
            copyright: '© 2025 山东中医药大学 · 医学信息工程学院 保留所有权利。鲁ICP备XXXX号',
            downloadBtn: '安全用药手册下载',
            col1Title: '关于平台',
            col1Link1: '平台介绍',
            col1Link2: '研发团队',
            col1Link3: '数据来源',
            col1Link4: '联系我们',
            col2Title: '使用指南',
            col2Link1: '如何查询药材',
            col2Link2: '如何查询偏方',
            col2Link3: '如何查看图谱',
            col2Link4: '用药禁忌科普',
            col3Title: '合作与资源',
            col3Link1: '院校合作',
            col3Link2: '药典文献'
        }
    }
});
