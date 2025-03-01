// 工具函数模块

/**
 * 统一处理API错误消息
 * @param {Object} response - API响应对象
 * @param {string} defaultMessage - 默认错误消息
 */
export async function handleApiError(response, defaultMessage = '操作失败，请重试') {
    try {
        const data = await response.json();
        if (!response.ok || !data.success) {
            // 如果服务器返回了错误消息，就使用服务器的消息
            const errorMessage = data.message || defaultMessage;
            alert(errorMessage);
            return null;
        }
        return data;
    } catch (error) {
        console.error('API请求出错:', error);
        alert(defaultMessage);
        return null;
    }
}

/**
 * 统一处理API请求
 * @param {string} url - API地址
 * @param {Object} options - 请求选项
 * @param {string} defaultErrorMessage - 默认错误消息
 */
export async function fetchApi(url, options = {}, defaultErrorMessage = '操作失败，请重试') {
    try {
        const response = await fetch(url, options);
        return await handleApiError(response, defaultErrorMessage);
    } catch (error) {
        console.error('API请求出错:', error);
        alert(defaultErrorMessage);
        return null;
    }
}