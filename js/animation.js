// 动画处理模块
import { startRollSound, stopRollSound, updateRollSpeed, playDropSound } from './audio.js';
import { config } from './config.js';
import { addToHistory, loadHistory } from './history.js';
import { fetchRandomWiki } from './wiki.js';

let isSpinning = false;
let lastItemIndex = -1; // 跟踪上一个经过的物品索引

/**
 * 创建抽取项目
 * @returns {Array} 返回创建的项目数组
 */
async function createItems() {
    try {
        const response = await fetch('/spin');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            return data.items;
        } else {
            throw new Error('获取抽奖结果失败');
        }
    } catch (error) {
        console.error('抽奖请求出错:', error.message);
        return [];
    }
}

/**
 * 开始抽取动画
 */
async function startSpinAnimation() {
    if (isSpinning) return;

    // 显示知识学习模态框
    const wikiModal = document.getElementById('wikiModal');
    const wikiTitle = document.getElementById('wikiTitle');
    const wikiImage = document.getElementById('wikiImage');
    const wikiDescription = document.getElementById('wikiDescription');
    const wikiExtract = document.getElementById('wikiExtract');
    const wikiTimer = document.getElementById('wikiTimer');
    const wikiContinueButton = document.getElementById('wikiContinueButton');

    try {
        // 获取随机维基百科知识
        const wikiData = await fetchRandomWiki();
        
        // 更新模态框内容
        wikiTitle.textContent = wikiData.title;
        if (wikiData.thumbnail) {
            wikiImage.src = wikiData.thumbnail;
            wikiImage.style.display = 'block';
        } else {
            wikiImage.style.display = 'none';
        }
        wikiDescription.textContent = wikiData.description;
        wikiExtract.textContent = wikiData.extract;
        
        // 重置继续按钮状态
        wikiContinueButton.disabled = true;
        
        // 显示模态框
        wikiModal.style.display = 'block';

        // 10秒倒计时
        let timeLeft = 10;
        const timerInterval = setInterval(() => {
            wikiTimer.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                // 启用继续按钮
                wikiContinueButton.disabled = false;
            }
            timeLeft--;
        }, 1000);
        
        // 添加继续按钮点击事件
        wikiContinueButton.onclick = () => {
            if (!wikiContinueButton.disabled) {
                wikiModal.style.display = 'none';
                startSpinProcess(); // 开始抽奖流程
            }
        };

    } catch (error) {
        console.error('获取维基百科知识失败:', error);
        startSpinProcess(); // 如果获取知识失败，直接开始抽奖
    }
}

