// 云函数: 软删除习惯 (30天内可恢复)
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();

exports.main = async (event, context) => {
  const { user_habit_id, user_id } = event;

  if (!user_habit_id || !user_id) {
    return {
      code: -1,
      message: '参数不完整: 需要 user_habit_id, user_id'
    };
  }

  try {
    // 验证权限
    const habitRes = await db.collection('user_habits').doc(user_habit_id).get();

    if (!habitRes.data) {
      return {
        code: -1,
        message: '习惯不存在'
      };
    }

    if (habitRes.data.user_id !== user_id) {
      return {
        code: -1,
        message: '无权限删除此习惯'
      };
    }

    // 软删除: 标记 deleted_at 字段，30天后自动清理
    const deletedAt = new Date();
    const recoverDeadline = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.collection('user_habits').doc(user_habit_id).update({
      data: {
        deleted_at: db.serverDate(),
        deleted_timestamp: deletedAt.getTime(),
        recover_deadline: recoverDeadline.getTime(),
        status: 'deleted'
      }
    });

    return {
      code: 0,
      message: '习惯已删除，30天内可恢复',
      data: {
        deleted_at: deletedAt,
        recover_deadline: recoverDeadline
      }
    };
  } catch (error) {
    console.error('删除习惯失败:', error);
    return {
      code: -1,
      message: '删除失败: ' + error.message
    };
  }
};
