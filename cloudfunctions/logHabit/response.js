module.exports = {
  CODES: {
    PARAM_ERROR: 400,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_STATE: 409,
    ALREADY_DONE: 409
  },
  success (data = {}, message = 'ok') {
    return { code: 0, message, data };
  },
  businessError (code = 400, message = '请求错误', data = null) {
    return { code, message, data };
  },
  systemError (message = '系统错误', error = null) {
    return { code: 500, message, error: error ? String(error) : undefined };
  }
};