// 将原有的抽奖逻辑移到单独的函数中
async function startSpinProcess() {
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.style.transition = 'none';
    itemsContainer.style.transform = 'translateX(0)';

    // 清空之前的物品
    itemsContainer.innerHTML = '';

    const response = await fetch(`/spin?userId=${window.userId}&token=${window.userToken}`);
    if (!response.ok) {
        console.error('获取抽奖结果失败');
        return;
    }
    
    const data = await response.json();
    if (!data.success) {
        console.error('获取抽奖结果失败');
        return;
    }
    
    const items = data.items;
    const winningItem = data.winningItem;
    
    // 添加物品到容器，确保至少显示10个物品以实现滚动效果
    const displayItems = [...items, ...items, ...items, ...items, ...items];
    displayItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `item ${item.type}`;
        if (item.isWinner) {
            itemElement.classList.add('winner');
        }
        
        const imgElement = document.createElement('img');
        imgElement.src = item.image;
        imgElement.alt = item.type;
        
        itemElement.appendChild(imgElement);
        itemsContainer.appendChild(itemElement);
    });

    isSpinning = true;
    document.getElementById('spinButton').disabled = true;

    // 开始播放滚动音效
    startRollSound();

    setTimeout(() => {
        const itemWidth = 210; // 每个物品的宽度（包括margin）
        const containerWidth = document.querySelector('.container').offsetWidth;
        const selectorPosition = containerWidth / 2; // 选择器在容器中间
        const itemsToShow = Math.floor(containerWidth / itemWidth);
        
        // 计算中奖物品应该在的位置（第二个位置）
        const targetPosition = selectorPosition - itemWidth / 2;
        
        // 找到中奖物品的索引
        let winnerIndex = -1;
        for (let i = 0; i < displayItems.length; i++) {
            if (displayItems[i].isWinner) {
                winnerIndex = i;
                break;
            }
        }
        
        // 计算最终偏移量，使中奖物品停在选择器位置
        const finalOffset = winnerIndex * itemWidth - targetPosition;

        // 先快速旋转一整圈
        const fullRoundOffset = displayItems.length * itemWidth; // 完整一圈的长度
        
        // 设置快速旋转的CSS过渡效果
        itemsContainer.style.transition = 'transform 0.8s cubic-bezier(0.1, 0.7, 0.9, 1)';
        itemsContainer.style.transform = `translateX(-${fullRoundOffset}px)`;
        
        // 快速旋转一整圈后，再进行原有的动画逻辑
        setTimeout(() => {
            // 重置过渡效果，立即回到起点
            itemsContainer.style.transition = 'none';
            itemsContainer.style.transform = 'translateX(0)';
            
            // 强制重绘
            void itemsContainer.offsetWidth;
            
            // 先快速滚动一圈
            const oneRoundOffset = displayItems.length / 5 * itemWidth; // 一圈的长度
            
            // 设置快速滚动的CSS过渡效果
            itemsContainer.style.transition = 'transform 1s cubic-bezier(0.2, 0.4, 0.8, 0.9)';
            itemsContainer.style.transform = `translateX(-${oneRoundOffset}px)`;
            
            // 快速滚动一圈后，再进入减速动画
            setTimeout(() => {
                // 重置过渡效果，立即回到起点
                itemsContainer.style.transition = 'none';
                itemsContainer.style.transform = 'translateX(0)';
                
                // 强制重绘
                void itemsContainer.offsetWidth;
                
                // 设置最终减速动画的CSS过渡效果
                itemsContainer.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)';
                itemsContainer.style.transform = `translateX(-${finalOffset}px)`;
            }, 1000);
        }, 800);

        const startTime = performance.now();
        const duration = 5000;

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 计算当前滚动位置
            const itemWidth = 210;
            const currentOffset = progress * finalOffset;
            const currentItemIndex = Math.floor(currentOffset / itemWidth);
            
            // 检测是否经过了新的物品，如果是则中断当前音效并重新播放
            if (currentItemIndex !== lastItemIndex) {
                lastItemIndex = currentItemIndex;
                // 中断当前音效并重新播放
                startRollSound();
            }
            
            // 更新音效速度和音量
            updateRollSpeed(progress);
            
            // 在动画进度到达70%时停止音效，为最终结果展示创造更自然的过渡
            if (progress >= 0.7) {
                stopRollSound();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isSpinning = false;
                lastItemIndex = -1; // 重置索引
                
                // 等待一小段时间确保音效完全停止后再显示结果
                setTimeout(() => {
                    // 显示中奖结果
                    showResult(winningItem);
                    playDropSound(winningItem.type);
                }, 100);
                
                // 添加中奖标记
                const selector = document.querySelector('.selector');
                selector.classList.add('active');
                
                // 历史记录现在由后端自动添加，不再需要前端调用
                // 加载最新的历史记录
                if (window.currentUser) {
                    loadHistory();
                }
            }
        }

        requestAnimationFrame(animate);
    }, 50);
}

/**
 * 显示抽取结果
 * @param {Object} item - 抽取到的物品
 */
function showResult(item) {
    playDropSound(item.type);
    const resultModal = document.getElementById('resultModal');
    const resultImage = document.getElementById('resultImage');
    resultImage.src = item.image;
    resultImage.className = `result-image ${item.type}`;
    resultModal.style.display = 'flex';
}

// 导出函数
export {
    createItems,
    startSpinAnimation,
    showResult
};