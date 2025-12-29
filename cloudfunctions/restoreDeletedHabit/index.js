// 云函数: 恢复已删除的习惯
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
    // 获取习惯信息
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
        message: '无权限恢复此习惯'
      };
    }

    if (habitRes.data.status !== 'deleted') {
      return {
        code: -1,
        message: '此习惯未被删除'
      };
    }

    // 检查恢复期限
    if (habitRes.data.recover_deadline && new Date().getTime() > habitRes.data.recover_deadline) {
      return {
        code: -1,
        message: '恢复期已过期，此习惯无法恢复'
      };
    }

    // 恢复习惯
    await db.collection('user_habits').doc(user_habit_id).update({
      data: {
        status: habitRes.data.status === 'deleted' ? 'active' : habitRes.data.status,
        deleted_at: null,
        deleted_timestamp: null,
        recover_deadline: null
      }
    });

    return {
      code: 0,
      message: '习惯已恢复',
      data: {
        habit_id: user_habit_id,
        name: habitRes.data.name
      }
    };
  } catch (error) {
    console.error('恢复习惯失败:', error);
    return {
      code: -1,
      message: '恢复失败: ' + error.message
    };
  }
};
