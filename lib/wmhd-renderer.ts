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

/**
 * Wraps text to fit both the width and the height of a box, shrinking the font
 * until the wrapped paragraph fits — rather than capping at a fixed line count
 * and truncating early. Only truncates the final line if even the minimum font
 * size can't fit everything.
 */
function fitTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  initialFontSize: number,
  fontWeight: string,
  fontFamily: string,
  minFontSize: number,
  lineHeightRatio = 1.32
): { lines: string[]; fontSize: number; lineHeight: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);

  const buildLines = (fontSize: number): string[] => {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  let fontSize = initialFontSize;
  let lines = buildLines(fontSize);
  let lineHeight = Math.round(fontSize * lineHeightRatio);

  while (lines.length * lineHeight > maxHeight && fontSize > minFontSize) {
    fontSize -= 1;
    lines = buildLines(fontSize);
    lineHeight = Math.round(fontSize * lineHeightRatio);
  }

  const maxLinesAllowed = Math.max(1, Math.floor(maxHeight / lineHeight));
  if (lines.length > maxLinesAllowed) {
    lines = lines.slice(0, maxLinesAllowed);
    const lastIndex = lines.length - 1;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    let lastLine = lines[lastIndex];
    while (lastLine.length > 3 && ctx.measureText(lastLine + "…").width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = lastLine.trimEnd() + "…";
  }
  return { lines, fontSize, lineHeight };
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

/** Rounded rect with only the bottom corners rounded — matches the info card beneath the name bar. */
function bottomRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y);
  ctx.closePath();
}

function drawPlaceholderAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, "#e2e8f0");
  bg.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.45;
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.28, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 1.0, r * 0.65, Math.PI, 0);
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

  // ---- 2. Speaker Photo Card Geometry ----
  // Card bounds precisely tuned to cover the template's placeholder area completely
  const cardX0 = 54;
  const cardX1 = 476;
  const cardW = cardX1 - cardX0; // 422
  const cardCx = cardX0 + cardW / 2; // 265
  const photoY0 = 308;
  const greenY0 = 716;
  const greenY1 = 788;
  const greenH = greenY1 - greenY0; // 72
  const photoH = greenY0 - photoY0; // 408
  const photoRadius = 18;

  // Green Name bar extends horizontally matching the template's wings
  const greenX0 = 35.5;
  const greenX1 = 484;
  const greenW = greenX1 - greenX0; // 448.5
  const greenCx = greenX0 + greenW / 2; // 259.75

  // Info card (Role / Designation and Organization / Hospital)
  // Capped to the template's own light-blue placeholder so the card never
  // grows tall enough to cover the WMHD ribbon emblem baked in just below it.
  const infoY0 = greenY1; // 788
  const infoY1 = 870;
  const infoH = infoY1 - infoY0; // 82
  const infoRadius = 18;

  // 2a. Fill solid base behind card to ensure zero white template leaks
  ctx.save();
  topRoundedRectPath(ctx, cardX0, photoY0, cardW, photoH, photoRadius);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.restore();

  // 2b. Draw photo clipped to top-rounded card
  ctx.save();
  topRoundedRectPath(ctx, cardX0, photoY0, cardW, photoH, photoRadius);
  ctx.clip();
  if (userImg) {
    drawCoverImage(ctx, userImg, cardX0, photoY0, cardW, photoH);
  } else {
    drawPlaceholderAvatar(ctx, cardX0, photoY0, cardW, photoH);
  }
  ctx.restore();

  // 2c. Proper bordering around the uploaded photo:
  // Crisp border in the campaign's theme green, matching the name bar directly beneath it
  ctx.save();
  topRoundedRectPath(ctx, cardX0, photoY0, cardW, photoH, photoRadius);
  ctx.strokeStyle = "#73bf39";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  // ---- 3. Name — crisp vibrant green bar with bold white text directly beneath the photo ----
  ctx.save();
  // Drop shadow for green bar to give depth over the background
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  const greenGrad = ctx.createLinearGradient(greenX0, greenY0, greenX0, greenY1);
  greenGrad.addColorStop(0, "#73bf39");
  greenGrad.addColorStop(1, "#5fa729");
  ctx.fillStyle = greenGrad;
  ctx.fillRect(greenX0, greenY0, greenW, greenH);
  ctx.restore();

  // Highlights and borders on green bar
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(greenX0, greenY0, greenW, 1.5);
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(greenX0, greenY1 - 1.5, greenW, 1.5);
  ctx.restore();

  // Name text
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  const nameText = (data.name.trim() || "Your Name").toUpperCase();
  drawFittedText(
    ctx,
    nameText,
    greenCx,
    greenY0 + greenH / 2 + 1,
    greenW - 36,
    25 * S,
    "800",
    fontFamily,
    14 * S
  );
  ctx.restore();

  // ---- 4. Role / Designation and Organization / Hospital Container ----
  ctx.save();
  bottomRoundedRectPath(ctx, cardX0, infoY0, cardW, infoH, infoRadius);
  const infoGrad = ctx.createLinearGradient(cardX0, infoY0, cardX0, infoY1);
  infoGrad.addColorStop(0, "#ebf6fd");
  infoGrad.addColorStop(1, "#d4eefb");
  ctx.fillStyle = infoGrad;
  ctx.fill();

  ctx.strokeStyle = "#a4d5ee";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 4b. Text formatting and alignment inside Info Container
  const desigText = data.designation.trim();
  const orgText = data.organization.trim();
  const safeTextW = cardW - 32;

  if (desigText && orgText) {
    // Both Role and Organization are provided
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Role / Designation (Title): Bold Navy
    const desigFontSize = Math.min(22 * S, 25);
    ctx.font = `700 ${desigFontSize}px ${fontFamily}`;
    let finalDesig = desigText;
    let actualDesigFs = desigFontSize;
    let dWidth = ctx.measureText(finalDesig).width;
    while (dWidth > safeTextW && actualDesigFs > 14 * S) {
      actualDesigFs -= 1;
      ctx.font = `700 ${actualDesigFs}px ${fontFamily}`;
      dWidth = ctx.measureText(finalDesig).width;
    }
    if (dWidth > safeTextW) {
      while (finalDesig.length > 3 && ctx.measureText(finalDesig + "…").width > safeTextW) {
        finalDesig = finalDesig.slice(0, -1);
      }
      finalDesig += "…";
    }

    // Organization / Hospital: Multi-line wrapped if long
    let orgFs = Math.min(16.5 * S, 19);
    ctx.font = `600 ${orgFs}px ${fontFamily}`;
    let orgLineH = Math.round(orgFs * 1.25);

    const buildOrgLines = (fs: number) => {
      ctx.font = `600 ${fs}px ${fontFamily}`;
      const words = orgText.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const cand = cur ? `${cur} ${w}` : w;
        if (!cur || ctx.measureText(cand).width <= safeTextW) {
          cur = cand;
        } else {
          lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    let orgLines = buildOrgLines(orgFs);
    if (orgLines.length > 2 && orgFs > 13 * S) {
      orgFs -= 1.5;
      orgLineH = Math.round(orgFs * 1.22);
      orgLines = buildOrgLines(orgFs);
    }
    if (orgLines.length > 2) {
      orgLines = orgLines.slice(0, 2);
      let last = orgLines[1];
      ctx.font = `600 ${orgFs}px ${fontFamily}`;
      while (last.length > 3 && ctx.measureText(last + "…").width > safeTextW) {
        last = last.slice(0, -1);
      }
      orgLines[1] = last.trimEnd() + "…";
    }

    // Vertically center the entire block inside infoH
    const spacing = 7;
    const dividerH = 1;
    const totalBlockH = actualDesigFs + spacing + dividerH + spacing + orgLines.length * orgLineH;
    const startY = infoY0 + (infoH - totalBlockH) / 2 + actualDesigFs * 0.85;

    // Draw Role
    ctx.fillStyle = "#0e2855";
    ctx.font = `700 ${actualDesigFs}px ${fontFamily}`;
    ctx.fillText(finalDesig, cardCx, startY);

    // Draw subtle divider
    const divY = startY + spacing;
    const divW = Math.min(safeTextW * 0.72, 250);
    ctx.strokeStyle = "rgba(164, 213, 238, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardCx - divW / 2, divY);
    ctx.lineTo(cardCx + divW / 2, divY);
    ctx.stroke();

    // Draw Organization lines
    ctx.fillStyle = "#223f72";
    ctx.font = `600 ${orgFs}px ${fontFamily}`;
    let lineY = divY + spacing + orgFs * 0.82;
    for (const line of orgLines) {
      let disp = line;
      if (ctx.measureText(disp).width > safeTextW) {
        while (disp.length > 3 && ctx.measureText(disp + "…").width > safeTextW) {
          disp = disp.slice(0, -1);
        }
        disp += "…";
      }
      ctx.fillText(disp, cardCx, lineY);
      lineY += orgLineH;
    }
    ctx.restore();
  } else if (desigText || orgText) {
    // Single field provided
    const singleText = desigText || orgText;
    const isDesig = Boolean(desigText);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0e2855";

    const baseFs = (isDesig ? 21 : 18) * S;
    ctx.font = `${isDesig ? "700" : "600"} ${baseFs}px ${fontFamily}`;

    if (ctx.measureText(singleText).width <= safeTextW) {
      ctx.fillText(singleText, cardCx, infoY0 + infoH / 2);
    } else {
      const words = singleText.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const cand = cur ? `${cur} ${w}` : w;
        if (!cur || ctx.measureText(cand).width <= safeTextW) {
          cur = cand;
        } else {
          lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
      const lineH = Math.round(baseFs * 1.25);
      const totalH = lines.slice(0, 2).length * lineH;
      let y = infoY0 + (infoH - totalH) / 2 + lineH / 2;
      for (const l of lines.slice(0, 2)) {
        let disp = l;
        if (ctx.measureText(disp).width > safeTextW) {
          while (disp.length > 3 && ctx.measureText(disp + "…").width > safeTextW) {
            disp = disp.slice(0, -1);
          }
          disp += "…";
        }
        ctx.fillText(disp, cardCx, y);
        y += lineH;
      }
    }
    ctx.restore();
  }

  // ---- 5. Quote — centered inside the speech bubble cut into the template ----
  // Box is inset from the bubble's measured white region to clear its rounded
  // corners and the pointer tail baked into the template artwork.
  const bubbleTextX0 = WIDTH * 0.365;
  const bubbleTextX1 = WIDTH * 0.765;
  const bubbleTextY0 = HEIGHT * 0.3;
  const bubbleTextY1 = HEIGHT * 0.565;
  const bubbleTextW = bubbleTextX1 - bubbleTextX0;
  const bubbleTextH = bubbleTextY1 - bubbleTextY0;
  const bubbleCx = bubbleTextX0 + bubbleTextW / 2;

  const messageText = data.message.trim() || "Mental health is as important as physical health.";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Font size auto-fits to the message length: shrinks until the whole quote
  // fits inside the bubble box, both by line width and by total block height.
  const quoteWrap = fitTextBlock(
    ctx,
    `"${messageText}"`,
    bubbleTextW,
    bubbleTextH,
    40 * S,
    "600",
    fontFamily,
    15 * S
  );
  const totalTextH = quoteWrap.lines.length * quoteWrap.lineHeight;
  let qy =
    bubbleTextY0 + (bubbleTextH - totalTextH) / 2 + quoteWrap.fontSize * 0.78;
  ctx.fillStyle = "#1f2430";
  ctx.font = `600 ${quoteWrap.fontSize}px ${fontFamily}`;
  for (const line of quoteWrap.lines) {
    ctx.fillText(line, bubbleCx, qy);
    qy += quoteWrap.lineHeight;
  }
  ctx.restore();
}
