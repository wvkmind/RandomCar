// 维基百科知识获取模块

// 获取随机维基百科知识
async function fetchRandomWiki() {
    try {
        const response = await fetch('/api/wiki/random');
        if (!response.ok) {
            throw new Error('获取维基百科知识失败');
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || '获取维基百科知识失败');
        }
        return result.data;
    } catch (error) {
        console.error('获取维基百科知识出错:', error);
        throw error;
    }
}

export { fetchRandomWiki };