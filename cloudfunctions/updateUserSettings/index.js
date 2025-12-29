// cloudfunctions/updateUserSettings/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 更新用户设置（包括提醒设置）
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { reminder_settings } = event;

  try {
    // 查找用户记录
    const userResult = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        code: 2001,
        message: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 更新用户设置
    const updateData = {
      updated_at: db.serverDate()
    };

    if (reminder_settings) {
      updateData.reminder_settings = reminder_settings;

      // 如果开启了提醒，记录订阅时间
      if (reminder_settings.enabled) {
        updateData.last_subscribe_time = db.serverDate();
      }
    }

    await db.collection('users')
      .doc(user._id)
      .update({
        data: updateData
      });

    return {
      success: true,
      data: {
        reminder_settings: updateData.reminder_settings
      }
    };

  } catch (error) {
    console.error('更新用户设置失败:', error);
    return {
      success: false,
      code: 5000,
      message: '服务器错误',
      error: error.message
    };
  }
};
