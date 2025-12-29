// 云函数: 记录习惯变更历史
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const { user_habit_id, field_changed, old_value, new_value, user_id } = event;

  if (!user_habit_id || !field_changed || !user_id) {
    return {
      code: -1,
      message: '参数不完整: 需要 user_habit_id, field_changed, user_id'
    };
  }

  try {
    // 插入变更记录
    const changeRecord = {
      user_habit_id,
      user_id,
      field_changed,
      old_value,
      new_value,
      created_at: db.serverDate(),
      timestamp: new Date().getTime()
    };

    const result = await db.collection('habit_change_logs').add({
      data: changeRecord
    });

    return {
      code: 0,
      message: '变更记录已保存',
      data: {
        change_log_id: result._id,
        ...changeRecord
      }
    };
  } catch (error) {
    console.error('保存变更记录失败:', error);
    return {
      code: -1,
      message: '保存变更记录失败: ' + error.message
    };
  }
};
