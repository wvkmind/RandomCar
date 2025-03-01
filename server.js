const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

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
            covert INTEGER DEFAULT 0,
            classified INTEGER DEFAULT 0,
            restricted INTEGER DEFAULT 0,
            milspec INTEGER DEFAULT 0,
            industrial INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0
        )`);
    }
});

// 存储用户记录
let records = [];

// 注册接口
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 检查用户名是否已存在
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        if (row) {
            return res.status(409).json({ success: false, message: '用户名已存在' });
        }

        // 创建新用户
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: '注册失败' });
            }
            res.json({ 
                success: true, 
                message: '注册成功',
                userId: this.lastID,
                stats: {
                    username,
                    covert: 0,
                    classified: 0,
                    restricted: 0,
                    milspec: 0,
                    industrial: 0,
                    total: 0
                }
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

        res.json({ 
            success: true,
            message: '登录成功',
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

// 添加记录接口
app.post('/addRecord', (req, res) => {
    const { username, type } = req.body;
    if (!username || !type) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // 更新用户记录
    db.run(`UPDATE users SET ${type} = ${type} + 1, total = total + 1 WHERE username = ?`, [username], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: '更新记录失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 获取更新后的用户数据
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
            if (err || !user) {
                return res.status(500).json({ success: false, message: '获取用户数据失败' });
            }
            res.json({ 
                success: true, 
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

// 生成随机抽奖结果
app.get('/spin', (req, res) => {
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

    res.json({ success: true, items, winningItem });
});

// 获取排行榜
app.get('/leaderboard', (req, res) => {
    db.all('SELECT username, covert, classified, restricted, milspec, industrial, total FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: '获取排行榜失败' });
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

        res.json(leaderboardData);
    });
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});