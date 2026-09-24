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

/** Rounded rect with only the top corners rounded — matches the photo card cut into the official template artwork. */
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

/**
 * Renders the official WMHD 2026 banner artwork (wmhd-template-2026.jpg) with the
 * user's photo, name/role/org and quote overlaid into the template's pre-cut white
 * placeholder regions. The template already carries the headline, date pill, WFMH
 * logo, tagline, ribbon and sponsor logo — this only fills in the personalized parts.
 */
export async function renderWMHDBanner(canvas: HTMLCanvasElement, data: WMHDBannerData): Promise<void> {
  // Half-scale of the source template (3508×2480) — keeps its exact aspect ratio.
  const WIDTH = 1754;
  const HEIGHT = 1240;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to obtain 2D canvas context");

  const fontFamily = "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const NAVY_TEXT = "#1b2f5e";
  // Scale factor for font sizes tuned against a 900px-tall canvas baseline.
  const S = HEIGHT / 900;

  if (typeof document !== "undefined" && document.fonts) {
    if (document.fonts.load) {
      await Promise.all([
        document.fonts.load(`700 24px Poppins`),
        document.fonts.load(`800 24px Poppins`),
      ]).catch(() => undefined);
    }
    if (document.fonts.ready) {
      await document.fonts.ready.catch(() => undefined);
    }
  }

  const [template, userImg] = await Promise.all([
    loadImage(`/wmhd-template-2026.jpg?v=1`),
    data.imageData ? loadImage(data.imageData).catch(() => null) : Promise.resolve(null),
  ]);

  // ---- 1. Official campaign artwork (headline, pill, logos, tagline, ribbon — all baked in) ----
  ctx.drawImage(template, 0, 0, WIDTH, HEIGHT);

  // ---- 2. Photo card — cut into the template as a plain white, top-rounded region ----
  const photoX0 = WIDTH * 0.036;
  const photoX1 = WIDTH * 0.257;
  const photoY0 = HEIGHT * 0.253;
  const photoY1 = HEIGHT * 0.575;
  const photoW = photoX1 - photoX0;
  const photoH = photoY1 - photoY0;
  const photoRadius = photoW * 0.05;

  ctx.save();
  topRoundedRectPath(ctx, photoX0, photoY0, photoW, photoH, photoRadius);
  ctx.clip();
  if (userImg) {
    drawCoverImage(ctx, userImg, photoX0, photoY0, photoW, photoH);
  } else {
    drawPlaceholderAvatar(ctx, photoX0, photoY0, photoW, photoH);
  }
  ctx.restore();

  // ---- 3. Name — white bold text on the green bar directly beneath the photo ----
  const nameY0 = HEIGHT * 0.579;
  const nameY1 = HEIGHT * 0.635;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  const nameText = (data.name.trim() || "Your Name").toUpperCase();
  drawFittedText(
    ctx,
    nameText,
    photoX0 + photoW / 2,
    nameY0 + (nameY1 - nameY0) / 2 + 2 * S,
    photoW - 24 * S,
    24 * S,
    "800",
    fontFamily,
    13 * S
  );
  ctx.restore();

  // ---- 4. Designation / organization — navy text on the light-blue bar ----
  const desigY0 = HEIGHT * 0.638;
  const desigY1 = HEIGHT * 0.7;
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY_TEXT;
  const desigLines = [data.designation.trim(), data.organization.trim()].filter(Boolean);
  const desigH = desigY1 - desigY0;
  if (desigLines.length) {
    const lineH = desigH / desigLines.length;
    ctx.textBaseline = "middle";
    desigLines.forEach((line, i) => {
      const fs = (i === 0 ? 19 : 17) * S;
      const weight = i === 0 ? "700" : "500";
      drawFittedText(
        ctx,
        line,
        photoX0 + photoW / 2,
        desigY0 + lineH * i + lineH / 2 + 1 * S,
        photoW - 26 * S,
        fs,
        weight,
        fontFamily,
        11 * S
      );
    });
  }
  ctx.restore();

  // ---- 5. Quote — centered inside the speech bubble cut into the template ----
  const bubbleTextX0 = WIDTH * 0.335;
  const bubbleTextX1 = WIDTH * 0.775;
  const bubbleTextY0 = HEIGHT * 0.285;
  const bubbleTextY1 = HEIGHT * 0.545;
  const bubbleTextW = bubbleTextX1 - bubbleTextX0;
  const bubbleCx = bubbleTextX0 + bubbleTextW / 2;

  const messageText = data.message.trim() || "Mental health is as important as physical health.";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const quoteWrap = wrapTextToLines(
    ctx,
    `"${messageText}"`,
    bubbleTextW,
    36 * S,
    "600",
    fontFamily,
    4,
    20 * S
  );
  const totalTextH = quoteWrap.lines.length * quoteWrap.lineHeight;
  const bubbleTextH = bubbleTextY1 - bubbleTextY0;
  let qy = bubbleTextY0 + bubbleTextH / 2 - totalTextH / 2 + quoteWrap.fontSize * 0.8;
  ctx.fillStyle = "#1f2430";
  ctx.font = `600 ${quoteWrap.fontSize}px ${fontFamily}`;
  for (const line of quoteWrap.lines) {
    ctx.fillText(line, bubbleCx, qy);
    qy += quoteWrap.lineHeight;
  }
  ctx.restore();
}
