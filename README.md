# 微习惯实验室 - 项目开发指南

## 📁 项目结构

```
AABBCC/
├── miniprogram/                    # 小程序前端代码
│   ├── pages/                      # 页面目录
│   │   ├── home/                   # 今日习惯页
│   │   ├── habits/                 # 习惯库页
│   │   ├── stats/                  # 数据&我页
│   │   ├── create-habit/           # 新建习惯页
│   │   ├── habit-detail/           # 习惯详情页
│   │   └── membership/             # 会员页
│   ├── components/                 # 通用组件
│   ├── utils/                      # 工具函数
│   │   ├── date.js                 # 日期工具
│   │   ├── permission.js           # 权限检查
│   │   ├── cycle.js                # 周期管理
│   │   ├── util.js                 # 通用工具
│   │   └── constants.js            # 常量定义
│   ├── styles/                     # 全局样式
│   │   ├── variables.wxss          # CSS变量
│   │   └── common.wxss             # 通用样式
│   ├── assets/                     # 静态资源
│   ├── app.js                      # 应用入口
│   ├── app.json                    # 应用配置
│   ├── app.wxss                    # 全局样式
│   └── sitemap.json                # 站点地图
│
├── cloudfunctions/                 # 云函数
│   ├── initUser/                   # 用户初始化
│   ├── getTodayHabits/             # 获取今日习惯
│   ├── createHabit/                # 创建习惯
│   ├── logHabit/                   # 打卡
│   ├── getStats/                   # 获取统计数据
│   ├── getHabitDetail/             # 获取习惯详情
│   ├── updateHabitStatus/          # 更新习惯状态
│   ├── createPayment/              # 支付下单
│   ├── activateMembership/         # 会员激活
│   ├── getMyHabits/                # 我的习惯(云端权限安全)
│   └── initTemplates/              # 模板初始化(一次性)
│
├── project.config.json             # 项目配置
├── PROJECT_TASKS.md                # 任务清单
├── DATABASE_DESIGN.md              # 数据库设计
├── 微习惯实验室-需求文档-V1.0.md    # 产品需求
├── UI.md                           # UI设计规范
└── 微习惯实验室-首发微习惯库20条.md  # 习惯模板
```

## 🚀 快速开始

### 1. 环境准备

1. **安装微信开发者工具**
   - 下载地址: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

2. **注册小程序账号**
   - 前往: https://mp.weixin.qq.com/
   - 获取 AppID

3. **开通云开发**
   - 在微信开发者工具中开通云开发
   - 创建云开发环境
   - 获取环境ID

### 2. 项目配置

1. **修改 `project.config.json`**
   ```json
   {
     "appid": "替换为你的AppID",
     "cloudfunctionRoot": "cloudfunctions/"
   }
   ```

2. **修改 `miniprogram/app.js`**
   ```javascript
   wx.cloud.init({
     env: '替换为你的云环境ID',
     traceUser: true,
   });
   ```

### 3. 初始化云数据库

1. 在云开发控制台创建以下集合:
   - `users`
   - `habit_templates`
   - `user_habits`
   - `habit_logs`

2. 设置数据库权限(参考 `DATABASE_DESIGN.md`)

3. 导入初始习惯模板数据(20条)

### 4. 部署云函数

在微信开发者工具中:
1. 右键点击 `cloudfunctions` 文件夹
2. 选择"上传并部署:云端安装依赖"
3. 对每个云函数重复此操作

提示:
- `getMyHabits` 需在云端安装依赖并包含 `wx-server-sdk` 版本 `~2.6.3`，否则会出现 `Cannot find module 'wx-server-sdk'`。
- 建议统一所有云函数的 `wx-server-sdk` 版本为 `~2.6.3`。

### 5. 运行项目

1. 在微信开发者工具中打开项目
2. 点击"编译"按钮
3. 在模拟器或真机中预览

验证建议:
- 在习惯库页切换到“我的习惯”Tab进行端到端加载验证；如出现“云函数依赖缺失，请重新部署”提示，重新对 `getMyHabits` 执行“上传并部署：云端安装依赖”后重试。

## 📋 开发清单

### 第一周任务(项目搭建)

- [x] 创建项目结构
- [x] 配置 app.json 和路由
- [x] 创建全局样式系统
- [x] 创建工具函数
- [x] 设计数据库结构
- [x] 创建核心云函数框架
- [ ] 创建数据库集合
- [ ] 部署云函数
- [ ] 导入初始数据

