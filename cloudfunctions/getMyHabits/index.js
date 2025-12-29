const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 获取用户的所有习惯
 * @param {String} status - 可选：'active'|'deleted'|'paused'|'completed'，默认为'active'
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { status = 'active' } = event;

  try {
    // 构建查询条件
    let query = db.collection('user_habits')
      .where({
        _openid: openid
      });

    // 如果指定了状态，添加状态过滤
    if (status) {
      query = query.where({
        status: status
      });
    }

    const { data: habits } = await query
      .orderBy('created_at', 'desc')
      .get();

    return {
      code: 0,
      message: 'success',
      data: habits
    };
  } catch (error) {
    console.error('获取用户习惯失败:', error);
    return {
      code: -1,
      message: error.message || '获取习惯列表失败',
      error
    };
  }
};
