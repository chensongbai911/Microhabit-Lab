# 首卡激励页面（first-checkin）

## 功能
- 新用户创建习惯后，引导立即完成第一次打卡
- 打卡成功后，弹出分层反馈（示例用 day7，后续按实际天数切换）

## 结构
- `first-checkin.wxml`：页面结构
- `first-checkin.wxss`：样式
- `first-checkin.js`：打卡逻辑（云函数占位）
- `first-checkin.json`：标题与页面配置

## 集成
- 已在 `miniprogram/app.json` 中注册：`pages/onboarding/first-checkin/first-checkin`
- 引用了组件 `components/feedback-modal`

## 下一步（建议）
- 根据用户当前连续天数动态设置 `tier`（regular/day3/day7/recovery）
- 在首卡完成后埋点：`first_checkin_completed`
- 从首页/引导页跳转携带 `habitId` 参数

## 开发者验证
1. 用微信开发者工具打开本项目
2. 在“模拟器”中访问 `pages/onboarding/first-checkin/first-checkin`
3. 点击“立即打一次卡”，观察弹层与震动反馈
4. 查看云函数日志是否收到 `isFirstCheckin: true`
