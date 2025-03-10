// 主要逻辑模块
import { config } from './config.js';
import { startRollSound, stopRollSound } from './audio.js';
import { createItems, startSpinAnimation, showResult } from './animation.js';
import { loadHistory, saveHistory, addToHistory, updateHistoryDisplay, clearHistory, updateLeaderboard, history } from './history.js';

// DOM 元素
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const userInfo = document.getElementById('userInfo');
const spinButton = document.getElementById('spinButton');
const resultModal = document.getElementById('resultModal');
const continueButton = document.getElementById('continueButton');
const leaderboardButton = document.getElementById('leaderboardButton');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboard = document.getElementById('closeLeaderboard');

// 全局变量存储用户信息
window.currentUser = null;
window.userId = null;
window.userToken = null;

// 简单的Base64编码和解码函数
function encodePassword(password) {
    return btoa(password);
}

function decodePassword(encodedPassword) {
    return atob(encodedPassword);
}

// 保存用户登录信息到本地
function saveUserCredentials(username, password, userId, token) {
    const encodedPassword = encodePassword(password);
    localStorage.setItem('carSimulator_username', username);
    localStorage.setItem('carSimulator_password', encodedPassword);
    localStorage.setItem('carSimulator_userId', userId);
    localStorage.setItem('carSimulator_token', token);
}

// 获取保存的用户登录信息
function getSavedCredentials() {
    const username = localStorage.getItem('carSimulator_username');
    const encodedPassword = localStorage.getItem('carSimulator_password');
    const userId = localStorage.getItem('carSimulator_userId');
    const token = localStorage.getItem('carSimulator_token');
    
    if (username && encodedPassword && userId && token) {
        return {
            username,
            password: decodePassword(encodedPassword),
            userId,
            token
        };
    }
    return null;
}

// 清除保存的登录信息
function clearSavedCredentials() {
    localStorage.removeItem('carSimulator_username');
    localStorage.removeItem('carSimulator_password');
    localStorage.removeItem('carSimulator_userId');
    localStorage.removeItem('carSimulator_token');
}

// 导入工具函数
import { fetchApi } from './utils.js';

// 登录处理
loginButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        const data = await fetchApi('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        }, '登录失败，请重试');
        
        if (data && data.success) {
            window.currentUser = username;
            window.userId = data.userId;
            window.userToken = data.token;
            loginModal.style.display = 'none';
            userInfo.textContent = `当前用户: ${username}`;
            loadHistory();
            
            // 保存登录信息到本地
            saveUserCredentials(username, password, data.userId, data.token);
        }
    } else {
        alert('请输入用户名和密码');
    }
});

// 注册处理
registerButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        const data = await fetchApi('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        }, '注册失败，请重试');
        
        if (data && data.success) {
            alert('注册成功，请登录');
            usernameInput.value = username;
            passwordInput.value = '';
        }
    } else {
        alert('请输入用户名和密码');
    }
});

// 添加退出登录功能
const logoutButton = document.createElement('button');
logoutButton.textContent = '退出登录';
logoutButton.className = 'logout-button';
logoutButton.addEventListener('click', () => {
    if (confirm('确定要退出登录吗？')) {
        // 清除当前用户信息
        window.currentUser = null;
        window.userId = null;
        window.userToken = null;
        userInfo.textContent = '';
        
        // 清除本地存储的登录信息
        clearSavedCredentials();
        
        // 显示登录模态框
        loginModal.style.display = 'flex';
    }
});

// 将退出按钮添加到页面
document.querySelector('.container').parentNode.insertBefore(logoutButton, document.querySelector('.container').nextSibling);

// 继续按钮点击事件
continueButton.addEventListener('click', () => {
    resultModal.style.display = 'none';
    spinButton.disabled = false;
});

// 抽取按钮点击事件
spinButton.addEventListener('click', () => {
    if (!window.currentUser) {
        loginModal.style.display = 'flex';
        return;
    }
    startSpinAnimation();
});

// 排行榜按钮点击事件
leaderboardButton.addEventListener('click', () => {
    updateLeaderboard();
    leaderboardModal.style.display = 'flex';
});

// 关闭排行榜按钮点击事件
closeLeaderboard.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});

// 在页面卸载时停止音效
window.addEventListener('beforeunload', () => {
    stopRollSound();
});

// 使用保存的凭据自动登录
async function autoLogin(credentials) {
    const data = await fetchApi('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            username: credentials.username, 
            password: credentials.password 
        })
    }, '自动登录失败');
    
    if (data && data.success) {
        window.currentUser = credentials.username;
        window.userId = data.userId;
        window.userToken = data.token;
        loginModal.style.display = 'none';
        userInfo.textContent = `当前用户: ${credentials.username}`;
        loadHistory();
        return true;
    } else {
        // 清除无效的保存凭据
        clearSavedCredentials();
        return false;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 创建初始物品
    const itemsContainer = document.getElementById('itemsContainer');
    const items = await createItems();
    
    if (items && Array.isArray(items)) {
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `item ${item.type}`;
            
            const imgElement = document.createElement('img');
            imgElement.src = item.image;
            imgElement.alt = item.type;
            
            itemElement.appendChild(imgElement);
            itemsContainer.appendChild(itemElement);
        });
    }
    
    // 检查是否有保存的登录信息
    const savedCredentials = getSavedCredentials();
    if (savedCredentials) {
        // 尝试自动登录
        const loginSuccess = await autoLogin(savedCredentials);
        if (!loginSuccess) {
            // 自动登录失败，显示登录模态框
            loginModal.style.display = 'flex';
        }
    } else {
        // 没有保存的登录信息，显示登录模态框
        loginModal.style.display = 'flex';
    }
});