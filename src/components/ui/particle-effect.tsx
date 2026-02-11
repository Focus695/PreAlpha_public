/**
 * Particle Effect Component
 *
 * 魔法粒子特效组件，像星辰般闪烁并漂浮在整个页面中
 */

import { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number; // 水平速度
  vy: number; // 垂直速度
  size: number;
  opacity: number;
  baseOpacity: number; // 基础透明度
  twinklePhase: number; // 闪烁相位
  twinkleSpeed: number; // 闪烁速度
  rotation: number;
  rotationSpeed: number;
  createdAt: number; // 创建时间
  lifetime: number; // 生命周期（毫秒）
}

interface ParticleEffectProps {
  isActive: boolean; // 是否激活粒子生成
  sourceRect?: DOMRect | null; // 粒子生成源的位置
  autoTrigger?: boolean; // 是否自动触发一次
}

export const ParticleEffect: React.FC<ParticleEffectProps> = ({ isActive, sourceRect, autoTrigger = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  const lastGenerateTimeRef = useRef<number>(0);
  const hasAutoTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸为整个视口
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 生成星辰粒子 - 更少的数量，更分散
    const generateParticles = (currentTime: number, isAutoTrigger = false) => {
      if (!sourceRect) return;

      // 控制生成频率：每200ms生成一次（降低密度）
      if (!isAutoTrigger && currentTime - lastGenerateTimeRef.current < 200) {
        return;
      }
      lastGenerateTimeRef.current = currentTime;

      const particleCount = isAutoTrigger ? 15 : 1; // 自动触发时生成15个，hover时每次1个
      const centerX = sourceRect.left + sourceRect.width / 2;
      const centerY = sourceRect.top + sourceRect.height / 2;

      for (let i = 0; i < particleCount; i++) {
        // 在logo范围内随机位置生成
        const offsetX = (Math.random() - 0.5) * sourceRect.width;
        const offsetY = (Math.random() - 0.5) * sourceRect.height;

        // 随机的漂浮方向和速度
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.5;

        particlesRef.current.push({
          id: particleIdRef.current++,
          x: centerX + offsetX,
          y: centerY + offsetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 2, // 更小的粒子 1.5-3.5px
          opacity: 1,
          baseOpacity: 0.6 + Math.random() * 0.4, // 基础透明度 0.6-1.0
          twinklePhase: Math.random() * Math.PI * 2, // 随机初始相位
          twinkleSpeed: 0.02 + Math.random() * 0.03, // 闪烁速度
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          createdAt: currentTime,
          lifetime: 5000, // 5秒生命周期
        });
      }
    };

    // 更新粒子状态
    const updateParticles = (currentTime: number, deltaTime: number) => {
      particlesRef.current = particlesRef.current.filter((particle) => {
        const age = currentTime - particle.createdAt;

        // 超过生命周期的粒子消失
        if (age > particle.lifetime) {
          return false;
        }

        // 更新位置 - 缓慢漂浮
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.rotation += particle.rotationSpeed * deltaTime;

        // 更新闪烁效果
        particle.twinklePhase += particle.twinkleSpeed * deltaTime;
        const twinkle = (Math.sin(particle.twinklePhase) + 1) * 0.5; // 0-1之间闪烁

        // 生命周期渐隐效果
        const lifeProgress = age / particle.lifetime;
        let lifeFade = 1;

        // 前10%时间淡入
        if (lifeProgress < 0.1) {
          lifeFade = lifeProgress / 0.1;
        }
        // 后30%时间淡出
        else if (lifeProgress > 0.7) {
          lifeFade = 1 - (lifeProgress - 0.7) / 0.3;
        }

        // 综合透明度 = 基础透明度 × 闪烁效果 × 生命周期渐变
        particle.opacity = particle.baseOpacity * (0.3 + twinkle * 0.7) * lifeFade;

        // 边界检查 - 粒子离开屏幕则移除
        return particle.x > -50 && particle.x < canvas.width + 50 &&
               particle.y > -50 && particle.y < canvas.height + 50;
      });
    };

    // 渲染粒子
    const renderParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.globalAlpha = particle.opacity;

        // 星辰般的渐变效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 2);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 1)'); // 品牌色核心
        gradient.addColorStop(0.3, 'rgba(0, 220, 255, 0.8)');
        gradient.addColorStop(0.6, 'rgba(0, 180, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');

        ctx.fillStyle = gradient;

        // 绘制星形
        ctx.beginPath();
        const spikes = 4;
        const outerRadius = particle.size;
        const innerRadius = particle.size * 0.4;

        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / spikes) * i;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();

        // 发光效果
        ctx.shadowBlur = particle.size * 3;
        ctx.shadowColor = `rgba(0, 240, 255, ${particle.opacity * 0.8})`;
        ctx.fill();

        ctx.restore();
      });
    };

    // 动画循环
    const animate = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 16 : 1;
      lastTimeRef.current = currentTime;

      // 自动触发一次（首次进入页面）
      if (autoTrigger && !hasAutoTriggeredRef.current && sourceRect) {
        hasAutoTriggeredRef.current = true;
        generateParticles(currentTime, true);
      }

      // 如果激活状态（hover），持续生成新粒子
      if (isActive && sourceRect) {
        generateParticles(currentTime, false);
      }

      updateParticles(currentTime, deltaTime);
      renderParticles();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, sourceRect, autoTrigger]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
