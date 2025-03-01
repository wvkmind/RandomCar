// 配置
const config = {
    covert: {
        count: 21,
        probability: 0.01,
        path: '/covert/pic'
    },
    classified: {
        count: 34,
        probability: 0.1,
        path: '/classified/pic'
    },
    restricted: {
        count: 36,
        probability: 0.19,
        path: '/restricted/pic'
    },
    milspec: {
        count: 78,
        probability: 0.3,
        path: '/milspec/pic'
    },
    industrial: {
        count: 162,
        probability: 0.4,
        path: '/industrial/pic'
    }
};

// 导出配置
export { config };