const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');
const app = express();
const port = 3000;
const { downloadImage } = require('./server/wikiUtils');
const { checkWikiContent } = require('./server/sensitiveWords');

// 维基百科知识缓存
let wikiCache = [];
// const CACHE_SIZE = 100;
// const CACHE_THRESHOLD = 20;
const CACHE_SIZE = 2;
const CACHE_THRESHOLD = 1;
let isRefilling = false;

// 确保wiki图片目录存在
const wikiImagesDir = path.join(__dirname, 'public', 'wiki-images');

// 清理wiki图片目录
function cleanWikiImagesDir() {
    if (fs.existsSync(wikiImagesDir)) {
        const files = fs.readdirSync(wikiImagesDir);
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(wikiImagesDir, file));
                console.log(`已删除wiki图片: ${file}`);
            } catch (error) {
                console.error(`删除wiki图片失败: ${file}`, error);
            }
        }
        console.log('wiki图片目录清理完成');
    }
}

// 服务器启动时清理wiki图片
cleanWikiImagesDir();

// 获取随机维基百科知识
async function fetchRandomWiki() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'zh.wikipedia.org',
            path: '/api/rest_v1/page/random/summary',
            headers: {
                'User-Agent': 'RandomCar/1.0'
            }
        };

        const makeRequest = (requestOptions) => {
            https.get(requestOptions, (res) => {
                // 处理重定向
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
                    if (res.headers.location) {
                        console.log(`重定向到: ${res.headers.location}`);
                        // 解析重定向URL
                        const redirectUrl = new URL(res.headers.location.startsWith('http') ? 
                            res.headers.location : 
                            `https://${requestOptions.hostname}${res.headers.location}`);
                        
                        // 创建新的请求选项
                        const newOptions = {
                            hostname: redirectUrl.hostname,
                            path: redirectUrl.pathname + redirectUrl.search,
                            headers: options.headers
                        };
                        
                        // 跟随重定向
                        return makeRequest(newOptions);
                    }
                }
                
                // 检查状态码
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP状态码: ${res.statusCode} ${res.statusMessage}`));
                }
                
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', async () => {
                    try {
                        // 检查数据是否为空
                        if (!data.trim()) {
                            return reject(new Error('收到空响应'));
                        }
                        
                        const wikiData = JSON.parse(data);
                        
                        // 生成唯一的图片文件名
                        const imageId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                        let localThumbnailPath = null;
                        let localThumbnailUrl = null;
                        
                        // 如果有缩略图，下载并保存到本地
                        if (wikiData.thumbnail && wikiData.thumbnail.source) {
                            const imageUrl = wikiData.thumbnail.source;
                            const imageExt = path.extname(new URL(imageUrl).pathname) || '.jpg';
                            localThumbnailPath = path.join(wikiImagesDir, `${imageId}${imageExt}`);
                            
                            try {
                                await downloadImage(imageUrl, localThumbnailPath);
                                // 转换为Web可访问的URL路径
                                localThumbnailUrl = `/wiki-images/${path.basename(localThumbnailPath)}`;
                                console.log(`图片已保存到: ${localThumbnailPath}`);
                            } catch (error) {
                                console.error('下载图片失败:', error);
                                // 如果下载失败，仍然使用原始URL
                                localThumbnailUrl = wikiData.thumbnail.source;
                            }
                        }
                        
                        const processedWikiData = {
                            title: wikiData.title,
                            description: wikiData.description || '',
                            extract: wikiData.extract || '',
                            thumbnail: localThumbnailUrl,
                            originalThumbnail: wikiData.thumbnail ? wikiData.thumbnail.source : null,
                            url: wikiData.content_urls.desktop.page
                        };
                        
                        // 检查是否包含敏感内容
                        if (checkWikiContent(processedWikiData)) {
                            console.log('检测到敏感内容，跳过此条目');
                            // 如果下载了图片，删除它
                            if (localThumbnailPath && fs.existsSync(localThumbnailPath)) {
                                try {
                                    fs.unlinkSync(localThumbnailPath);
                                    console.log(`已删除敏感内容图片: ${localThumbnailPath}`);
                                } catch (error) {
                                    console.error(`删除敏感内容图片失败: ${localThumbnailPath}`, error);
                                }
                            }
                            // 重新获取一个新的条目
                            return makeRequest(options);
                        }
                        
                        resolve(processedWikiData);
                    } catch (error) {
                        console.error('解析JSON失败:', error.message);
                        console.error('收到的数据:', data.substring(0, 200) + '...');
                        reject(error);
                    }
                });
            }).on('error', (err) => {
                console.error('HTTP请求错误:', err.message);
                reject(err);
            });
        };
        
        makeRequest(options);
    });
}

// 异步填充缓存
async function refillCache() {
    if (isRefilling || wikiCache.length >= CACHE_SIZE) return;
    
    isRefilling = true;
    try {
        while (wikiCache.length < CACHE_SIZE) {
            const wikiData = await fetchRandomWiki();
            wikiCache.push(wikiData);
            // 添加延迟以避免请求过于频繁
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } catch (error) {
        console.error('填充维基百科缓存失败:', error);
    } finally {
        isRefilling = false;
    }
}

// 初始填充缓存
refillCache();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// 获取随机维基百科知识的API端点
app.get('/api/wiki/random', (req, res) => {
    if (wikiCache.length === 0) {
        return res.status(503).json({
            success: false,
            message: '维基百科知识缓存为空，请稍后再试'
        });
    }

    // 从缓存中随机获取一条知识
    const randomIndex = Math.floor(Math.random() * wikiCache.length);
    const wikiData = wikiCache[randomIndex];

    // 从缓存中移除已使用的知识
    wikiCache.splice(randomIndex, 1);

    // 如果缓存数量低于阈值，触发异步补充
    if (wikiCache.length < CACHE_THRESHOLD) {
        refillCache();
    }

    res.json({
        success: true,
        data: wikiData
    });
});

// 删除维基百科图片的API端点
app.post('/api/wiki/delete-image', (req, res) => {
    const { imagePath } = req.body;
    
    if (!imagePath || !imagePath.startsWith('/wiki-images/')) {
        return res.status(400).json({
            success: false,
            message: '无效的图片路径'
        });
    }

    const localImagePath = path.join(__dirname, 'public', imagePath);
    if (fs.existsSync(localImagePath)) {
        try {
            fs.unlinkSync(localImagePath);
            console.log(`已删除图片: ${localImagePath}`);
            res.json({ success: true });
        } catch (error) {
            console.error(`删除图片失败: ${localImagePath}`, error);
            res.status(500).json({
                success: false,
                message: '删除图片失败'
            });
        }
    } else {
        res.json({ success: true }); // 如果图片不存在，也返回成功
    }
});

// 抽奖配置
const config = {
    covert: {
        probability: 0.01,
        count: 21,
        path: './public/covert/pic'
    },
    classified: {
        probability: 0.03,
        count: 34,
        path: './public/classified/pic'
    },
    restricted: {
        probability: 0.1,
        count: 36,
        path: './public/restricted/pic'
    },
    milspec: {
        probability: 0.3,
        count: 78,
        path: './public/milspec/pic'
    },
    industrial: {
        probability: 0.56,
        count: 162,
        path: './public/industrial/pic'
    }
};

// 创建SQLite数据库连接
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已连接到SQLite数据库');
        // 创建用户表
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            token TEXT,
            covert INTEGER DEFAULT 0,
            classified INTEGER DEFAULT 0,
            restricted INTEGER DEFAULT 0,
            milspec INTEGER DEFAULT 0,
            industrial INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            last_spin_time TIMESTAMP DEFAULT NULL
        )`);
        
        // 创建用户收藏表
        db.run(`CREATE TABLE IF NOT EXISTS user_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            image_index INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    }
});

// 存储用户记录
let records = [];

// 生成随机token
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 注册接口
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 检查当前用户总数
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        
        if (row.count >= 10000) {
            return res.status(403).json({ success: false, message: '注册人数已达到上限（10000人），暂不接受新用户注册' });
        }

        // 检查用户名是否已存在
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            if (row) {
                return res.status(409).json({ success: false, message: '用户名已存在' });
            }

            const token = generateToken();

            // 创建新用户
            db.run('INSERT INTO users (username, password, token) VALUES (?, ?, ?)', [username, password, token], function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: '服务器错误' });
                }
                res.json({
                    success: true,
                    message: '注册成功',
                    userId: this.lastID,
                    token: token
                });
            });
        });
    });
});

// 登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 验证用户名和密码
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        // 生成新的token
        const newToken = generateToken();
        
        // 更新用户token
        db.run('UPDATE users SET token = ? WHERE id = ?', [newToken, user.id], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: '更新token失败' });
            }
            
            res.json({ 
                success: true,
                message: '登录成功',
                userId: user.id,
                token: newToken,
                stats: {
                    username: user.username,
                    covert: user.covert,
                    classified: user.classified,
                    restricted: user.restricted,
                    milspec: user.milspec,
                    industrial: user.industrial,
                    total: user.total
                }
            });
        });
    });
});

// 添加记录接口
app.post('/addRecord', (req, res) => {
    const { userId, token, type, imageIndex } = req.body;
    if (!userId || !token || !type) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // 验证用户token
    db.get('SELECT * FROM users WHERE id = ? AND token = ?', [userId, token], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: '用户验证失败' });
        }

        // 更新用户记录
        db.run(`UPDATE users SET ${type} = ${type} + 1, total = total + 1 WHERE id = ?`, [userId], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: '更新记录失败' });
            }

            // 添加到用户收藏
            db.get(`SELECT COUNT(*) as count FROM user_collections WHERE user_id = ? AND type = ?`, [userId, type], (err, result) => {
                if (err) {
                    return res.status(500).json({ success: false, message: '查询收藏失败' });
                }

                // 如果该类型的收藏已达到5个，则不再添加
                if (result.count >= 5) {
                    // 获取更新后的用户数据
                    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, updatedUser) => {
                        if (err || !updatedUser) {
                            return res.status(500).json({ success: false, message: '获取用户数据失败' });
                        }
                        
                        // 获取用户收藏
                        db.all('SELECT * FROM user_collections WHERE user_id = ? ORDER BY type, created_at DESC', [userId], (err, collections) => {
                            if (err) {
                                return res.status(500).json({ success: false, message: '获取收藏失败' });
                            }
                            
                            res.json({ 
                                success: true, 
                                stats: {
                                    username: updatedUser.username,
                                    covert: updatedUser.covert,
                                    classified: updatedUser.classified,
                                    restricted: updatedUser.restricted,
                                    milspec: updatedUser.milspec,
                                    industrial: updatedUser.industrial,
                                    total: updatedUser.total
                                },
                                collections: collections
                            });
                        });
                    });
                } else {
                    // 添加到收藏
                    db.run('INSERT INTO user_collections (user_id, type, image_index) VALUES (?, ?, ?)', 
                        [userId, type, imageIndex], function(err) {
                        if (err) {
                            return res.status(500).json({ success: false, message: '添加收藏失败' });
                        }
                        
                        // 获取更新后的用户数据
                        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, updatedUser) => {
                            if (err || !updatedUser) {
                                return res.status(500).json({ success: false, message: '获取用户数据失败' });
                            }
                            
                            // 获取用户收藏
                            db.all('SELECT * FROM user_collections WHERE user_id = ? ORDER BY type, created_at DESC', [userId], (err, collections) => {
                                if (err) {
                                    return res.status(500).json({ success: false, message: '获取收藏失败' });
                                }
                                
                                res.json({ 
                                    success: true, 
                                    stats: {
                                        username: updatedUser.username,
                                        covert: updatedUser.covert,
                                        classified: updatedUser.classified,
                                        restricted: updatedUser.restricted,
                                        milspec: updatedUser.milspec,
                                        industrial: updatedUser.industrial,
                                        total: updatedUser.total
                                    },
                                    collections: collections
                                });
                            });
                        });
                    });
                }
            });
        });
    });
});

// 获取用户收藏
app.get('/collections', (req, res) => {
    const userId = req.query.userId;
    const token = req.query.token;
    
    if (!userId || !token) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 验证用户token
    db.get('SELECT * FROM users WHERE id = ? AND token = ?', [userId, token], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: '用户验证失败' });
        }
        
        // 获取用户收藏
        db.all('SELECT * FROM user_collections WHERE user_id = ? ORDER BY type, created_at DESC', [userId], (err, collections) => {
            if (err) {
                return res.status(500).json({ success: false, message: '获取收藏失败' });
            }
            
            res.json({ 
                success: true, 
                collections: collections
            });
        });
    });
});

// 生成随机抽奖结果
app.get('/spin', (req, res) => {
    const userId = req.query.userId;
    const token = req.query.token;
    
    if (!userId || !token) {
        return res.json({ success: true, items: [], message: '未登录用户' });
    }
    
    // 验证用户token
    db.get('SELECT * FROM users WHERE id = ? AND token = ?', [userId, token], (err, user) => {
        if (err || !user) {
            return res.json({ success: true, items: [], message: '用户验证失败' });
        }

        // 检查用户上次抽奖时间
        const now = new Date();
        const lastSpinTime = user.last_spin_time ? new Date(user.last_spin_time) : null;
        
        if (lastSpinTime && (now - lastSpinTime) < 10000) { // 10秒冷却时间
            const remainingTime = Math.ceil((10000 - (now - lastSpinTime)) / 1000);
            return res.json({
                success: false,
                message: `请等待${remainingTime}秒后再次抽奖`
            });
        }
    
        const items = [];
        const totalProbability = Object.values(config).reduce((sum, item) => sum + item.probability, 0);
    
        // 先生成中奖结果
        const random = Math.random() * totalProbability;
        let currentSum = 0;
        let selectedType = null;
    
        for (const [type, item] of Object.entries(config)) {
            currentSum += item.probability;
            if (random <= currentSum) {
                selectedType = type;
                break;
            }
        }
    
        const winningConfig = config[selectedType];
        const winningIndex = Math.floor(Math.random() * winningConfig.count) + 1;
        const winningItem = {
            type: selectedType,
            image: `${winningConfig.path}${winningIndex}.png`,
            isWinner: true
        };
    
        // 生成30个随机项目
        const totalItems = 30;
        // 随机选择一个位置放置中奖物品（确保它在可见区域内，比如第10-20个位置之间）
        const winningPosition = Math.floor(Math.random() * 10) + 10;
        
        for (let i = 0; i < totalItems; i++) {
            // 在指定位置放置中奖物品
            if (i === winningPosition) {
                items.push(winningItem);
                continue;
            }
    
            // 生成随机物品
            const randomForItem = Math.random() * totalProbability;
            let currentSumForItem = 0;
            let selectedTypeForItem = null;
    
            for (const [type, item] of Object.entries(config)) {
                currentSumForItem += item.probability;
                if (randomForItem <= currentSumForItem) {
                    selectedTypeForItem = type;
                    break;
                }
            }
    
            const itemConfig = config[selectedTypeForItem];
            const randomIndex = Math.floor(Math.random() * itemConfig.count) + 1;
            items.push({
                type: selectedTypeForItem,
                image: `${itemConfig.path}${randomIndex}.png`,
                isWinner: false
            });
        }
    
        // 自动记录中奖物品到历史记录
        // 更新用户记录和最后抽奖时间
        const currentTime = new Date().toISOString();
        db.run(`UPDATE users SET ${selectedType} = ${selectedType} + 1, total = total + 1, last_spin_time = ? WHERE id = ?`, [currentTime, userId], function(err) {
            if (err) {
                console.error('更新记录失败:', err);
                return res.json({ success: true, items, winningItem });
            }
    
            // 检查收藏数量并添加到收藏
            db.get(`SELECT COUNT(*) as count FROM user_collections WHERE user_id = ? AND type = ?`, [userId, selectedType], (err, result) => {
                if (err) {
                    console.error('查询收藏失败:', err);
                    return res.json({ success: true, items, winningItem });
                }
    
                // 如果该类型的收藏未达到5个，则添加到收藏
                if (result.count < 5) {
                    db.run('INSERT INTO user_collections (user_id, type, image_index) VALUES (?, ?, ?)', 
                        [userId, selectedType, winningIndex], (err) => {
                        if (err) {
                            console.error('添加收藏失败:', err);
                        }
                        res.json({ success: true, items, winningItem });
                    });
                } else {
                    res.json({ success: true, items, winningItem });
                }
            });
        });
    });
});

// 获取排行榜
app.get('/leaderboard', (req, res) => {
    const userId = req.query.userId;
    
    db.all('SELECT id, username, covert, classified, restricted, milspec, industrial, total FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: '获取排行榜失败1' });
        }

        const leaderboardData = users.map(user => ({
            username: user.username,
            stats: {
                covert: user.covert,
                classified: user.classified,
                restricted: user.restricted,
                milspec: user.milspec,
                industrial: user.industrial,
                total: user.total
            }
        }));

        // 按照总抽取次数排序
        leaderboardData.sort((a, b) => {
            // 先比较 covert（红色）数量
            if (b.stats.covert !== a.stats.covert) {
                return b.stats.covert - a.stats.covert;
            }
            // covert 相同，比较 classified（粉色）数量
            if (b.stats.classified !== a.stats.classified) {
                return b.stats.classified - a.stats.classified;
            }
            // classified 相同，比较 restricted（紫色）数量
            if (b.stats.restricted !== a.stats.restricted) {
                return b.stats.restricted - a.stats.restricted;
            }
            // restricted 相同，比较 milspec（蓝色）数量
            if (b.stats.milspec !== a.stats.milspec) {
                return b.stats.milspec - a.stats.milspec;
            }
            // milspec 相同，比较 industrial（浅蓝）数量
            return b.stats.industrial - a.stats.industrial;
        });

        // 查找当前用户的排名
        let currentUserRank = -1;
        let currentUserData = null;
        
        if (userId) {
            for (let i = 0; i < users.length; i++) {
                if (users[i].id == userId) {
                    currentUserRank = i + 1;
                    currentUserData = leaderboardData[i];
                    break;
                }
            }
        }
        
        // 只返回前50名用户
        const top50 = leaderboardData.slice(0, 50);
        
        // 如果当前用户不在前2名中，添加用户排名信息
        const result = {
            leaderboard: top50,
            currentUser: (currentUserRank > 50 && currentUserData) ? {
                rank: currentUserRank,
                data: {
                    username: currentUserData.username,
                    stats: currentUserData.stats
                }
            } : null
        };

        res.json(result);
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});