import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const PendulumCanvas = forwardRef(({
  width,
  height,
  ticks,
  amplitude, // represents a percentage (e.g. 30 to 95)
  decay,
  frequencyX,
  frequencyY,
  strokeColor,
  strokeWidth,
  fillColor,
  fillOpacity,
  strokeOpacity,
  radiusMin,
  radiusMax,
  backgroundColor = "#FFFFFF" // added background color prop
}, ref) => {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getSvgString: (opts = {}) => {
      const exportWidth = opts?.forceSquare ? Math.min(width, height) : width;
      const exportHeight = opts?.forceSquare ? Math.min(width, height) : height;
      // Calculate actual amplitude in pixels dynamically so geometry is never too small or too big
      const maxRadius = Math.max(radiusMin, radiusMax);
      const maxSafeAmp = Math.min(exportWidth, exportHeight) / 2 - maxRadius - 10; // 10px buffer
      const actualAmplitude = (amplitude / 100) * Math.max(10, maxSafeAmp);

      let svg = `<svg viewBox="0 0 ${exportWidth} ${exportHeight}" xmlns="http://www.w3.org/2000/svg">`;
      // Draw background rect
      svg += `<rect width="${exportWidth}" height="${exportHeight}" fill="${backgroundColor}" />`;

      let lastX = (actualAmplitude * 1) + exportWidth / 2;
      let lastY = (actualAmplitude * 1) + exportHeight / 2;

      let lineWidth = 1;
      if (typeof strokeWidth === 'string' && strokeWidth.includes('%')) {
        lineWidth = (parseFloat(strokeWidth) / 100) * exportWidth;
      } else {
        lineWidth = Number(strokeWidth);
      }

      const maxSpeedRef = 15.0;

      for (let t = 0; t < ticks; t++) {
        const normT = t / ticks;
        const currentAmp = actualAmplitude * Math.exp(-decay * normT);

        const oscY = Math.cos(normT * frequencyY * 2 * Math.PI);
        const y = (currentAmp * oscY) + exportHeight / 2;

        const oscX = Math.cos(normT * frequencyX * 2 * Math.PI);
        const x = (currentAmp * oscX) + exportWidth / 2;

        const dx = x - lastX;
        const dy = y - lastY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        lastX = x;
        lastY = y;

        const normalizedSpeed = Math.min(speed / maxSpeedRef, 1.0);
        const radius = radiusMin + (radiusMax - radiusMin) * normalizedSpeed;

        svg += `<circle cx="${x}" cy="${y}" r="${radius}" 
                fill="${fillColor}" fill-opacity="${fillOpacity}" 
                stroke="${strokeColor}" stroke-opacity="${strokeOpacity}" stroke-width="${lineWidth}" />`;
      }
      svg += '</svg>';
      return svg;
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // Reset any existing transform before applying DPR scale.
    // Without this, repeated renders compound scaling and the drawing looks cropped/zoomed.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    // Clear and draw custom background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate actual amplitude in pixels dynamically
    const maxRadius = Math.max(radiusMin, radiusMax);
    const maxSafeAmp = Math.min(width, height) / 2 - maxRadius - 10;
    const actualAmplitude = (amplitude / 100) * Math.max(10, maxSafeAmp);

    let lastX = (actualAmplitude * 1) + width / 2;
    let lastY = (actualAmplitude * 1) + height / 2;

    let lineWidth = 1;
    if (typeof strokeWidth === 'string' && strokeWidth.includes('%')) {
      lineWidth = (parseFloat(strokeWidth) / 100) * width;
    } else {
      lineWidth = Number(strokeWidth);
    }

    const maxSpeedRef = 15.0;

    for (let t = 0; t < ticks; t++) {
      const normT = t / ticks;
      const currentAmp = actualAmplitude * Math.exp(-decay * normT);

      const oscY = Math.cos(normT * frequencyY * 2 * Math.PI);
      const y = (currentAmp * oscY) + height / 2;

      const oscX = Math.cos(normT * frequencyX * 2 * Math.PI);
      const x = (currentAmp * oscX) + width / 2;

      const dx = x - lastX;
      const dy = y - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      lastX = x;
      lastY = y;

      const normalizedSpeed = Math.min(speed / maxSpeedRef, 1.0);
      const radius = radiusMin + (radiusMax - radiusMin) * normalizedSpeed;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (fillOpacity > 0) {
        ctx.fillStyle = hexToRgba(fillColor, fillOpacity);
        ctx.fill();
      }

      if (strokeOpacity > 0) {
        ctx.strokeStyle = hexToRgba(strokeColor, strokeOpacity);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }
  }, [width, height, ticks, amplitude, decay, frequencyX, frequencyY, strokeColor, strokeWidth, fillColor, fillOpacity, strokeOpacity, radiusMin, radiusMax, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="rounded shadow-lg border border-gray-700/20"
    />
  );
});

function hexToRgba(hex, alpha) {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return hex;
}

export default PendulumCanvas;
