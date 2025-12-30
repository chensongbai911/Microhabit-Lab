# 需要添加的图标

为了完美还原微信小程序风格的首页，需要以下图标：

## 新增图标

1. **back.png** - 返回图标
   - 尺寸: 40x40rpx
   - 颜色: #000000
   - 样式: 简洁的左箭头

2. **more.png** - 更多图标
   - 尺寸: 40x40rpx
   - 颜色: #000000
   - 样式: 三个点（水平或垂直）

3. **setting.png** - 设置图标
   - 尺寸: 40x40rpx
   - 颜色: #000000
   - 样式: 齿轮图标

4. **add.png** - 添加按钮图标
   - 尺寸: 56x56rpx
   - 颜色: #FFFFFF
   - 样式: 加号，用于底部悬浮按钮

5. **check-white.png** - 白色对勾图标
   - 尺寸: 28x28rpx
   - 颜色: #FFFFFF
   - 样式: 对勾，用于完成状态圆圈内

## 临时处理方案

在没有实际图标文件之前，可以：

1. 使用 emoji 或文字代替
2. 使用 CSS 绘制简单图形
3. 从现有图标库中复制类似图标

## 示例代码（使用文字代替）

```html
<!-- 导航栏 -->
<view class="nav-icon-text">←</view>  <!-- back -->
<view class="nav-icon-text">⋯</view>  <!-- more -->
<view class="nav-icon-text">⚙</view>  <!-- setting -->

<!-- 悬浮按钮 -->
<view class="fab-icon-text">+</view>  <!-- add -->
```
