// Vrai si le navigateur peut créer un contexte WebGL (sinon on garde la canette SVG de secours)
let supported: boolean | null = null;

export function hasWebGL() {
  if (supported !== null) return supported;
  try {
    const canvas = document.createElement("canvas");
    supported = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    supported = false;
  }
  return supported;
}
