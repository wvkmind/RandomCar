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
async function loadHistory() {
    if (!window.userId || !window.userToken) return;
    
    try {
        const response = await fetch(`/collections?userId=${window.userId}&token=${window.userToken}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.collections) {
            // 重置历史记录
            history = {
                covert: [],
                classified: [],
                restricted: [],
                milspec: [],
                industrial: []
            };
            
            // 将服务器返回的收藏转换为历史记录格式
            data.collections.forEach(item => {
                const imagePath = `./public/${item.type}/pic${item.image_index}.png`;
                if (history[item.type].length < 5) {
                    history[item.type].push(imagePath);
                }
            });
            
            updateHistoryDisplay();
        }
    } catch (error) {
        console.error('获取历史记录失败:', error);
    }
}

/**
 * 保存历史记录
 */
function saveHistory() {
    // 历史记录现在由服务器管理，不需要本地保存
    updateLeaderboard();
}

/**
 * 添加物品到历史记录
 * @param {Object} item - 抽取到的物品
 */
async function addToHistory(item) {
    if (!item || !item.type || !window.userId || !window.userToken) return;
    
    // 从图片路径中提取索引
    const pathParts = item.image.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const imageIndex = parseInt(fileName.replace('pic', '').replace('.png', ''));
    
    try {
        const response = await fetch('/addRecord', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: window.userId,
                token: window.userToken,
                type: item.type,
                imageIndex: imageIndex
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            // 更新本地历史记录对象
            if (data.collections) {
                // 重置历史记录
                history = {
                    covert: [],
                    classified: [],
                    restricted: [],
                    milspec: [],
                    industrial: []
                };
                
                // 将服务器返回的收藏转换为历史记录格式，只保留最新的5条记录
                const typeCollections = {};
                data.collections.forEach(item => {
                    if (!typeCollections[item.type]) {
                        typeCollections[item.type] = [];
                    }
                    typeCollections[item.type].push(item);
                });
                
               
                Object.keys(typeCollections).forEach(type => {
                    const sortedItems = typeCollections[type].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
                    sortedItems.forEach(item => {
                        const imagePath = `./public/${item.type}/pic${item.image_index}.png`;
                        history[item.type].push(imagePath);
                    });
                });
            }
            
            updateHistoryDisplay();
        }
    } catch (error) {
        console.error('添加历史记录失败:', error);
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
    updateHistoryDisplay();
}

/**
 * 更新排行榜
 */
async function updateLeaderboard() {
    try {
        // 添加当前用户ID作为参数，以便服务器识别当前用户
        const userId = window.userId || '';
        const response = await fetch(`/leaderboard?userId=${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const leaderboardBody = document.getElementById('leaderboardBody');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';
            
            // 显示前50名用户
            if (data.leaderboard && Array.isArray(data.leaderboard)) {
                data.leaderboard.forEach((user, index) => {
                    const row = document.createElement('tr');
                    
                    const rankCell = document.createElement('td');
                    rankCell.textContent = index + 1;
                    row.appendChild(rankCell);
                    
                    const usernameCell = document.createElement('td');
                    usernameCell.textContent = user.username;
                    // 如果是当前用户，高亮显示
                    if (user.username === window.currentUser) {
                        usernameCell.style.fontWeight = 'bold';
                        row.classList.add('current-user');
                    }
                    row.appendChild(usernameCell);
                    
                    const covertCell = document.createElement('td');
                    covertCell.textContent = user.stats.covert;
                    covertCell.className = 'covert-count';
                    row.appendChild(covertCell);
                    
                    const classifiedCell = document.createElement('td');
                    classifiedCell.textContent = user.stats.classified;
                    classifiedCell.className = 'classified-count';
                    row.appendChild(classifiedCell);
                    
                    const restrictedCell = document.createElement('td');
                    restrictedCell.textContent = user.stats.restricted;
                    restrictedCell.className = 'restricted-count';
                    row.appendChild(restrictedCell);
                    
                    const milspecCell = document.createElement('td');
                    milspecCell.textContent = user.stats.milspec;
                    milspecCell.className = 'milspec-count';
                    row.appendChild(milspecCell);
                    
                    const industrialCell = document.createElement('td');
                    industrialCell.textContent = user.stats.industrial;
                    industrialCell.className = 'industrial-count';
                    row.appendChild(industrialCell);
                    
                    const totalCell = document.createElement('td');
                    totalCell.textContent = user.stats.total;
                    row.appendChild(totalCell);
                    
                    leaderboardBody.appendChild(row);
                });
                
                // 检查当前用户是否在前50名中
                const userInTop50 = data.leaderboard.some(user => user.username === window.currentUser);
                
                // 如果当前用户不在前50名中，且有currentUser数据，在底部添加当前用户的排名信息
                if (!userInTop50 && data.currentUser && window.currentUser) {
                    // 添加一个分隔行
                    const separatorRow = document.createElement('tr');
                    const separatorCell = document.createElement('td');
                    separatorCell.colSpan = 8;
                    separatorCell.textContent = '...';
                    separatorCell.style.textAlign = 'center';
                    separatorRow.appendChild(separatorCell);
                    leaderboardBody.appendChild(separatorRow);
                    
                    // 添加当前用户行
                    const currentUserRow = document.createElement('tr');
                    currentUserRow.classList.add('current-user');
                    
                    const currentRankCell = document.createElement('td');
                    currentRankCell.textContent = data.currentUser.rank;
                    currentUserRow.appendChild(currentRankCell);
                    
                    const currentUsernameCell = document.createElement('td');
                    currentUsernameCell.textContent = data.currentUser.data.username;
                    currentUsernameCell.style.fontWeight = 'bold';
                    currentUserRow.appendChild(currentUsernameCell);
                    
                    const currentCovertCell = document.createElement('td');
                    currentCovertCell.textContent = data.currentUser.data.stats.covert;
                    currentCovertCell.className = 'covert-count';
                    currentUserRow.appendChild(currentCovertCell);
                    
                    const currentClassifiedCell = document.createElement('td');
                    currentClassifiedCell.textContent = data.currentUser.data.stats.classified;
                    currentClassifiedCell.className = 'classified-count';
                    currentUserRow.appendChild(currentClassifiedCell);
                    
                    const currentRestrictedCell = document.createElement('td');
                    currentRestrictedCell.textContent = data.currentUser.data.stats.restricted;
                    currentRestrictedCell.className = 'restricted-count';
                    currentUserRow.appendChild(currentRestrictedCell);
                    
                    const currentMilspecCell = document.createElement('td');
                    currentMilspecCell.textContent = data.currentUser.data.stats.milspec;
                    currentMilspecCell.className = 'milspec-count';
                    currentUserRow.appendChild(currentMilspecCell);
                    
                    const currentIndustrialCell = document.createElement('td');
                    currentIndustrialCell.textContent = data.currentUser.data.stats.industrial;
                    currentIndustrialCell.className = 'industrial-count';
                    currentUserRow.appendChild(currentIndustrialCell);
                    
                    const currentTotalCell = document.createElement('td');
                    currentTotalCell.textContent = data.currentUser.data.stats.total;
                    currentUserRow.appendChild(currentTotalCell);
                    
                    leaderboardBody.appendChild(currentUserRow);
                }
            }
        }
    } catch (error) {
        console.error('获取排行榜失败:', error);
    }
}

// 导出函数
export { loadHistory, saveHistory, addToHistory, updateHistoryDisplay, clearHistory, updateLeaderboard, history };