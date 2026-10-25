import type { Flavor, Pattern } from "@/lib/flavors";

// Étiquette de la canette 3D, dessinée dans un canvas puis enroulée autour du cylindre.
// x = tour de la canette (le centre, x = W/2, est la face avant), y = hauteur du corps.
export const LABEL_W = 1024;
export const LABEL_H = 512;

type LabelFlavor = Pick<Flavor, "name" | "color" | "accent" | "secondary" | "pattern" | "ingredients">;

// Générateur pseudo-aléatoire déterministe : la même saveur a toujours les mêmes bulles
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: Pattern, color: string) {
  const W = LABEL_W;
  const H = LABEL_H;
  const s = 3.5; // pixels par unité du SVG de components/Can.tsx
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (pattern) {
    case "stripes":
      ctx.translate(W / 2, H / 2);
      ctx.rotate((35 * Math.PI) / 180);
      for (let x = -W; x < W; x += 14 * s) ctx.fillRect(x, -W, 6 * s, 2 * W);
      break;
    case "dots":
      for (let y = 0; y < H + 12 * s; y += 12 * s)
        for (let x = 0; x < W + 12 * s; x += 12 * s)
          for (const [dx, dy] of [[3, 3], [9, 9]]) {
            ctx.beginPath();
            ctx.arc(x + dx * s, y + dy * s, 2.4 * s, 0, Math.PI * 2);
            ctx.fill();
          }
      break;
    case "waves":
      ctx.lineWidth = 2.6 * s;
      for (let y = 6 * s; y < H + 12 * s; y += 12 * s) {
        ctx.beginPath();
        for (let x = 0; x < W + 24 * s; x += 24 * s) {
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 6 * s, y - 6 * s, x + 12 * s, y);
          ctx.quadraticCurveTo(x + 18 * s, y + 6 * s, x + 24 * s, y);
        }
        ctx.stroke();
      }
      break;
    case "zigzag":
      ctx.lineWidth = 3 * s;
      ctx.lineJoin = "round";
      for (let y = 9 * s; y < H + 12 * s; y += 12 * s) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < W + 16 * s; x += 16 * s) {
          ctx.lineTo(x + 8 * s, y - 6 * s);
          ctx.lineTo(x + 16 * s, y);
        }
        ctx.stroke();
      }
      break;
    case "checker":
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.PI / 4);
      for (let y = -W; y < W; y += 16 * s)
        for (let x = -W; x < W; x += 16 * s) {
          ctx.fillRect(x, y, 8 * s, 8 * s);
          ctx.fillRect(x + 8 * s, y + 8 * s, 8 * s, 8 * s);
        }
      break;
    case "rings":
      ctx.lineWidth = 5 * s;
      for (let r = 14 * s; r < W * 1.2; r += 15 * s) {
        ctx.beginPath();
        ctx.arc(W / 2 + 46 * s, -8 * s, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "sunburst":
      for (let i = 0; i < 36; i += 2) {
        const a1 = (i * 10 * Math.PI) / 180;
        const a2 = ((i + 1) * 10 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(W / 2, H * 1.05);
        ctx.lineTo(W / 2 + W * Math.cos(a1), H * 1.05 + W * Math.sin(a1));
        ctx.lineTo(W / 2 + W * Math.cos(a2), H * 1.05 + W * Math.sin(a2));
        ctx.closePath();
        ctx.fill();
      }
      break;
    case "bubbles": {
      const rand = seeded(7);
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 70; i++) {
        ctx.beginPath();
        ctx.arc(rand() * W, rand() * H, (3 + rand() * 6) * s, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "split": {
      // Tranche de pastèque : la limite ondule pour se raccorder au dos de la canette
      const edge = (x: number) => H * 0.6 + H * 0.08 * Math.sin((2 * Math.PI * x) / W);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, edge(x));
      ctx.lineTo(W, H);
      ctx.fill();
      ctx.strokeStyle = "#f4ffe8";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, edge(x) - 4);
      ctx.stroke();
      ctx.fillStyle = "#1a1a1a";
      ctx.globalAlpha = 0.75;
      for (let x = 30; x < W; x += 70) {
        ctx.beginPath();
        ctx.ellipse(x, edge(x) - 40 - ((x * 7) % 30), 7, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

// Récupère la vraie police chargée par next/font (variable CSS posée sur <html>)
function fontFamily(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export async function drawCanLabel(flavor: LabelFlavor): Promise<HTMLCanvasElement> {
  const display = fontFamily("--font-bricolage", "sans-serif");
  const sans = fontFamily("--font-geist-sans", "sans-serif");
  await Promise.all([document.fonts.load(`800 72px ${display}`), document.fonts.load(`600 20px ${sans}`)]).catch(
    () => undefined,
  );

  const W = LABEL_W;
  const H = LABEL_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = flavor.color;
  ctx.fillRect(0, 0, W, H);
  drawPattern(ctx, flavor.pattern, flavor.secondary);

  // Bandeau vertical derrière le logo, sur la face avant
  const bandW = 104;
  const bandTop = 70;
  const bandH = 340;
  ctx.fillStyle = flavor.color;
  ctx.beginPath();
  ctx.roundRect(W / 2 - bandW / 2, bandTop, bandW, bandH, bandW / 2);
  ctx.fill();
  ctx.strokeStyle = flavor.accent;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Logo vertical
  ctx.save();
  ctx.translate(W / 2, bandTop + bandH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = flavor.accent;
  ctx.font = `800 70px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "4px";
  ctx.fillText("PÉTILLE", 0, 4);
  ctx.restore();

  // Mentions en haut, tout autour
  ctx.fillStyle = flavor.accent;
  ctx.font = `600 20px ${sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.85;
  for (const x of [W / 2, W / 4, (3 * W) / 4]) ctx.fillText("33 cl · BIO", x, 40);
  ctx.globalAlpha = 1;

  // Bandeau du nom, sur tout le tour
  ctx.fillStyle = flavor.accent;
  ctx.fillRect(0, 438, W, 50);
  ctx.fillStyle = flavor.color;
  ctx.font = `800 30px ${display}`;
  ctx.letterSpacing = "2px";
  // Devant et au dos (à cheval sur la jointure), assez espacés pour les noms longs
  for (const x of [W / 2, 0, W]) ctx.fillText(flavor.name.toUpperCase(), x, 464, 440);
  ctx.letterSpacing = "0px";

  // Dos de la canette : ingrédients, à cheval sur la jointure (x = 0 et x = W)
  if (flavor.ingredients.length > 0) {
    const lines = ["INGRÉDIENTS", ...flavor.ingredients];
    const boxW = 230;
    const boxH = 40 + lines.length * 28;
    const top = (438 - boxH) / 2;
    for (const cx of [0, W]) {
      ctx.fillStyle = flavor.color;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, top, boxW, boxH, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = flavor.accent;
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? `800 20px ${display}` : `500 18px ${sans}`;
        ctx.fillText(line, cx, top + 30 + i * 28, boxW - 24);
      });
    }
  }

  return canvas;
}
