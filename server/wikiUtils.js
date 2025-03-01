const https = require('https');
const fs = require('fs');
const path = require('path');

// 确保目录存在
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// 下载图片并保存到本地
async function downloadImage(imageUrl, localPath) {
    return new Promise((resolve, reject) => {
        // 确保目录存在
        ensureDirectoryExists(path.dirname(localPath));

        const file = fs.createWriteStream(localPath);

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://zh.wikipedia.org/'
            }
        };

        https.get(imageUrl, options, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`下载图片失败，状态码: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(localPath);
            });
        }).on('error', (err) => {
            fs.unlink(localPath, () => {});
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(localPath, () => {});
            reject(err);
        });
    });
}

module.exports = {
    downloadImage,
    ensureDirectoryExists
};