/**
 * Client-side image export helpers (SVG download + SVG→PNG conversion).
 */

function parseSvgSize(svgString) {
  const viewBox = svgString.match(/viewBox=["']0\s+0\s+([\d.]+)\s+([\d.]+)["']/i);
  if (viewBox) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2])),
    };
  }
  const wh = svgString.match(/width=["']([\d.]+)["'][^>]*height=["']([\d.]+)["']/i)
    || svgString.match(/height=["']([\d.]+)["'][^>]*width=["']([\d.]+)["']/i);
  if (wh) {
    return {
      width: Math.round(Number(wh[1])),
      height: Math.round(Number(wh[2])),
    };
  }
  return { width: 700, height: 700 };
}

function withExplicitSvgSize(svgString, width, height) {
  if (/\swidth=["']/.test(svgString) && /\sheight=["']/.test(svgString)) {
    return svgString;
  }
  return svgString.replace(
    /<svg\b([^>]*)>/i,
    `<svg width="${width}" height="${height}"$1>`
  );
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSvgString(svgString, filename) {
  downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), filename);
}

/**
 * Rasterize an SVG string to a PNG Blob at the SVG's intrinsic pixel size.
 */
export function svgStringToPngBlob(svgString) {
  const { width, height } = parseSvgSize(svgString);
  const sizedSvg = withExplicitSvgSize(svgString, width, height);

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([sizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('PNG encode failed'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG export'));
    };

    img.src = url;
  });
}

export async function downloadSvgAsPng(svgString, filename) {
  const blob = await svgStringToPngBlob(svgString);
  downloadBlob(blob, filename);
}
