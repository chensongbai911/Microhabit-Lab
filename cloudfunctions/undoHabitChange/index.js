// 云函数: 恢复习惯到指定的变更状态
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const { user_habit_id, change_log_id, user_id } = event;

  if (!user_habit_id || !change_log_id || !user_id) {
    return {
      code: -1,
      message: '参数不完整: 需要 user_habit_id, change_log_id, user_id'
    };
  }

  try {
    // 1. 获取目标变更记录
    const changeLogRes = await db.collection('habit_change_logs').doc(change_log_id).get();

    if (!changeLogRes.data) {
      return {
        code: -1,
        message: '未找到变更记录'
      };
    }

    const changeLog = changeLogRes.data;

    // 2. 验证权限：确认用户 ID 匹配
    const habitRes = await db.collection('user_habits').doc(user_habit_id).get();

    if (!habitRes.data || habitRes.data.user_id !== user_id) {
      return {
        code: -1,
        message: '无权限修改此习惯'
      };
    }

    // 3. 应用变更：将习惯字段恢复为 old_value
    const updateData = {};
    updateData[changeLog.field_changed] = changeLog.old_value;

    await db.collection('user_habits').doc(user_habit_id).update({
      data: {
        ...updateData,
        updated_at: db.serverDate()
      }
    });

    // 4. 记录撤销操作
    await db.collection('habit_change_logs').add({
      data: {
        user_habit_id,
        user_id,
        field_changed: 'undo',
        old_value: changeLog.new_value,
        new_value: changeLog.old_value,
        created_at: db.serverDate(),
        timestamp: new Date().getTime(),
        undo_of: change_log_id
      }
    });

    return {
      code: 0,
      message: '习惯已恢复到之前的状态',
      data: {
        restored_field: changeLog.field_changed,
        restored_value: changeLog.old_value
      }
    };
  } catch (error) {
    console.error('恢复习惯失败:', error);
    return {
      code: -1,
      message: '恢复习惯失败: ' + error.message
    };
  }
};
