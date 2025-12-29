const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化用户
 * 首次登录创建用户记录,后续登录更新最后登录时间
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 查询用户是否已存在
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .get();

    const now = new Date();

    if (users.length === 0) {
      // 首次登录,创建用户
      const result = await db.collection('users').add({
        data: {
          _openid: openid,
          register_time: now,
          last_login_time: now,
          member_status: 0,
          member_expire_time: null,
          reminder_settings: {
            enabled: false,
            time1: '08:00',
            time2: '20:00'
          },
          created_at: now,
          updated_at: now
        }
      });

      return {
        code: 0,
        message: '用户创建成功',
        data: {
          _id: result._id,
          _openid: openid,
          member_status: 0,
          member_expire_time: null,
          is_new_user: true
        }
      };
    } else {
      // 已存在,更新最后登录时间
      const user = users[0];

      await db.collection('users')
        .doc(user._id)
        .update({
          data: {
            last_login_time: now,
            updated_at: now
          }
        });

      // 检查会员是否过期
      let memberStatus = user.member_status;
      if (memberStatus === 1 && user.member_expire_time) {
        if (new Date(user.member_expire_time) < now) {
          // 会员已过期,降级为普通用户
          memberStatus = 0;
          await db.collection('users')
            .doc(user._id)
            .update({
              data: {
                member_status: 0
              }
            });
        }
      }

      return {
        code: 0,
        message: '登录成功',
        data: {
          _id: user._id,
          _openid: openid,
          member_status: memberStatus,
          member_expire_time: user.member_expire_time,
          is_new_user: false
        }
      };
    }
  } catch (error) {
    console.error('initUser error:', error);
    return {
      code: -1,
      message: '初始化用户失败',
      error: error.message
    };
  }
};
