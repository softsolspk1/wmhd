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

/** Rounded rect with only the top corners rounded — used for the photo card, which sits flush above the name/org bars. */
function topRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
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

/** Fill + stroke a line of display text (used for the bold poster-style headline/tagline). */
function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fillStyle: string | CanvasGradient,
  strokeStyle: string,
  lineWidth: number,
  align: CanvasTextAlign = "left"
) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 ${fontSize}px ${fontFamily}`;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.restore();
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

/** Draws an image fit (not stretched) inside a box, preserving its aspect ratio. */
function drawAssetContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX0: number,
  boxY0: number,
  boxX1: number,
  boxY1: number,
  align: "left" | "center" | "right" = "center",
  valign: "top" | "middle" | "bottom" = "middle"
) {
  const boxW = boxX1 - boxX0;
  const boxH = boxY1 - boxY0;
  const imgAspect = img.width / img.height;
  const boxAspect = boxW / boxH;
  let dw: number, dh: number;
  if (imgAspect > boxAspect) {
    dw = boxW;
    dh = boxW / imgAspect;
  } else {
    dh = boxH;
    dw = boxH * imgAspect;
  }
  const dx = boxX0 + (align === "center" ? (boxW - dw) / 2 : align === "right" ? boxW - dw : 0);
  const dy = boxY0 + (valign === "middle" ? (boxH - dh) / 2 : valign === "bottom" ? boxH - dh : 0);
  ctx.drawImage(img, dx, dy, dw, dh);
}

export async function renderWMHDBanner(canvas: HTMLCanvasElement, data: WMHDBannerData): Promise<void> {
  const WIDTH = 1200;
  const HEIGHT = 900;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to obtain 2D canvas context");

  const displayFont = "'Anton', 'Poppins', sans-serif";
  const fontFamily = "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const GREEN_BRIGHT = "#8dc63f";
  const GREEN_MID = "#77c046";
  const GREEN_DARK = "#1f7a3d";
  const GREEN_PILL_TOP = "#04703a";
  const GREEN_PILL_BOTTOM = "#8dc63f";
  const NAVY_TEXT = "#1b2f5e";
  const LIGHT_BLUE_BAR = "#cfe8fb";
  const TAGLINE_LIGHT = "#e3edf9";

  if (typeof document !== "undefined" && document.fonts) {
    if (document.fonts.load) {
      await Promise.all([
        document.fonts.load(`400 64px Anton`),
        document.fonts.load(`700 22px Poppins`),
        document.fonts.load(`800 22px Poppins`),
      ]).catch(() => undefined);
    }
    if (document.fonts.ready) {
      await document.fonts.ready.catch(() => undefined);
    }
  }

  const [bgSpace, wfmhLogo, wmhdRibbon, hiranisLogo, userImg] = await Promise.all([
    loadImage(`/wmhd-bg-space.jpg?v=1`),
    loadImage(`/wfmh-logo.png?v=1`),
    loadImage(`/wmhd-globe-ribbon.png?v=1`),
    loadImage(`/hiranis-logo.png?v=1`),
    data.imageData ? loadImage(data.imageData).catch(() => null) : Promise.resolve(null),
  ]);

  // ---- 1. Background: Earth-from-space photo with green awareness ribbon (baked-in white footer curve) ----
  drawCoverImage(ctx, bgSpace, 0, 0, WIDTH, HEIGHT);

  // ---- 2. Headline: "WORLD MENTAL HEALTH DAY 2026" — white outlined caps, "DAY 2026" in green ----
  const headX = WIDTH * 0.035;
  const headSize = 62;
  drawOutlinedText(ctx, "WORLD MENTAL", headX, HEIGHT * 0.115, headSize, displayFont, "#ffffff", GREEN_DARK, 5);

  const line2Y = HEIGHT * 0.205;
  ctx.font = `400 ${headSize}px ${displayFont}`;
  const healthText = "HEALTH ";
  const healthWidth = ctx.measureText(healthText).width;
  drawOutlinedText(ctx, healthText, headX, line2Y, headSize, displayFont, "#ffffff", GREEN_DARK, 5);
  const dayGrad = ctx.createLinearGradient(0, line2Y - headSize * 0.85, 0, line2Y);
  dayGrad.addColorStop(0, "#e7f0a6");
  dayGrad.addColorStop(1, "#7cbf3a");
  drawOutlinedText(ctx, "DAY 2026", headX + healthWidth, line2Y, headSize, displayFont, dayGrad, GREEN_DARK, 5);

  // ---- 3. "OCTOBER 10TH" pill badge ----
  const pillX0 = WIDTH * 0.035;
  const pillW = WIDTH * 0.235;
  const pillY0 = HEIGHT * 0.245;
  const pillH = HEIGHT * 0.052;
  ctx.save();
  ctx.shadowColor = "rgba(4, 20, 10, 0.4)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  const pillGrad = ctx.createLinearGradient(pillX0, pillY0, pillX0, pillY0 + pillH);
  pillGrad.addColorStop(0, GREEN_PILL_TOP);
  pillGrad.addColorStop(1, GREEN_PILL_BOTTOM);
  ctx.fillStyle = pillGrad;
  roundRectPath(ctx, pillX0, pillY0, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  drawFittedText(ctx, "OCTOBER 10TH", pillX0 + pillW / 2, pillY0 + pillH / 2 + 1, pillW - 30, 21, "800", fontFamily, 13);
  ctx.restore();

  // ---- 4. Photo card + name/designation bars ----
  const boxX0 = WIDTH * 0.035;
  const boxX1 = WIDTH * 0.3;
  const boxW = boxX1 - boxX0;
  const photoY0 = HEIGHT * 0.31;
  const photoY1 = HEIGHT * 0.615;
  const nameY0 = photoY1;
  const nameY1 = nameY0 + HEIGHT * 0.058;
  const desigY0 = nameY1;
  const desigY1 = desigY0 + HEIGHT * 0.078;

  ctx.save();
  ctx.shadowColor = "rgba(4, 12, 24, 0.45)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  topRoundedRectPath(ctx, boxX0, photoY0, boxW, photoY1 - photoY0, 18);
  ctx.fill();
  ctx.restore();

  ctx.save();
  topRoundedRectPath(ctx, boxX0, photoY0, boxW, photoY1 - photoY0, 18);
  ctx.clip();
  if (userImg) {
    drawCoverImage(ctx, userImg, boxX0, photoY0, boxW, photoY1 - photoY0);
  } else {
    drawPlaceholderAvatar(ctx, boxX0, photoY0, boxW, photoY1 - photoY0);
  }
  ctx.restore();

  // Name bar (green)
  ctx.fillStyle = GREEN_MID;
  ctx.fillRect(boxX0, nameY0, boxW, nameY1 - nameY0);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  const nameText = (data.name.trim() || "Your Name").toUpperCase();
  drawFittedText(ctx, nameText, boxX0 + boxW / 2, nameY0 + (nameY1 - nameY0) / 2 + 2, boxW - 24, 24, "800", fontFamily, 13);
  ctx.restore();

  // Designation bar (light blue) — up to two lines: designation + organization
  ctx.fillStyle = LIGHT_BLUE_BAR;
  ctx.fillRect(boxX0, desigY0, boxW, desigY1 - desigY0);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY_TEXT;
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
  const bubbleX0 = WIDTH * 0.345;
  const bubbleX1 = WIDTH * 0.895;
  const bubbleY0 = HEIGHT * 0.31;
  const bubbleY1 = HEIGHT * 0.65;
  const bubbleW = bubbleX1 - bubbleX0;
  const bubbleH = bubbleY1 - bubbleY0;

  ctx.save();
  ctx.shadowColor = "rgba(4, 12, 24, 0.4)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  speechBubblePath(ctx, bubbleX0, bubbleY0, bubbleW, bubbleH, 40);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(141, 198, 63, 0.55)";
  ctx.lineWidth = 1.5;
  speechBubblePath(ctx, bubbleX0, bubbleY0, bubbleW, bubbleH, 40);
  ctx.stroke();
  ctx.restore();

  // Decorative green swoosh accents (top-left & bottom-right corners of the bubble)
  const drawSwoosh = (cx: number, cy: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = GREEN_BRIGHT;
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
    36,
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

  // ---- 6. Campaign tagline beneath the bubble ----
  const taglineCx = bubbleX0 + bubbleW / 2;
  const tagline1Y = HEIGHT * 0.7;
  const tagline2Y = HEIGHT * 0.748;

  const drawDivider = (y: number) => {
    const dw = bubbleW * 0.4;
    const grad = ctx.createLinearGradient(taglineCx - dw / 2, y, taglineCx + dw / 2, y);
    grad.addColorStop(0, "rgba(227, 237, 249, 0)");
    grad.addColorStop(0.5, "rgba(227, 237, 249, 0.55)");
    grad.addColorStop(1, "rgba(227, 237, 249, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(taglineCx - dw / 2, y, dw, 1.5);
  };
  drawDivider(tagline1Y - HEIGHT * 0.05);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TAGLINE_LIGHT;
  drawFittedText(ctx, "LIVED EXPERIENCES HEARD:", taglineCx, tagline1Y, bubbleW - 40, 30, "400", displayFont, 18);
  ctx.fillStyle = GREEN_BRIGHT;
  drawFittedText(ctx, "REAL VOICES, REAL CHANGE", taglineCx, tagline2Y, bubbleW - 20, 34, "400", displayFont, 20);
  ctx.restore();

  drawDivider(tagline2Y + HEIGHT * 0.025);

  // ---- 7. Emblem row: WFMH oval (top-right), WMHD ribbon (bottom-left), Hiranis logo (bottom-right) ----
  drawAssetContain(ctx, wfmhLogo, WIDTH * 0.76, HEIGHT * 0.02, WIDTH * 0.985, HEIGHT * 0.195, "right", "top");
  drawAssetContain(ctx, wmhdRibbon, WIDTH * 0.055, HEIGHT * 0.735, WIDTH * 0.2, HEIGHT * 0.965, "left", "bottom");
  drawAssetContain(ctx, hiranisLogo, WIDTH * 0.79, HEIGHT * 0.875, WIDTH * 0.975, HEIGHT * 0.965, "right", "bottom");
}
