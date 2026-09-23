export interface WMHDBannerData {
  name: string;
  designation: string;
  organization: string;
  message: string;
  imageData?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Draws text centered at (x, baseline y), shrinking the font until it fits maxWidth. */
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialFontSize: number,
  fontWeight: string,
  fontFamily: string,
  minFontSize = 14
): number {
  let fontSize = initialFontSize;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  let w = ctx.measureText(text).width;
  while (w > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    w = ctx.measureText(text).width;
  }
  let displayText = text;
  if (w > maxWidth) {
    while (displayText.length > 3 && ctx.measureText(displayText + "…").width > maxWidth) {
      displayText = displayText.slice(0, -1);
    }
    displayText += "…";
  }
  ctx.fillText(displayText, x, y);
  return fontSize;
}

function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialFontSize: number,
  fontWeight: string,
  fontFamily: string,
  maxLines: number,
  minFontSize = 16
): { lines: string[]; fontSize: number; lineHeight: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);

  const buildLines = (fontSize: number): string[] => {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  let fontSize = initialFontSize;
  let lines = buildLines(fontSize);
  while (lines.length > maxLines && fontSize > minFontSize) {
    fontSize -= 1;
    lines = buildLines(fontSize);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const lastIndex = lines.length - 1;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    let lastLine = lines[lastIndex];
    while (lastLine.length > 3 && ctx.measureText(lastLine + "…").width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = lastLine.trimEnd() + "…";
  }
  return { lines, fontSize, lineHeight: Math.round(fontSize * 1.32) };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

/** Rounded speech-bubble outline with a small tail pointing to the lower-left. */
function speechBubblePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const tailW = w * 0.09;
  const tailH = h * 0.11;
  const tailX = x + w * 0.16;
  const tailY = y + h;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(tailX + tailW * 1.6, y + h);
  ctx.lineTo(tailX + tailW * 0.4, tailY + tailH);
  ctx.lineTo(tailX, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPlaceholderAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 6);
  ctx.clip();
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, "#e4e7f2");
  bg.addColorStop(1, "#cfd4e6");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.5;
  ctx.fillStyle = "#a6aec7";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.28, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 1.0, r * 0.62, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function renderWMHDBanner(canvas: HTMLCanvasElement, data: WMHDBannerData): Promise<void> {
  const WIDTH = 1200;
  const HEIGHT = 900;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to obtain 2D canvas context");

  const fontFamily = "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const PURPLE_DARK = "#5c2a86";
  const PURPLE_LIGHT = "#9d72c4";
  const NAVY = "#2a2e7d";
  const YELLOW_TOP = "#ffdd85";
  const YELLOW_BOTTOM = "#ffbe3d";
  const GOLD_ACCENT = "#f5a623";

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const [wmhdLogo, ovalBadge, hiranisLogo, userImg] = await Promise.all([
    loadImage(`/wmhd-globe-ribbon.png?v=1`),
    loadImage(`/wmhd-oval-badge.png?v=1`),
    loadImage(`/hiranis-logo.png?v=1`),
    data.imageData ? loadImage(data.imageData).catch(() => null) : Promise.resolve(null),
  ]);

  // ---- 1. Background: purple radial glow over a solid dark-purple base ----
  ctx.fillStyle = PURPLE_DARK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(
    WIDTH * 0.5,
    HEIGHT * 0.38,
    40,
    WIDTH * 0.5,
    HEIGHT * 0.38,
    WIDTH * 0.62
  );
  glow.addColorStop(0, PURPLE_LIGHT);
  glow.addColorStop(1, PURPLE_DARK);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ---- 2. Footer white band ----
  const footerY0 = HEIGHT * 0.799;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, footerY0, WIDTH, HEIGHT - footerY0);

  // ---- 3. Header pill ----
  const pillX0 = WIDTH * 0.112;
  const pillX1 = WIDTH * 0.894;
  const pillY0 = HEIGHT * 0.02;
  const pillY1 = HEIGHT * 0.135;
  const pillW = pillX1 - pillX0;
  const pillH = pillY1 - pillY0;

  ctx.save();
  ctx.shadowColor = "rgba(20, 8, 40, 0.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  const pillGradient = ctx.createLinearGradient(0, pillY0, 0, pillY1);
  pillGradient.addColorStop(0, YELLOW_TOP);
  pillGradient.addColorStop(1, YELLOW_BOTTOM);
  ctx.fillStyle = pillGradient;
  roundRectPath(ctx, pillX0, pillY0, pillW, pillH, pillH * 0.32);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1a1a1a";
  const titleText = "WORLD MENTAL HEALTH DAY 2026";
  drawFittedText(ctx, titleText, WIDTH / 2, pillY0 + pillH / 2 + 3, pillW - 80, 46, "800", fontFamily, 22);
  ctx.restore();

  // ---- 4. Photo box + name/designation badges ----
  const boxX0 = WIDTH * 0.09;
  const boxX1 = WIDTH * 0.33;
  const boxW = boxX1 - boxX0;
  const photoY0 = HEIGHT * 0.175;
  const photoY1 = HEIGHT * 0.46;
  const nameY0 = photoY1;
  const nameY1 = HEIGHT * 0.527;
  const desigY0 = nameY1;
  const desigY1 = HEIGHT * 0.601;

  // Photo frame (white border + soft shadow)
  ctx.save();
  ctx.shadowColor = "rgba(20, 8, 40, 0.4)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX0 - 6, photoY0 - 6, boxW + 12, photoY1 - photoY0 + 12);
  ctx.restore();

  if (userImg) {
    drawCoverImage(ctx, userImg, boxX0, photoY0, boxW, photoY1 - photoY0);
  } else {
    drawPlaceholderAvatar(ctx, boxX0, photoY0, boxW, photoY1 - photoY0);
  }

  // Name badge (yellow)
  ctx.fillStyle = YELLOW_BOTTOM;
  ctx.fillRect(boxX0, nameY0, boxW, nameY1 - nameY0);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1a1a1a";
  const nameText = (data.name.trim() || "Your Name").toUpperCase();
  drawFittedText(ctx, nameText, boxX0 + boxW / 2, nameY0 + (nameY1 - nameY0) / 2 + 2, boxW - 24, 24, "800", fontFamily, 13);
  ctx.restore();

  // Designation badge (navy) — up to two lines: designation + organization
  ctx.fillStyle = NAVY;
  ctx.fillRect(boxX0, desigY0, boxW, desigY1 - desigY0);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  const desigLines = [data.designation.trim(), data.organization.trim()].filter(Boolean);
  const desigH = desigY1 - desigY0;
  if (desigLines.length) {
    const lineH = desigH / desigLines.length;
    ctx.textBaseline = "middle";
    desigLines.forEach((line, i) => {
      const fs = i === 0 ? 19 : 17;
      const weight = i === 0 ? "700" : "500";
      drawFittedText(ctx, line, boxX0 + boxW / 2, desigY0 + lineH * i + lineH / 2 + 1, boxW - 26, fs, weight, fontFamily, 11);
    });
  }
  ctx.restore();

  // ---- 5. Speech bubble with quote ----
  const bubbleX0 = WIDTH * 0.41;
  const bubbleX1 = WIDTH * 0.95;
  const bubbleY0 = HEIGHT * 0.175;
  const bubbleY1 = HEIGHT * 0.585;
  const bubbleW = bubbleX1 - bubbleX0;
  const bubbleH = bubbleY1 - bubbleY0;

  ctx.save();
  ctx.shadowColor = "rgba(20, 8, 40, 0.35)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  speechBubblePath(ctx, bubbleX0, bubbleY0, bubbleW, bubbleH, 42);
  ctx.fill();
  ctx.restore();

  // Decorative gold swoosh accents (top-left & bottom-right corners of the bubble)
  const drawSwoosh = (cx: number, cy: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = GOLD_ACCENT;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, i * 14, 22 - i * 2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawSwoosh(bubbleX0 + bubbleW * 0.1, bubbleY0 + bubbleH * 0.08, Math.PI * 0.15);
  drawSwoosh(bubbleX1 - bubbleW * 0.08, bubbleY1 - bubbleH * 0.12, Math.PI * 1.15);

  const messageText = data.message.trim() || "Mental health is as important as physical health.";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const quoteWrap = wrapTextToLines(
    ctx,
    `"${messageText}"`,
    bubbleW - 110,
    38,
    "600",
    fontFamily,
    4,
    20
  );
  const totalTextH = quoteWrap.lines.length * quoteWrap.lineHeight;
  let qy = bubbleY0 + bubbleH / 2 - totalTextH / 2 + quoteWrap.fontSize * 0.8;
  ctx.fillStyle = "#1f2430";
  ctx.font = `600 ${quoteWrap.fontSize}px ${fontFamily}`;
  for (const line of quoteWrap.lines) {
    ctx.fillText(line, bubbleX0 + bubbleW / 2, qy);
    qy += quoteWrap.lineHeight;
  }
  ctx.restore();

  // ---- 6. Bottom emblem row: WMHD ribbon (left), oval badge (center), Hiranis logo (right) ----
  const drawAsset = (img: HTMLImageElement, fx0: number, fy0: number, fx1: number, fy1: number) => {
    const dx = fx0 * WIDTH;
    const dy = fy0 * HEIGHT;
    const dw = (fx1 - fx0) * WIDTH;
    const dh = (fy1 - fy0) * HEIGHT;
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  drawAsset(wmhdLogo, 0.015, 0.615, 0.285, 0.985);
  drawAsset(ovalBadge, 0.285, 0.645, 0.755, 0.985);
  drawAsset(hiranisLogo, 0.75, 0.85, 0.975, 0.955);
}
