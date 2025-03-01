// 历史记录处理模块

// 历史记录对象
let history = {
    covert: [],
    classified: [],
    restricted: [],
    milspec: [],
    industrial: []
};

/**
 * 加载历史记录
 */
function loadHistory() {
    const savedHistory = localStorage.getItem(`carHistory_${window.currentUser}`);
    if (savedHistory) {
        history = JSON.parse(savedHistory);
        history.covert = history.covert.slice(-5);
        history.classified = history.classified.slice(-5);
        history.restricted = history.restricted.slice(-5);
        history.milspec = history.milspec.slice(-5);
        history.industrial = history.industrial.slice(-5);
        updateHistoryDisplay();
    }
}

/**
 * 保存历史记录
 */
function saveHistory() {
    if (window.currentUser) {
        localStorage.setItem(`carHistory_${window.currentUser}`, JSON.stringify(history));
        updateLeaderboard();
    }
}

/**
 * 添加物品到历史记录
 * @param {Object} item - 抽取到的物品
 */
function addToHistory(item) {
    if (item && item.type && window.currentUser) {
        history[item.type].push(item.image);
        // 保持每种类型最多显示5个
        if (history[item.type].length > 5) {
            history[item.type] = history[item.type].slice(-5);
        }
        saveHistory();
        updateHistoryDisplay();
    }
}

/**
 * 更新历史记录显示
 */
function updateHistoryDisplay() {
    updateHistorySection('historyCovert', history.covert, 'covert');
    updateHistorySection('historyClassified', history.classified, 'classified');
    updateHistorySection('historyRestricted', history.restricted, 'restricted');
    updateHistorySection('historyMilspec', history.milspec, 'milspec');
    updateHistorySection('historyIndustrial', history.industrial, 'industrial');
}

/**
 * 更新特定类型的历史记录显示
 * @param {string} containerId - 容器ID
 * @param {Array} items - 物品列表
 * @param {string} type - 物品类型
 */
function updateHistorySection(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    items.forEach(image => {
        const itemElement = document.createElement('div');
        itemElement.className = `history-item ${type}`;
        
        const imgElement = document.createElement('img');
        imgElement.src = image;
        imgElement.alt = type;
        
        itemElement.appendChild(imgElement);
        container.appendChild(itemElement);
    });
}

/**
 * 清除历史记录
 */
function clearHistory() {
    history = {
        covert: [],
        classified: [],
        restricted: [],
        milspec: [],
        industrial: []
    };
    saveHistory();
    updateHistoryDisplay();
}

/**
 * 更新排行榜
 */
function updateLeaderboard() {
    const leaderboardData = [];
    
    // 获取所有用户数据
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('carHistory_')) {
            const username = key.replace('carHistory_', '');
            const userData = JSON.parse(localStorage.getItem(key));
            
            leaderboardData.push({
                username: username,
                covert: userData.covert ? userData.covert.length : 0,
                classified: userData.classified ? userData.classified.length : 0,
                restricted: userData.restricted ? userData.restricted.length : 0,
                milspec: userData.milspec ? userData.milspec.length : 0,
                industrial: userData.industrial ? userData.industrial.length : 0
            });
        }
    }
    
    // 按照稀有度总数排序
    leaderboardData.sort((a, b) => {
        const totalA = a.covert * 5 + a.classified * 4 + a.restricted * 3 + a.milspec * 2 + a.industrial;
        const totalB = b.covert * 5 + b.classified * 4 + b.restricted * 3 + b.milspec * 2 + b.industrial;
        return totalB - totalA;
    });
    
    // 更新排行榜显示
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (leaderboardBody) {
        leaderboardBody.innerHTML = '';
        
        leaderboardData.forEach((user, index) => {
            const total = user.covert + user.classified + user.restricted + user.milspec + user.industrial;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td class="history-covert">${user.covert}</td>
                <td class="history-classified">${user.classified}</td>
                <td class="history-restricted">${user.restricted}</td>
                <td class="history-milspec">${user.milspec}</td>
                <td class="history-industrial">${user.industrial}</td>
                <td>${total}</td>
            `;
            
            leaderboardBody.appendChild(row);
        });
    }
}

// 导出函数
export {
    loadHistory,
    saveHistory,
    addToHistory,
    updateHistoryDisplay,
    clearHistory,
    updateLeaderboard,
    history
};