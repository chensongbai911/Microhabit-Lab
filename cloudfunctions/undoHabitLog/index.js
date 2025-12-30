const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const response = require('../utils/response');

/**
 * 撤销今日打卡（今日次数 -1，最低为0；若为0则删除当日记录）
 * @param {String} user_habit_id 习惯ID
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { user_habit_id } = event;

  try {
    if (!user_habit_id) {
      return response.businessError(response.CODES.PARAM_ERROR, '习惯ID不能为空');
    }

    const today = new Date().toISOString().split('T')[0];

    // 查询习惯，确保属于当前用户
    const { data: habits } = await db.collection('user_habits')
      .where({ _id: user_habit_id, _openid: openid })
      .get();

    if (!habits || habits.length === 0) {
      return response.businessError(response.CODES.NOT_FOUND, '习惯不存在');
    }

    // 查询今日打卡记录
    const { data: logs } = await db.collection('habit_logs')
      .where({ user_habit_id, date: today })
      .limit(1)
      .get();

    if (!logs || logs.length === 0) {
      return response.businessError(response.CODES.NOT_FOUND, '今天还没有打卡');
    }

    const log = logs[0];
    const newTimes = Math.max(0, (log.times || 0) - 1);

    if (newTimes === 0) {
      await db.collection('habit_logs').doc(log._id).remove();
    } else {
      await db.collection('habit_logs').doc(log._id).update({
        data: { times: newTimes, updated_at: new Date() }
      });
    }

    return response.success({ times: newTimes }, '撤销成功');
  } catch (error) {
    console.error('undoHabitLog error:', error);
    return response.systemError('撤销失败', error);
  }
};
