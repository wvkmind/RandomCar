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
    rollSound.currentTime = 0;
    rollSound.loop = true;
    rollSound.play();
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
    if (progress < 0.7) {
        const volume = Math.min(1, Math.max(0.3, 1 - progress));
        rollSound.volume = volume;
        
        // 随着进度增加，播放速度逐渐减慢
        const rate = Math.max(0.5, 1 - progress * 0.5);
        rollSound.playbackRate = rate;
    }
}

/**
 * 播放掉落音效
 * @param {string} rarity - 稀有度类型
 */
function playDropSound(rarity) {
    if (dropSounds[rarity]) {
        dropSounds[rarity].currentTime = 0;
        dropSounds[rarity].play();
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