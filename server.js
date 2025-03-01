const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 存储用户记录
const userStats = new Map(); // 使用 Map 存储用户统计数据
// 存储用户记录
let records = [];

// 登录接口
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (!userStats.has(username)) {
        userStats.set(username, {
            username,
            covert: 0,
            classified: 0,
            restricted: 0,
            milspec: 0,
            industrial: 0,
            total: 0
        });
    }
    res.json({ 
        success: true,
        stats: userStats.get(username)
    });
});

// 添加记录接口
app.post('/addRecord', (req, res) => {
    const { username, type } = req.body;
    const userStat = userStats.get(username);
    if (userStat) {
        userStat[type]++;
        userStat.total++;
        res.json({ success: true, stats: userStat });
    } else {
        res.status(404).json({ success: false, message: '用户不存在' });
    }
});

// 获取排行榜
app.get('/leaderboard', (req, res) => {
    const leaderboardData = Array.from(userStats.values()).map(user => ({
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


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});