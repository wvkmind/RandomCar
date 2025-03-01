// 音频处理模块

// 预加载音效
const rollSound = new Audio('./music/Roll.mp3');
const dropSounds = {
    covert: new Audio('./music/drop5.mp3'),
    classified: new Audio('./music/drop4.mp3'),
    restricted: new Audio('./music/drop3.mp3'),
    milspec: new Audio('./music/drop2.mp3'),
    industrial: new Audio('./music/drop1.mp3')
};

let rollSoundInterval;
let currentSpeed = 50;

/**
 * 开始播放滚动音效
 */
function startRollSound() {
    // 先停止当前播放的音效
    rollSound.pause();
    // 重置音效位置
    rollSound.currentTime = 0;
    rollSound.loop = true;
    // 重新播放，并捕获可能的AbortError错误
    try {
        const playPromise = rollSound.play();
        
        // 处理play()返回的Promise
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // 忽略AbortError，这是由于play()被pause()中断导致的
                if (error.name !== 'AbortError') {
                    console.error('音频播放错误:', error);
                }
            });
        }
    } catch (error) {
        // 捕获其他可能的错误
        console.error('音频播放错误:', error);
    }
}

/**
 * 停止播放滚动音效
 */
function stopRollSound() {
    rollSound.pause();
    rollSound.currentTime = 0;
}

/**
 * 根据进度更新滚动音效速度
 * @param {number} progress - 动画进度 (0-1)
 */
function updateRollSpeed(progress) {
    // 根据进度调整音量和播放速度
    const volume = Math.min(1, Math.max(0.3, 1 - progress * 0.7));
    rollSound.volume = volume;
    
    // 调整播放速度曲线，使开始更快，然后快速减慢
    const initialSpeed = 5.0; // 提高初始速度
    const rate = Math.max(0.8, initialSpeed - (progress * progress * 4)); // 使用二次曲线使减速更加明显
    rollSound.playbackRate = rate;
}

/**
 * 播放掉落音效
 * @param {string} rarity - 稀有度类型
 */
function playDropSound(rarity) {
    if (dropSounds[rarity]) {
        dropSounds[rarity].currentTime = 0;
        try {
            const playPromise = dropSounds[rarity].play();
            
            // 处理play()返回的Promise
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 忽略AbortError
                    if (error.name !== 'AbortError') {
                        console.error('音频播放错误:', error);
                    }
                });
            }
        } catch (error) {
            // 捕获其他可能的错误
            console.error('音频播放错误:', error);
        }
    }
}

// 在页面卸载时停止音效
window.addEventListener('beforeunload', () => {
    stopRollSound();
});

// 导出音频函数
export {
    startRollSound,
    stopRollSound,
    updateRollSpeed,
    playDropSound
};