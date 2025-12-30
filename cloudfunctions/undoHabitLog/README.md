# undoHabitLog 云函数

撤销当日打卡：删除当前用户指定习惯今天最新的一条打卡记录（或减少 times 计数），用于前端长按撤销。

## 数据假设
- 集合 `habit_logs`：字段示例 `_id`, `user_habit_id`, `_openid`, `date` (YYYY-MM-DD), `times`, `created_at`, `updated_at`。
- 集合 `user_habits`：字段包含 `_id`, `_openid`，可选 `today_times`（若存在则自减 1）。

## 入参
```json
{ "user_habit_id": "<habit_id>" }
```

## 返回
- 成功：`{ code: 0, message: '撤销成功', data: { times: <剩余次数或0> } }`
- 失败：
  - `code: 400` 参数缺失
  - `code: 404` 习惯或当日记录不存在
  - `code: 500` 服务器错误

## 部署步骤
1. 在微信云开发控制台创建函数 `undoHabitLog`，运行环境 Node.js 10+。
2. 将 `index.js` 上传/粘贴，确保引用的 `../utils/response` 可用；若无该工具，可用以下最小实现：
```js
module.exports = {
  CODES: { PARAM_ERROR: 400, NOT_FOUND: 404 },
  success: (data = {}, message = 'ok') => ({ code: 0, message, data }),
  businessError: (code, message) => ({ code, message }),
  systemError: (message, error) => ({ code: 500, message, error: String(error) })
};
```
3. 在函数根目录 `npm install wx-server-sdk`（若未内置）。
4. 上传并部署。

## 前端调用示例
```js
wx.cloud.callFunction({
  name: 'undoHabitLog',
  data: { user_habit_id: id },
  success: (res) => {
    if (res.result.code === 0) {
      util.showToast('已撤销');
      this.loadTodayHabits();
    } else {
      util.showToast(res.result.message || '撤销失败');
    }
  },
  fail: () => util.showToast('网络异常，撤销失败')
});
```

## 注意事项
- 确保 `habit_logs` 中记录含 `_openid` 和 `date`，否则需要调整查询条件。
- 如果有多条当日记录，会删除最新一条（按 `created_at` 排序）。
- 若计数字段不叫 `times` 或 `today_times`，请按实际字段调整。
