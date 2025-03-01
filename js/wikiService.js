// 维基百科服务模块
import { fetchRandomWiki } from './wiki.js';

// 删除维基百科图片
async function deleteWikiImage(imagePath) {
    if (!imagePath || !imagePath.startsWith('/wiki-images/')) return;
    
    try {
        const response = await fetch('/api/wiki/delete-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('删除维基百科图片失败:', error);
        return false;
    }
}

export { deleteWikiImage };