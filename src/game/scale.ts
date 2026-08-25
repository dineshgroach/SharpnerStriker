let canvasZoom = 1;

/** Device pixels per world unit, kept in sync by game.ts fitCanvasToScreen. */
export function setCanvasZoom(zoom: number) {
  canvasZoom = zoom;
}

export function getCanvasZoom(): number {
  return canvasZoom;
}