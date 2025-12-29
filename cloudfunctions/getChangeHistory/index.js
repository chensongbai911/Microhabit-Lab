// 云函数: 获取习惯变更历史
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const { user_habit_id, limit = 50 } = event;

  if (!user_habit_id) {
    return {
      code: -1,
      message: '参数不完整: 需要 user_habit_id'
    };
  }

  try {
    // 查询变更历史，按时间倒序
    const res = await db.collection('habit_change_logs')
      .where({
        user_habit_id: user_habit_id
      })
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return {
      code: 0,
      message: '获取变更历史成功',
      data: {
        change_logs: res.data || [],
        total: res.data ? res.data.length : 0
      }
    };
  } catch (error) {
    console.error('获取变更历史失败:', error);
    return {
      code: -1,
      message: '获取变更历史失败: ' + error.message
    };
  }
};