### 第二周任务(核心页面)

- [ ] 实现今日习惯页
  - [ ] 页面UI
  - [ ] 数据加载
  - [ ] 打卡功能
- [ ] 实现新建习惯页
  - [ ] 表单UI
  - [ ] 数据提交
  - [ ] 权限校验
- [ ] 实现习惯库页
  - [ ] 模板列表
  - [ ] 我的习惯

### 第三周任务(高级功能)

- [ ] 实现习惯详情页
- [ ] 实现数据统计页
- [ ] 实现会员系统
- [ ] 集成微信支付
- [ ] 21天周期逻辑

### 第四周任务(测试上线)

- [ ] 功能测试
- [ ] 兼容性测试
- [ ] 性能优化
- [ ] 提交审核

## 🔑 关键功能实现指南

### 1. 用户登录

```javascript
// app.js
async initUser() {
  const res = await wx.cloud.callFunction({
    name: 'initUser'
  });

  if (res.result.code === 0) {
    this.globalData.userInfo = res.result.data;
  }
}
```

### 2. 今日习惯加载

```javascript
// pages/home/home.js
async loadTodayHabits() {
  const res = await wx.cloud.callFunction({
    name: 'getTodayHabits'
  });

  if (res.result.code === 0) {
    this.setData({
      habits: res.result.data.habits
    });
  }
}
```

### 3. 打卡功能

```javascript
async checkIn(habitId) {
  wx.showLoading({ title: '打卡中...' });

  const res = await wx.cloud.callFunction({
    name: 'logHabit',
    data: { user_habit_id: habitId }
  });

  wx.hideLoading();

  if (res.result.code === 0) {
    wx.showToast({
      title: '已记录,做得很好!',
      icon: 'success'
    });
    this.loadTodayHabits(); // 刷新列表
  }
}
```

### 4. 创建习惯

```javascript
async createHabit(data) {
  const res = await wx.cloud.callFunction({
    name: 'createHabit',
    data: {
      name: data.name,
      trigger: data.trigger,
      target_times_per_day: data.target_times_per_day
    }
  });

  if (res.result.code === 0) {
    wx.showToast({
      title: '新习惯已加入今日列表',
      icon: 'success'
    });
    wx.navigateBack();
  } else if (res.result.code === 1001) {
    // 超出习惯数量限制,引导开通会员
    this.showMembershipGuide();
  }
}
```

## 🎨 UI 设计规范

### 颜色系统

- **主色**: `#4CB8A5` (柔和绿)
- **辅助色**: `#4C9BFF` (柔和蓝)
- **背景色**: `#F7F8FA` (浅灰)
- **文字主色**: `#111827`
- **文字次色**: `#4B5563`
- **文字辅助**: `#9CA3AF`

### 圆角

- 卡片: `12px`
- 按钮: `999px` (胶囊)
- 标签: `8px`

### 间距

- 页面边距: `32rpx`
- 卡片间距: `24rpx`
- 元素间距: `16rpx`

## 📊 数据库操作示例

### 查询今日习惯

```javascript
const { data: habits } = await db.collection('user_habits')
  .where({
    _openid: openid,
    status: 'in_progress'
  })
  .get();
```

### 创建打卡记录

```javascript
await db.collection('habit_logs').add({
  data: {
    _openid: openid,
    user_habit_id: habitId,
    date: '2025-12-26',
    times: 1,
    created_at: new Date()
  }
});
```

### 统计数据

```javascript
const { total } = await db.collection('user_habits')
  .where({
    _openid: openid,
    status: 'in_progress'
  })
  .count();
```

## 🐛 常见问题

### 1. 云函数调用失败

**问题**: 提示"云函数不存在"
**解决**:
- 检查云函数是否已上传
- 确认环境ID配置正确
- 检查云函数名称拼写

### 2. 数据库权限错误

**问题**: 提示"permission denied"
**解决**:
- 设置正确的数据库权限规则
- 确认 openid 校验逻辑

### 3. 页面跳转失败

**问题**: 页面跳转无反应
**解决**:
- 检查 app.json 中是否注册页面
- 确认页面路径正确

## 📚 参考文档

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/)
- [微信支付接入指南](https://pay.weixin.qq.com/wiki/doc/api/index.html)

## 📮 联系方式

- 项目地址: [GitHub]
- 问题反馈: [Issues]
- 邮箱: [your-email]

---

**最后更新**: 2025-12-26
**版本**: V1.0
**状态**: 已就绪 ✅
