import React, { useEffect, useRef } from 'react';

const BackgroundGrid = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      };
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    let scanLineY = 0;

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const { x: mx, y: my } = mouseRef.current;
      const parallaxX = mx * 20;
      const parallaxY = my * 20;

      ctx.save();
      // Apply perspective tilt
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.transform(1, 0, 0, 0.8, 0, 0); // Slight vertical compression for perspective
      ctx.translate(-canvas.width / 2 + parallaxX, -canvas.height / 2 + parallaxY);

      const gridSize = 40;
      const width = canvas.width + 100;
      const height = canvas.height + 100;

      // Draw vertical lines
      for (let x = -50; x <= width; x += gridSize) {
        const isMajor = Math.round((x + 50) / gridSize) % 5 === 0;
        ctx.beginPath();
        ctx.strokeStyle = isMajor ? '#2A2A2A' : '#1E1E1E';
        ctx.lineWidth = 1;
        ctx.moveTo(x, -50);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = -50; y <= height; y += gridSize) {
        const isMajor = Math.round((y + 50) / gridSize) % 5 === 0;
        ctx.beginPath();
        ctx.strokeStyle = isMajor ? '#2A2A2A' : '#1E1E1E';
        ctx.lineWidth = 1;
        ctx.moveTo(-50, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();

      // Scan line
      scanLineY += 1.5;
      if (scanLineY > canvas.height) scanLineY = 0;
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 2;
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(canvas.width, scanLineY);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(drawGrid);
    };

    drawGrid();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#080808',
        zIndex: -1,
      }}
    />
  );
};

export default BackgroundGrid;
