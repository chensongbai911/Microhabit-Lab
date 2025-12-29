/**
 * 云函数全局响应格式规范
 * 所有云函数都应该调用此模块来构建统一的返回结构
 */

/**
 * 成功响应
 * @param {*} data 业务数据
 * @param {string} message 用户友好提示
 */
function success (data = null, message = '操作成功') {
  return {
    success: true,
    code: 0,
    message,
    data
  };
}

/**
 * 失败响应 - 系统错误
 * @param {string} message 用户友好提示
 * @param {*} error 技术错误日志
 */
function systemError (message = '系统错误，请稍后重试', error = null) {
  return {
    success: false,
    code: -1,
    message,
    error: error?.message || error
  };
}

/**
 * 失败响应 - 业务错误
 * @param {number} code 业务码（1001+）
 * @param {string} message 用户友好提示
 * @param {*} data 额外数据
 */
function businessError (code = 1000, message = '请求错误', data = null) {
  return {
    success: false,
    code: Math.max(1001, code),
    message,
    data
  };
}

/**
 * 业务码定义
 */
const CODES = {
  SUCCESS: 0,
  SYSTEM_ERROR: -1,
  EXCEED_LIMIT: 1001,        // 超出限制（习惯数、权限等）
  ALREADY_DONE: 1002,         // 重复操作（今日已完成目标）
  INVALID_STATE: 1003,        // 无效状态（习惯已结束）
  PARAM_ERROR: 1004,          // 参数校验失败
  NOT_FOUND: 1005,            // 资源不存在
  UNAUTHORIZED: 1006          // 权限不足
};

module.exports = {
  success,
  systemError,
  businessError,
  CODES
};
