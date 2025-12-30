const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 固定模板 ID（专注习惯完成通知）
const TEMPLATE_ID = 'FU13oXF--gvie10WCk7CQ9odtVTHNOjg16j_g65XKOI';

// 简单响应封装
function ok (data = {}, message = 'ok') {
  return { code: 0, message, data };
}
function fail (message = 'error', code = 500, data = null) {
  return { code, message, data };
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 支持外部传值，缺省时给一个示例值便于调试
  const {
    thing1 = '25 分钟',      // 专注时长
    thing2 = '3 次',         // 已完成次数
    time3 = '',              // 完成时间，格式 yyyy-MM-dd HH:mm
    thing4 = '番茄钟专注'   // 专注方法
  } = event || {};

  const now = new Date();
  const defaultTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeValue = time3 || defaultTime;

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: TEMPLATE_ID,
      miniprogram_state: 'trial', // 体验/开发环境用 trial 或 developer；正式发布可去掉
      page: 'pages/home/home',
      data: {
        thing1: { value: thing1 },
        thing2: { value: thing2 },
        time3: { value: timeValue },
        thing4: { value: thing4 }
      }
    });
    return ok({}, 'sent');
  } catch (e) {
    console.error('sendSubscribeMessage error', e);
    return fail(e.message || 'send fail', e.errCode || 500, { err: e });
  }
};
