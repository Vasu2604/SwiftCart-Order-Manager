import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const AuroraBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let mouseX = 0;
    let mouseY = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const orbs = [
      { x: 100, y: 100, radius: 200, color: 'rgba(124, 58, 237, 0.3)', vx: 0.5, vy: 0.3 },
      { x: 300, y: 200, radius: 150, color: 'rgba(236, 72, 153, 0.3)', vx: -0.3, vy: 0.7 },
      { x: 200, y: 300, radius: 180, color: 'rgba(16, 185, 129, 0.3)', vx: 0.4, vy: -0.5 },
    ];

    const animate = () => {
      ctx.fillStyle = 'rgba(11, 16, 33, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animate orbs
      orbs.forEach((orb) => {
        // Update position with mouse influence
        const dx = mouseX - orb.x;
        const dy = mouseY - orb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          orb.x += (dx / distance) * 2;
          orb.y += (dy / distance) * 2;
        } else {
          orb.x += orb.vx;
          orb.y += orb.vy;
        }

        // Bounce off edges
        if (orb.x < 0 || orb.x > canvas.width) orb.vx *= -1;
        if (orb.y < 0 || orb.y > canvas.height) orb.vy *= -1;

        // Draw orb
        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.radius
        );
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 60% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
          `
        }}
      />
    </div>
  );
};

export default AuroraBackground;
