import React, { useEffect, useRef } from 'react';

function generateLines(width, height) {
    const lines = [];
    const lineCount = 60;

    for (let i = 0; i < lineCount; i++) {
        const t = i / lineCount;
        const curved = t + Math.sin(t * Math.PI) * 0.15;
        const baseY = curved * height;

        const points = [];
        const steps = 80;
        const seed1 = Math.random() * 100;
        const seed2 = Math.random() * 100;
        const seed3 = Math.random() * 100;
        const spacing = height / lineCount;
        const amp1 = (Math.random() * 0.6 + 0.2) * spacing * 1.8;
        const amp2 = (Math.random() * 0.4 + 0.1) * spacing * 1.2;
        const amp3 = (Math.random() * 0.3) * spacing * 0.8;

        for (let j = 0; j <= steps; j++) {
            const x = (j / steps) * width;
            const tt = j / steps;
            const y = baseY
                + Math.sin(tt * Math.PI * 3 + seed1) * amp1
                + Math.sin(tt * Math.PI * 7 + seed2) * amp2
                + Math.sin(tt * Math.PI * 13 + seed3) * amp3;
            points.push({ x, y });
        }

        lines.push({
            points,
            baseY,
            isIndex: i % 5 === 0,
            seed1, seed2, seed3, amp1, amp2, amp3
        });
    }
    return lines;
}

function drawMarker(ctx, x, y, color, label, riskLabel) {
    ctx.strokeStyle = color + '88';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 16, y); ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y); ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 16);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(245,158,11,0.7)';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillText(label, x + 14, y - 4);
    ctx.fillStyle = color + '99';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillText(riskLabel, x + 14, y + 8);
}

const TopoAnimation = () => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const linesRef = useRef([]);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height;

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            width = canvas.width;
            height = canvas.height;
            linesRef.current = generateLines(width, height);
        };

        const resizeObserver = new ResizeObserver(() => resize());
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
            resize();
        }

        const animate = () => {
            timeRef.current += 0.3;
            const time = timeRef.current;
            const lines = linesRef.current;

            // Background
            ctx.fillStyle = '#080808';
            ctx.fillRect(0, 0, width, height);

            // Draw contour lines with drift
            lines.forEach((line) => {
                const drift = (time * 0.4) % height;

                ctx.beginPath();
                line.points.forEach((pt, j) => {
                    const dy = (pt.y + drift) % height;
                    if (j === 0) ctx.moveTo(pt.x, dy);
                    else ctx.lineTo(pt.x, dy);
                });

                if (line.isIndex) {
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
                    ctx.lineWidth = 1.2;
                } else {
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.13)';
                    ctx.lineWidth = 0.8;
                }
                ctx.stroke();
            });

            // Zone markers
            const w = width;
            const h = height;
            drawMarker(ctx, w * 0.25, h * 0.30, '#EF4444', 'QUETTA', 'CRITICAL');
            drawMarker(ctx, w * 0.60, h * 0.45, '#F97316', 'ZHOB', 'HIGH');
            drawMarker(ctx, w * 0.40, h * 0.68, '#F59E0B', 'PISHIN', 'MEDIUM');
            drawMarker(ctx, w * 0.75, h * 0.72, '#22C55E', 'DIR', 'LOW');

            // Right edge fade
            const grad = ctx.createLinearGradient(width * 0.6, 0, width, 0);
            grad.addColorStop(0, 'rgba(8,8,8,0)');
            grad.addColorStop(1, 'rgba(8,8,8,1)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Top fade
            const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.15);
            topGrad.addColorStop(0, 'rgba(8,8,8,1)');
            topGrad.addColorStop(1, 'rgba(8,8,8,0)');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, width, height * 0.15);

            // Bottom fade
            const botGrad = ctx.createLinearGradient(0, height * 0.85, 0, height);
            botGrad.addColorStop(0, 'rgba(8,8,8,0)');
            botGrad.addColorStop(1, 'rgba(8,8,8,1)');
            ctx.fillStyle = botGrad;
            ctx.fillRect(0, height * 0.85, width, height * 0.15);

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestRef.current);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default TopoAnimation;
