# 每日提醒功能 - 5分钟快速配置

## 前置准备

✅ 代码已部署到本地
✅ 微信开发者工具已打开项目
✅ 已有微信公众平台账号

## 配置步骤

### Step 1: 创建订阅消息模板 (2分钟)

1. 访问 https://mp.weixin.qq.com
2. 登录你的小程序账号
3. 点击「功能」-「订阅消息」
4. 点击「选用」按钮,搜索"提醒"相关模板
5. 选择一个包含以下字段的模板:
   - thing1 (待办事项)
   - thing2 (完成情况)
   - date3 (提醒时间)
   - thing4 (温馨提示)
6. 提交审核(通常几分钟内通过)
7. 获取模板ID(类似: `aBcDeFgHiJkLmNoPqRsTuVwXyZ`)

**示例模板:**
```
类目: 生活服务 > 提醒服务
模板名称: 待办提醒
内容:
{{thing1.DATA}}
{{thing2.DATA}}
{{date3.DATA}}
{{thing4.DATA}}
```

### Step 2: 更新代码中的模板ID (1分钟)

打开以下2个文件,替换模板ID:

**文件1: miniprogram/pages/settings/settings.js**
```javascript
// 第31-35行
const res = await wx.requestSubscribeMessage({
  tmplIds: [
    'aBcDeFgHiJkLmNoPqRsTuVwXyZ',  // 👈 替换成你的模板ID
    // 可以添加多个模板ID
  ]
});
```

**文件2: cloudfunctions/sendReminder/index.js**
```javascript
// 第103行
await cloud.openapi.subscribeMessage.send({
  touser: openid,
  templateId: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ',  // 👈 替换成你的模板ID
  page: 'pages/home/home',
  data: messageData,
  miniprogramState: 'formal'
});
```

### Step 3: 部署云函数 (1分钟)

在微信开发者工具中:

1. 展开 `cloudfunctions` 目录
2. 右键 `updateUserSettings` → 「上传并部署:云端安装依赖」
3. 右键 `sendReminder` → 「上传并部署:云端安装依赖」
4. 等待部署完成(约30秒)

### Step 4: 配置定时触发器 (1分钟)

**方法A: 在控制台配置(推荐)**

1. 点击工具栏「云开发」
2. 进入「云函数」标签页
3. 点击 `sendReminder` 函数
4. 点击「触发器」选项卡
5. 添加触发器:
   ```
   名称: morning_reminder
   触发周期: 0 0 8 * * * *
   ```
6. 再添加一个:
   ```
   名称: evening_reminder
   触发周期: 0 0 20 * * * *
   ```

**方法B: 使用配置文件**

创建 `cloudfunctions/sendReminder/config.json`:
```json
{
  "triggers": [
    {
      "name": "morning_reminder",
      "type": "timer",
      "config": "0 0 8 * * * *"
    },
    {
      "name": "evening_reminder",
      "type": "timer",
      "config": "0 0 20 * * * *"
    }
  ]
}
```

然后重新部署 sendReminder 云函数。

## 测试验证

### 1. 测试设置页面
```bash
# 在模拟器或真机中
1. 点击首页右上角 ⚙️ 图标
2. 查看设置页面是否正常
3. 尝试切换提醒开关
```

### 2. 测试订阅授权(必须真机)
```bash
1. 在真机上打开小程序
2. 进入设置页面
3. 打开提醒开关
4. 应该弹出订阅消息授权弹窗
5. 点击「允许」
6. 查看订阅状态是否变为「已订阅」
```

### 3. 测试云函数
```bash
# 在云开发控制台
1. 进入「云函数」
2. 点击 sendReminder
3. 点击「云端测试」
4. 输入: {}
5. 点击「测试」
6. 查看返回结果和日志
```

### 4. 测试消息发送(真机)
```bash
# 确保:
- 已授权订阅消息
- 今日有未完成习惯
- 已部署云函数

# 手动触发:
在云端测试 sendReminder,然后在微信查看是否收到服务通知
```

## 常见问题

### Q1: 没有收到订阅消息?
```
检查清单:
□ 是否已授权订阅消息
□ 模板ID是否正确
□ 云函数是否有错误日志
□ 今日是否有未完成习惯
□ reminder_settings.enabled 是否为 true
```

### Q2: 授权弹窗不显示?
```
解决方案:
- 必须在真机上测试(模拟器不支持)
- 检查模板ID格式是否正确
- 确保模板已审核通过
```

### Q3: 定时触发器不执行?
```
检查:
- Cron表达式是否正确
- 触发器是否启用
- 云函数执行日志
- 云函数配额是否充足
```

### Q4: 时间不匹配?
```
调整:
sendReminder 中的 isTimeMatch 函数
允许的误差范围(默认5分钟)
```

## 生产环境注意事项

### 1. 定时触发器优化
```javascript
// 不要每小时都触发,按实际需求设置
// 推荐: 8:00, 12:00, 20:00 三个时段

触发器1: 0 0 8 * * * *   // 早上8点
触发器2: 0 0 12 * * * *  // 中午12点
触发器3: 0 0 20 * * * *  // 晚上8点
```

### 2. 消息内容优化
```javascript
// 根据用户习惯数量调整文案
if (stats.remaining === 0) {
  // 全部完成 - 发送庆祝消息
} else if (stats.remaining === stats.total) {
  // 一个都没完成 - 发送激励消息
} else {
  // 部分完成 - 发送进度消息
}
```

### 3. 续订策略
```javascript
// 在用户打卡成功后,静默续订
// 在用户打开小程序时,检查订阅状态
// 提示用户定期续订
```

### 4. 监控告警
```javascript
// 设置云函数监控
- 执行失败率 > 5% 告警
- 执行时长 > 10s 告警
- 并发数 > 100 告警
```

## 配置完成检查表

- [ ] ✅ 创建订阅消息模板
- [ ] ✅ 获取模板ID
- [ ] ✅ 更新 settings.js 中的模板ID
- [ ] ✅ 更新 sendReminder/index.js 中的模板ID
- [ ] ✅ 部署 updateUserSettings 云函数
- [ ] ✅ 部署 sendReminder 云函数
- [ ] ✅ 配置定时触发器(早8点、晚8点)
- [ ] ✅ 真机测试订阅授权
- [ ] ✅ 真机测试接收消息
- [ ] ✅ 验证时间匹配算法
- [ ] ✅ 检查云函数日志
- [ ] ✅ 设置监控告警

## 下一步优化

完成基础配置后,可以考虑:

1. **V1.1 智能推荐时间**
   - 分析用户完成习惯的时间段
   - 自动推荐最佳提醒时间

2. **V1.2 多样化提醒**
   - 添加完成庆祝消息
   - 添加里程碑提醒(7/14/21天)

3. **V1.3 个性化设置**
   - 每个习惯独立提醒时间
   - 自定义提醒文案

4. **V1.4 数据分析**
   - 提醒效果分析
   - 最佳提醒时间统计
   - 用户行为分析

---

**配置时间**: 约5分钟
**难度**: ⭐⭐☆☆☆
**状态**: 开发完成,按上述步骤配置即可使用
