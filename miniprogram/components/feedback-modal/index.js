const { getCopyForTier } = require('../../utils/feedbackCopy.js');
const cache = require('../../utils/cache.js');
const { getConfettiConfig } = require('../../utils/effects.js');

Component({
  properties: {
    tier: { type: String, value: 'regular' },
    visible: { type: Boolean, value: false },
    progressText: { type: String, value: '' }
  },
  data: {
    copy: { emoji: '✅', text: '已完成！', vibrate: 'short' }
  },
  observers: {
    'tier, visible' (tier, visible) {
      const copy = getCopyForTier(tier);
      this.setData({ copy });
      if (visible) {
        this.applyVibration(copy.vibrate);
        this.startConfetti(tier);
      }
    }
  },
  methods: {
    onTapMask () {
      // 点击蒙层不关闭，避免误触
    },
    dismiss () {
      this.triggerEvent('dismiss');
    },
    applyVibration (mode) {
      try {
        if (mode === 'long') {
          wx.vibrateLong();
        } else if (mode === 'pulse') {
          wx.vibrateShort();
          setTimeout(() => wx.vibrateShort(), 250);
        } else {
          wx.vibrateShort();
        }
      } catch (e) { }
    },
    startConfetti (tier) {
      const sys = wx.getSystemInfoSync() || {};
      const config = getConfettiConfig(tier, sys);
      const cachedColors = cache.get('confetti_colors', config.colors);
      const colors = Array.isArray(cachedColors) && cachedColors.length ? cachedColors : config.colors;

      // 缓存的效果开关：如果用户禁用了动效则跳过
      const effectsEnabled = cache.get('effects_enabled', true);
      if (!effectsEnabled) return;

      const W = 300;
      const H = 120;
      const count = Math.max(12, config.count);
      const durationMs = config.durationMs || 1500;
      const steps = Math.floor(durationMs / 33);

      const particles = Array.from({ length: count }).map(() => ({
        x: Math.random() * W,
        y: Math.random() * 10,
        r: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 1 + Math.random() * 2,
        vx: -0.5 + Math.random(),
        rot: Math.random() * Math.PI * 2
      }));

      // 尝试获取 Canvas 2D 上下文，若不支持则降级到 CanvasContext
      const query = wx.createSelectorQuery().in(this);
      let useCanvas2D = false;
      query.select('#confetti').fields({ node: true }).exec((res) => {
        if (res && res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            useCanvas2D = true;
            this._drawConfettiCanvas2D(ctx, W, H, particles, config, steps);
          }
        }
        if (!useCanvas2D) {
          this._drawConfettiCanvasContext(W, H, particles, config, steps);
        }
      });
    },

    _drawConfettiCanvas2D (ctx, W, H, particles, config, steps) {
      let frame = 0;
      const frameId = setInterval(() => {
        frame++;
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += 0.08;
          this._drawShapeCanvas2D(ctx, p, config.shape);
        });
        if (frame >= steps) {
          clearInterval(frameId);
        }
      }, 16); // 16ms ~= 60fps
    },

    _drawShapeCanvas2D (ctx, p, shape) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.y / 150);

      if (shape === 'triangle') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const size = p.r * 2;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'star') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const spikes = 5;
        const outerR = p.r * 2.4;
        const innerR = p.r * 1.2;
        ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
          const ang = i * Math.PI / spikes * 2;
          ctx.lineTo(Math.cos(ang) * outerR, Math.sin(ang) * outerR);
          const ang2 = ang + Math.PI / spikes;
          ctx.lineTo(Math.cos(ang2) * innerR, Math.sin(ang2) * innerR);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // circle
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    _drawConfettiCanvasContext (W, H, particles, config, steps) {
      // 降级方案：使用 CanvasContext（兼容旧版小程序）
      const ctx = wx.createCanvasContext('confetti', this);
      let frame = 0;
      const timer = setInterval(() => {
        frame++;
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += 0.08;
          this._drawShapeCanvasContext(ctx, p, config.shape);
        });
        ctx.draw();
        if (frame >= steps) {
          clearInterval(timer);
        }
      }, 33);
    },

    _drawShapeCanvasContext (ctx, p, shape) {
      if (shape === 'triangle') {
        const size = p.r * 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.setFillStyle(p.color);
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (shape === 'star') {
        const spikes = 5;
        const outerR = p.r * 2.4;
        const innerR = p.r * 1.2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.setFillStyle(p.color);
        ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
          const ang = i * Math.PI / spikes * 2;
          ctx.lineTo(Math.cos(ang) * outerR, Math.sin(ang) * outerR);
          const ang2 = ang + Math.PI / spikes;
          ctx.lineTo(Math.cos(ang2) * innerR, Math.sin(ang2) * innerR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.setFillStyle(p.color);
        ctx.fill();
      }
    }
  }
});
