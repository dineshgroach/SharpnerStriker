import Phaser from 'phaser';
import { physicsConfig } from '../physics/physicsConfig';
import { levels } from '../levels/levels';
import { averageColor, buildTheme, type ThemeColors } from '../utils/colorUtils';
import { getCanvasZoom } from '../scale';
import { bus } from '../bus';
import { sfx } from '../audio';

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 1150;

export type GameStatus =
  | 'loading'
  | 'ready'
  | 'aiming'
  | 'flying'
  | 'landed'
  | 'fell'
  | 'won'
  | 'lost';

interface PageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TargetRuntime {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  points: number;
  done: boolean;
}

type Sharpener = Phaser.GameObjects.Image & { body: MatterJS.BodyType };

const PIXEL_FONT = '"Departure Mono", "Courier New", monospace';

const AMBER = 0xffa133;
const PUMPKIN = 0xe47b1a;
const FOAM = 0xbccabb;
const ENAMEL = 0xeeeeee;
const CEMENT = 0xc0c0c0;
const ASH = 0x8e8e8e;
const SMOKE = 0x666666;
const DARK = 0x444444;
const BLACK = 0x141414;

const CONFETTI_TINTS = [AMBER, PUMPKIN, FOAM, ENAMEL];

function hexToInt(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

export class GameScene extends Phaser.Scene {
  private theme!: ThemeColors;
  private page!: PageRect;
  private pageImage!: Phaser.GameObjects.Image;
  private pageShadow!: Phaser.GameObjects.Graphics;
  private pageFrame!: Phaser.GameObjects.Graphics;
  private sharpener!: Sharpener;
  private sharpenerShadow!: Phaser.GameObjects.Image;
  private aimGraphics!: Phaser.GameObjects.Graphics;

  private targets: TargetRuntime[] = [];

  private state: GameStatus = 'loading';
  private settledFrames = 0;
  private flightTicks = 0;
  private aimStartedAt = 0;

  private readonly totalPages = levels.length;
  private attemptsLeft = levels.length;
  private pageIndex = 0;
  private score = 0;
  private hits = 0;

  private pageCanvases: (HTMLCanvasElement | null)[] = [];
  private pageLoadPromises = new Map<number, Promise<HTMLCanvasElement>>();

  private recentSpeeds: number[] = [];
  private baseScaleX = 1;
  private baseScaleY = 1;

  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private activeFlashes: Phaser.GameObjects.Graphics[] = [];

  private lastCursor = '';

  constructor() {
    super('GameScene');
  }

  async create() {
    this.cameras.main.setZoom(getCanvasZoom());
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.setBackgroundColor('#141414');

    this.targets = [];
    this.score = 0;
    this.hits = 0;
    this.attemptsLeft = this.totalPages;
    this.pageIndex = 0;
    this.settledFrames = 0;
    this.flightTicks = 0;
    this.recentSpeeds.length = 0;

    this.ensureTextures();
    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'desk').setDepth(-10);

    try {
      await document.fonts.load(`16px "Departure Mono"`);
    } catch {
      /* font is optional — falls back to monospace */
    }

    const loadingUi = this.buildLoadingUi();

    // --- Progressive loading: Page 1 + sharpener first, rest in background ---
    // Allows the game to become playable after ~2.5 MB instead of ~13 MB.
    this.pageCanvases = new Array(this.totalPages).fill(null);
    this.pageLoadPromises.clear();

    // Kick off critical assets in parallel with high priority.
    const sharpenerPromise = (async () => {
      if (!this.textures.exists('sharpener')) {
        // `sharpener-cut.png` is preloaded with fetchpriority="high" in index.html
        const sharpenerImage = await this.loadImageElement(
          `${import.meta.env.BASE_URL}assets/Sharpner/sharpener-cut.png`,
          'high'
        );
        // Decode off-main-thread if possible before adding to texture.
        try {
          await sharpenerImage.decode();
        } catch {
          /* decode fallback */
        }
        this.textures.addImage('sharpener', sharpenerImage);
      }
    })();

    // First page is critical — block until it + sharpener are ready.
    await Promise.all([this.loadPageCanvas(0), sharpenerPromise]);

    loadingUi.destroy();

    await this.mountPage(0, true);

    // Prefetch remaining pages sequentially at low priority without blocking gameplay.
    // Fire-and-forget: if navigation reaches a not-yet-loaded page, mountPage will await it.
    void this.preloadRemainingPages();
    this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'vignette').setDepth(15);

    this.matter.world.setGravity(physicsConfig.gravity.x, physicsConfig.gravity.y);

    this.sharpener = this.matter.add
      .image(this.page.x, this.startY(), 'sharpener', undefined, {
        shape: {
          type: 'rectangle',
          width: physicsConfig.sharpenerWidth,
          height: physicsConfig.sharpenerHeight,
        },
        density: physicsConfig.density,
        friction: physicsConfig.friction,
        frictionStatic: physicsConfig.frictionStatic,
        restitution: physicsConfig.restitution,
        frictionAir: physicsConfig.frictionAir,
      })
      .setDepth(10)
      .setDisplaySize(physicsConfig.sharpenerWidth, physicsConfig.sharpenerHeight) as unknown as Sharpener;

    this.baseScaleX = this.sharpener.scaleX;
    this.baseScaleY = this.sharpener.scaleY;

    this.sharpenerShadow = this.add
      .image(this.sharpener.x + 7, this.sharpener.y + 10, 'sharpener')
      .setDepth(9)
      .setTint(0x000000)
      .setDisplaySize(physicsConfig.sharpenerWidth, physicsConfig.sharpenerHeight);

    this.sharpener.setAlpha(0).setScale(this.baseScaleX * 0.3, this.baseScaleY * 0.3);
    this.tweens.add({
      targets: this.sharpener,
      alpha: 1,
      scaleX: this.baseScaleX,
      scaleY: this.baseScaleY,
      duration: 340,
      delay: 220,
      ease: 'Back.easeOut',
    });

    this.buildEmitters();
    this.aimGraphics = this.add.graphics().setDepth(5);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    this.emitHud();
    this.setState('ready');
  }

  /**
   * Swaps in the book page at `index`: rebuilds the page rect, shadow, frame,
   * theme and target rects. The sharpener itself is moved by placeSharpener().
   * Now async: ensures the canvas is loaded (awaiting lazy preload if needed).
   */
  private async mountPage(index: number, animate: boolean) {
    while (this.activeFlashes.length) this.disposeFlash(this.activeFlashes[0]);

    this.pageIndex = index;
    const level = levels[index];
    // Ensure canvas is ready — if background preload hasn't finished, await it.
    // This allows first paint after Page1 while Page2-5 arrive lazily.
    let canvas = this.pageCanvases[index];
    if (!canvas) {
      try {
        canvas = await this.loadPageCanvas(index);
      } catch (err) {
        console.error(`[GameScene] failed to load page ${index}`, err);
        return;
      }
    }
    const key = `page${index}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas!);

    const pw = level.pageWidth;
    const ph = pw * (canvas.height / canvas.width);
    this.page = {
      x: WORLD_WIDTH / 2,
      y: (WORLD_HEIGHT - ph) / 2 + ph / 2,
      w: pw,
      h: ph,
    };

    this.theme = buildTheme(
      averageColor(canvas.getContext('2d')!, canvas.width, canvas.height)
    );

    this.pageImage?.destroy();
    this.pageShadow?.destroy();
    this.pageFrame?.destroy();

    this.pageShadow = this.add.graphics().setDepth(0).setAlpha(animate ? 0 : 1);
    this.pageShadow.fillStyle(0x000000, 0.5);
    this.pageShadow.fillRect(
      this.page.x - pw / 2 + 14,
      this.page.y - ph / 2 + 16,
      pw,
      ph
    );

    this.pageImage = this.add
      .image(this.page.x, this.page.y + (animate ? 24 : 0), key)
      .setDepth(1)
      .setDisplaySize(pw, ph)
      .setAlpha(animate ? 0 : 1);

    this.pageFrame = this.add.graphics().setDepth(2);
    this.pageFrame.lineStyle(2, BLACK, 1);
    this.pageFrame.strokeRect(
      this.page.x - pw / 2 - 1,
      this.page.y - ph / 2 - 1,
      pw + 2,
      ph + 2
    );

    this.buildTargets(pw, ph);

    this.trailEmitter?.setParticleTint(hexToInt(this.theme.aimColor));

    if (animate) {
      this.tweens.add({
        targets: [this.pageShadow, this.pageImage],
        alpha: 1,
        duration: 450,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.pageImage,
        y: this.page.y,
        duration: 450,
        ease: 'Cubic.easeOut',
      });
      this.popupText(
        `PAGE ${index + 1}/${this.totalPages}`,
        this.page.x,
        this.page.y - ph / 2 + 64,
        '#eeeeee',
        21
      );
    }
  }

  /** Recentres the sharpener at the bottom of the current page. */
  private placeSharpener(animated: boolean) {
    if (!this.sharpener) return;
    this.tweens.killTweensOf(this.sharpener);
    this.tweens.killTweensOf(this.sharpenerShadow);
    const b = this.sharpener.body;
    this.matter.body.setStatic(b, false);
    this.matter.body.setPosition(b, { x: this.page.x, y: this.startY() });
    this.matter.body.setVelocity(b, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(b, 0);
    this.matter.body.setAngle(b, 0);
    this.aimGraphics.clear();

    if (animated) {
      this.sharpener.setScale(this.baseScaleX * 0.55, this.baseScaleY * 0.55).setAlpha(0);
      this.tweens.add({
        targets: this.sharpener,
        alpha: 1,
        scaleX: this.baseScaleX,
        scaleY: this.baseScaleY,
        duration: 280,
        ease: 'Back.easeOut',
      });
    } else {
      this.sharpener.setScale(this.baseScaleX, this.baseScaleY).setAlpha(1);
    }
  }

  private startY(): number {
    return (
      this.page.y + this.page.h / 2 - physicsConfig.sharpenerHeight / 2 - 10
    );
  }

  private ensureTextures() {
    if (!this.textures.exists('dot')) {
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 8, 8);
      this.textures.addCanvas('dot', c);
    }

    if (!this.textures.exists('desk')) {
      const c = document.createElement('canvas');
      c.width = WORLD_WIDTH;
      c.height = WORLD_HEIGHT;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(0, 0, c.width, c.height);

      const shade = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
      shade.addColorStop(0, 'rgba(255,255,255,0.03)');
      shade.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.fillStyle = 'rgba(238,238,238,0.05)';
      for (let y = 9; y < c.height; y += 18) {
        for (let x = 9; x < c.width; x += 18) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
      this.textures.addCanvas('desk', c);
    }

    if (!this.textures.exists('vignette')) {
      const c = document.createElement('canvas');
      c.width = WORLD_WIDTH;
      c.height = WORLD_HEIGHT;
      const ctx = c.getContext('2d')!;
      const vg = ctx.createRadialGradient(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.42,
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        Math.max(WORLD_WIDTH, WORLD_HEIGHT) * 0.72
      );
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, c.width, c.height);
      this.textures.addCanvas('vignette', c);
    }
  }

  private buildLoadingUi(): Phaser.GameObjects.Container {
    const container = this.add
      .container(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 40)
      .setDepth(100);
    const spin = this.add.graphics();
    spin.lineStyle(4, ENAMEL, 0.95);
    spin.strokeRect(-14, -14, 28, 28);
    const label = this.add
      .text(-70, 44, 'LOADING PAGE 01 …', {
        fontFamily: PIXEL_FONT,
        fontSize: '17px',
        color: '#eeeeee',
      })
      .setOrigin(0, 0.5);
    const cursor = this.add
      .text(122, 44, '█', {
        fontFamily: PIXEL_FONT,
        fontSize: '15px',
        color: '#ffa133',
      })
      .setOrigin(0, 0.5);
    container.add([spin, label, cursor]);
    this.tweens.add({ targets: spin, rotation: Math.PI, duration: 700, repeat: -1 });
    this.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });
    return container;
  }

  private loadImageElement(
    url: string,
    fetchPriority: 'high' | 'low' | 'auto' = 'auto'
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image() as HTMLImageElement & { fetchPriority?: string };
      // Hint to browser for prioritization (Chrome 101+). Ignored elsewhere.
      if (fetchPriority !== 'auto') {
        try {
          img.fetchPriority = fetchPriority;
        } catch {
          /* ignore — not supported */
        }
      }
      // Use decode() for off-main-thread where possible
      img.onload = () => {
        if (img.decode) {
          img
            .decode()
            .then(() => resolve(img))
            .catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      // Keep decoding async for low-priority so main thread isn't blocked;
      // don't use loading="lazy" on programmatic Images — it can prevent fetch.
      img.decoding = fetchPriority === 'high' ? 'sync' : 'async';
      (img as HTMLImageElement & { loading?: string }).loading = 'eager';
      img.src = url;
    });
  }

  /** Yields to main thread so gameplay/input isn't janked by decoding. */
  private yieldToMain(): Promise<void> {
    return new Promise((resolve) => {
      // Prefer idle callback — falls back to microtask delay
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (w.requestIdleCallback) {
        w.requestIdleCallback(() => resolve(), { timeout: 100 });
      } else {
        setTimeout(resolve, 32);
      }
    });
  }

  /** Loads + caches canvas for page `index`; de-duplicates concurrent requests. */
  private loadPageCanvas(index: number): Promise<HTMLCanvasElement> {
    const cached = this.pageCanvases[index];
    if (cached) return Promise.resolve(cached);
    const inflight = this.pageLoadPromises.get(index);
    if (inflight) return inflight;

    const level = levels[index];
    const priority: 'high' | 'low' = index === 0 ? 'high' : 'low';

    const p = (async () => {
      const img = await this.loadImageElement(level.pageUrl, priority);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.drawImage(img, 0, 0);
      this.pageCanvases[index] = canvas;
      this.pageLoadPromises.delete(index);
      return canvas;
    })();

    // Cache failures too so we can retry next call
    p.catch(() => this.pageLoadPromises.delete(index));
    this.pageLoadPromises.set(index, p);
    return p;
  }

  /** Sequentially loads remaining pages at low priority, yielding between each. */
  private async preloadRemainingPages(): Promise<void> {
    for (let i = 1; i < this.totalPages; i++) {
      if (this.pageCanvases[i]) continue;
      // Yield so the first page's physics/tweens aren't starved
      await this.yieldToMain();
      try {
        await this.loadPageCanvas(i);
        // Hint to Phaser that texture will be needed soon — no-op if already exists
        // Actual `addCanvas` happens at mountPage time.
      } catch (err) {
        console.warn(`[GameScene] preload page ${i} failed`, err);
      }
    }
  }

  private buildTargets(pw: number, ph: number) {
    const left = this.page.x - pw / 2;
    const top = this.page.y - ph / 2;

    this.targets = levels[this.pageIndex].targets.map((spec) => ({
      id: spec.id,
      x: left + spec.fx * pw,
      y: top + spec.fy * ph,
      w: spec.fw * pw,
      h: spec.fh * ph,
      points: spec.points,
      done: false,
    }));
  }

  private targetFlash(t: TargetRuntime) {
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(AMBER, 0.24);
    g.fillRect(t.x, t.y, t.w, t.h);
    g.lineStyle(3, AMBER, 0.95);
    g.strokeRect(t.x, t.y, t.w, t.h);
    this.activeFlashes.push(g);
    this.tweens.add({
      targets: [g],
      alpha: 0,
      duration: 700,
      delay: 150,
      onComplete: () => this.disposeFlash(g),
    });
  }

  private disposeFlash(g: Phaser.GameObjects.Graphics) {
    if (!g.active) return;
    const i = this.activeFlashes.indexOf(g);
    if (i !== -1) this.activeFlashes.splice(i, 1);
    g.destroy();
  }

  /**
   * Scores after the flick stops whenever any part of the sharpener overlaps
   * a target rect. Uses OBB vs AABB SAT on the rotated sharpener so a
   * corner/edge grazing the photo counts as a hit — fixes false misses where
   * the AABB overlapped but the visual was considered off, and vice-versa.
   */
  private checkLandingHit(): boolean {
    if (this.state === 'won' || this.state === 'lost') return false;
    const body = this.sharpener.body as MatterJS.BodyType & {
      position: { x: number; y: number };
      angle: number;
    };
    const pos = body.position;
    const angle = body.angle;
    const hw = physicsConfig.sharpenerWidth / 2;
    const hh = physicsConfig.sharpenerHeight / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // OBB axes
    const ux = cos;
    const uy = sin;
    const vx = -sin;
    const vy = cos;

    for (const t of this.targets) {
      if (t.done) continue;
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      const hw2 = t.w / 2;
      const hh2 = t.h / 2;
      const dx = cx - pos.x;
      const dy = cy - pos.y;

      // 4 SAT axes: OBB ux, OBB vx, world X, world Y
      const axes: Array<[number, number]> = [
        [ux, uy],
        [vx, vy],
        [1, 0],
        [0, 1],
      ];
      let separated = false;
      for (const [ax, ay] of axes) {
        const proj1 = hw * Math.abs(ux * ax + uy * ay) + hh * Math.abs(vx * ax + vy * ay);
        const proj2 = hw2 * Math.abs(ax) + hh2 * Math.abs(ay); // AABB is axis-aligned
        const dist = Math.abs(dx * ax + dy * ay);
        if (dist > proj1 + proj2 + 0.5) {
          separated = true;
          break;
        }
      }
      if (!separated) {
        this.hitTarget(t);
        return true;
      }
    }
    return false;
  }

  private hitTarget(t: TargetRuntime) {
    if (t.done || this.state === 'won' || this.state === 'lost') return;
    t.done = true;
    this.score += t.points;
    this.hits++;
    this.targetFlash(t);
    this.confettiEmitter.explode(20, t.x + t.w / 2, t.y + t.h / 2);
    this.popupText(`+${t.points}`, t.x + t.w / 2, t.y - 16, '#ffa133', 27);
    sfx.hit();
    this.emitHud();
  }

  private popupText(str: string, x: number, y: number, color: string, size: number) {
    const label = this.add
      .text(x, y, str, {
        fontFamily: PIXEL_FONT,
        fontSize: `${size}px`,
        color,
      })
      .setOrigin(0.5)
      .setDepth(60);
    label.setShadow(3, 3, '#141414', 0, true, true);
    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      duration: 860,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Ends the run after the final page and reports the result to the UI. */
  private finishRun() {
    if (this.state === 'won' || this.state === 'lost') return;
    const win = this.hits * 2 > this.totalPages;
    this.setState(win ? 'won' : 'lost');

    if (win) {
      sfx.win();
      this.cameras.main.flash(240, 255, 240, 200);
    } else {
      sfx.lose();
    }
    this.matter.body.setStatic(this.sharpener.body, true);

      bus.emit('result', {
        win,
        score: this.score,
        attemptsUsed: this.totalPages - this.attemptsLeft,
      });
  }

  private getAimDir(): Phaser.Math.Vector2 | null {
    const p = this.input.activePointer;
    const dx = p.worldX - this.sharpener.x;
    const dy = p.worldY - this.sharpener.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) return null;
    return new Phaser.Math.Vector2(dx / len, dy / len);
  }

  private getCharge(): number {
    return Phaser.Math.Clamp(
      (this.time.now - this.aimStartedAt) / physicsConfig.maxChargeMs,
      0,
      1
    );
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'ready') return;
    const d = Phaser.Math.Distance.Between(
      this.sharpener.x,
      this.sharpener.y,
      pointer.worldX,
      pointer.worldY
    );
    if (d > 120) return;

    this.aimStartedAt = this.time.now;
    this.matter.body.setStatic(this.sharpener.body, true);
    this.matter.body.setVelocity(this.sharpener.body, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.sharpener.body, 0);
    this.setState('aiming');
  }

  private onPointerUp() {
    if (this.state !== 'aiming') return;

    const holdMs = this.time.now - this.aimStartedAt;
    const dir = this.getAimDir();

    if (!dir || holdMs < physicsConfig.minHoldToFire) {
      this.matter.body.setStatic(this.sharpener.body, false);
      this.setState('ready');
      return;
    }

    const power = Math.min(1, holdMs / physicsConfig.maxChargeMs);
    const speed = power * physicsConfig.maxLaunchVelocity;

    this.attemptsLeft--;
    this.emitHud();

    sfx.flick(power);
    this.trailEmitter.start();
    this.cameras.main.shake(90, 0.0008 + 0.0012 * power);

    this.tweens.killTweensOf(this.sharpener);
    this.sharpener.setAlpha(1);
    this.tweens.add({
      targets: this.sharpener,
      scaleX: this.baseScaleX * 0.84,
      scaleY: this.baseScaleY * 1.14,
      duration: 80,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });

    this.matter.body.setStatic(this.sharpener.body, false);
    this.matter.body.setVelocity(this.sharpener.body, {
      x: dir.x * speed,
      y: dir.y * speed,
    });
    this.matter.body.setAngularVelocity(
      this.sharpener.body,
      dir.x * speed * 0.02 + (Math.random() - 0.5) * 0.02
    );

    this.settledFrames = 0;
    this.flightTicks = 0;
    this.recentSpeeds.length = 0;
    this.setState('flying');
  }

  update(time: number) {
    if (!this.sharpener || !this.sharpenerShadow) return;

    switch (this.state) {
      case 'ready':
        this.drawGrabHint(time);
        break;
      case 'aiming':
        this.drawAim(time);
        break;
      case 'flying':
        // Don't show power bar / arrow while in motion
        this.aimGraphics.clear();
        this.updateFlight();
        break;
      default:
        this.aimGraphics.clear();
        break;
    }

    const p = this.input.activePointer;
    const d = Phaser.Math.Distance.Between(
      this.sharpener.x,
      this.sharpener.y,
      p.worldX,
      p.worldY
    );
    this.updateCursor(this.state === 'ready' && d < 120, this.state === 'aiming');

    this.sharpenerShadow.setPosition(this.sharpener.x + 7, this.sharpener.y + 10);
    this.sharpenerShadow.setRotation(this.sharpener.rotation);
    this.sharpenerShadow.setScale(this.sharpener.scaleX, this.sharpener.scaleY);
    this.sharpenerShadow.setAlpha(0.22 * this.sharpener.alpha);
  }

  private updateCursor(hover: boolean, grabbing: boolean) {
    const want = grabbing ? 'grabbing' : hover ? 'grab' : 'default';
    if (want !== this.lastCursor) {
      this.lastCursor = want;
      this.game.canvas.style.cursor = want;
    }
  }

  private updateFlight() {
    const b = this.sharpener.body;
    const { x, y } = b.position;
    const left = this.page.x - this.page.w / 2;
    const right = this.page.x + this.page.w / 2;
    const top = this.page.y - this.page.h / 2;
    const bottom = this.page.y + this.page.h / 2;
    const m = physicsConfig.failMargin;

    this.flightTicks++;
    this.recentSpeeds.push(b.speed);
    if (this.recentSpeeds.length > 6) this.recentSpeeds.shift();

    if (x < left - m || x > right + m || y < top - m || y > bottom + m) {
      this.matter.body.setStatic(b, true);
      this.setState('fell');
      this.resolveShot('fell');
      return;
    }

    if (b.speed < physicsConfig.settledSpeed) {
      this.matter.body.setVelocity(b, { x: 0, y: 0 });
      this.matter.body.setAngularVelocity(b, 0);
      this.settledFrames++;
      if (this.settledFrames >= physicsConfig.settledFrames) {
        this.setState('landed');
        this.resolveShot('landed');
        return;
      }
    } else {
      this.settledFrames = 0;
    }

    if (this.flightTicks > physicsConfig.flightTimeoutTicks) {
      this.setState('landed');
      this.resolveShot('landed');
    }
  }

  /**
   * One flick per page: hit scores it, anything else is a miss — either way
     * the run advances to the next page until the last one ends the game.
   */
  private resolveShot(kind: 'landed' | 'fell') {
    this.trailEmitter.stop();
    const impact = this.recentSpeeds.length ? Math.max(...this.recentSpeeds) : 0;
    this.recentSpeeds.length = 0;
    const strength = Phaser.Math.Clamp(
      impact / physicsConfig.maxLaunchVelocity,
      0.12,
      1
    );

    let wasHit = false;
    if (kind === 'landed') {
      const { x, y } = this.sharpener.body.position;
      this.dustEmitter.explode(Math.round(6 + strength * 8), x, y);
      sfx.thud(strength);
      if (strength > 0.35) this.cameras.main.shake(140, 0.0016 * strength);
      wasHit = this.checkLandingHit();
      if (!wasHit && this.state !== 'won' && this.state !== 'lost') {
        this.popupText('MISSED!', x, y - 30, '#e47b1a', 19);
      }
    } else {
      const left = this.page.x - this.page.w / 2;
      const right = this.page.x + this.page.w / 2;
      const top = this.page.y - this.page.h / 2;
      const bottom = this.page.y + this.page.h / 2;
      const ex = Phaser.Math.Clamp(this.sharpener.body.position.x, left + 46, right - 46);
      const ey = Phaser.Math.Clamp(this.sharpener.body.position.y, top + 46, bottom - 46);
      this.dustEmitter.explode(8, ex, ey);
      this.popupText('OFF THE PAGE!', ex, ey - 30, '#e47b1a', 19);
      sfx.thud(strength * 0.6);
      this.cameras.main.shake(120, 0.002);
    }

    if (this.state === 'won' || this.state === 'lost') return;

    const isLast = this.pageIndex >= this.totalPages - 1;
    const delay = kind === 'fell' ? 900 : wasHit ? 1150 : physicsConfig.resetDelay;
    this.time.delayedCall(delay, async () => {
      if (!this.sys.isActive() || this.state === 'won' || this.state === 'lost') return;
      if (isLast) {
        this.finishRun();
      } else {
        // mountPage is now async (lazy-load). Await ensures page texture is ready.
        await this.mountPage(this.pageIndex + 1, true);
        this.placeSharpener(true);
        this.setState('ready');
        this.emitHud();
      }
    });
  }

  private buildEmitters() {
    this.trailEmitter = this.add
      .particles(0, 0, 'dot', {
        follow: this.sharpener,
        lifespan: 300,
        frequency: 22,
        speed: { min: 2, max: 10 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.35, end: 0 },
        tint: hexToInt(this.theme.aimColor),
        emitting: false,
      })
      .setDepth(6);

    this.dustEmitter = this.add
      .particles(0, 0, 'dot', {
        lifespan: { min: 280, max: 430 },
        speed: { min: 24, max: 80 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.65, end: 0.05 },
        alpha: { start: 0.5, end: 0 },
        tint: [ASH, SMOKE],
        gravityY: -30,
        emitting: false,
      })
      .setDepth(30);

    this.confettiEmitter = this.add
      .particles(0, 0, 'dot', {
        lifespan: { min: 450, max: 750 },
        speed: { min: 70, max: 190 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.75, end: 0.1 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        gravityY: 260,
        tint: CONFETTI_TINTS,
        emitting: false,
      })
      .setDepth(31);
  }

  private drawAim(time: number) {
    const g = this.aimGraphics;
    g.clear();

    const dir = this.getAimDir();
    if (!dir) return;
    const power = this.getCharge();
    const sx = this.sharpener.x;
    const sy = this.sharpener.y;

    const baseR = Math.max(physicsConfig.sharpenerWidth, physicsConfig.sharpenerHeight) * 0.62;

    // Circular power arc fixed over the sharpener — replaces the old straight bar.
    const segs = 12;
    const barR = baseR + 38;
    const barThickness = 10;
    const spanDeg = 120;
    const gapDeg = 2.5;
    const spanRad = Phaser.Math.DegToRad(spanDeg);
    const gapRad = Phaser.Math.DegToRad(gapDeg);
    const segRad = (spanRad - (segs - 1) * gapRad) / segs;
    const centerAngle = Phaser.Math.DegToRad(-90);
    const startOverall = centerAngle - spanRad / 2;
    const lit = Math.round(power * segs);
    const full = power >= 0.99;
    const pulse = 0.7 + 0.25 * Math.sin(time / 70);

    for (let i = 0; i < segs; i++) {
      const a0 = startOverall + i * (segRad + gapRad);
      const a1 = a0 + segRad;
      if (i < lit) {
        const tt = i / (segs - 1);
        const c =
          tt < 0.6
            ? lerpColor(CEMENT, AMBER, tt / 0.6)
            : lerpColor(AMBER, PUMPKIN, (tt - 0.6) / 0.4);
        g.lineStyle(barThickness, full ? AMBER : c, full ? pulse : 0.95);
      } else {
        g.lineStyle(barThickness, SMOKE, 0.35);
      }
      g.beginPath();
      g.arc(sx, sy, barR, a0, a1, false);
      g.strokePath();
    }
    g.lineStyle(1, DARK, 0.55);
    g.beginPath();
    g.arc(sx, sy, barR + barThickness / 2 + 1, startOverall, startOverall + spanRad, false);
    g.strokePath();
    g.beginPath();
    g.arc(sx, sy, barR - barThickness / 2 - 1, startOverall, startOverall + spanRad, false);
    g.strokePath();
    if (full) {
      const glowA = 0.5 + 0.4 * Math.sin(time / 70);
      g.lineStyle(barThickness + 8, AMBER, glowA * 0.22);
      g.beginPath();
      g.arc(
        sx,
        sy,
        barR,
        startOverall - Phaser.Math.DegToRad(2),
        startOverall + spanRad + Phaser.Math.DegToRad(2),
        false
      );
      g.strokePath();
    }

    // Direction arrow now sits ABOVE the arc (beyond the bar radius) — high-contrast AMBER core + dark outline for visibility on both dark photos and light paper.
    const arrowBaseR = barR + barThickness / 2 + 12;
    const arrowTipR = arrowBaseR + 8 + power * 14;
    const ax = sx + dir.x * arrowTipR;
    const ay = sy + dir.y * arrowTipR;
    const ang = Math.atan2(dir.y, dir.x);
    const ax0 = sx + dir.x * (baseR - 4);
    const ay0 = sy + dir.y * (baseR - 4);
    const h1 = 8;
    const hx1 = ax - Math.cos(ang - 0.45) * h1;
    const hy1 = ay - Math.sin(ang - 0.45) * h1;
    const hx2 = ax - Math.cos(ang + 0.45) * h1;
    const hy2 = ay - Math.sin(ang + 0.45) * h1;
    // Outline for contrast on light/dark backgrounds
    g.lineStyle(5, BLACK, 0.9);
    g.lineBetween(ax0, ay0, ax, ay);
    g.lineBetween(ax, ay, hx1, hy1);
    g.lineBetween(ax, ay, hx2, hy2);
    // Core in palette (AMBER) — matches power-bar full state
    g.lineStyle(3, AMBER, 1);
    g.lineBetween(ax0, ay0, ax, ay);
    g.lineBetween(ax, ay, hx1, hy1);
    g.lineBetween(ax, ay, hx2, hy2);
  }

  private drawGrabHint(time: number) {
    const g = this.aimGraphics;
    g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(time / 400);
    const stroke = hexToInt(this.theme.aimColor);
    g.lineStyle(2, stroke, 0.25 + pulse * 0.3);
    g.strokeCircle(this.sharpener.x, this.sharpener.y, 37 + pulse * 4);

    const off = time / 900;
    g.lineStyle(2, stroke, 0.3);
    for (let i = 0; i < 12; i++) {
      const a = off + (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(
        this.sharpener.x,
        this.sharpener.y,
        52,
        a,
        a + Math.PI / 14
      );
      g.strokePath();
    }
  }

  private setState(next: GameStatus) {
    this.state = next;
    if (next !== 'flying') this.trailEmitter?.stop();
    // Hide aim UI as soon as sharpener is in motion or round is over
    if (next === 'flying' || next === 'landed' || next === 'fell' || next === 'won' || next === 'lost') {
      this.aimGraphics?.clear();
    }
  }

  /**
   * Deterministic in-place restart — safer than scene.restart(), which reuses
   * the scene instance and previously kept stale score/target state. Invoked
   * directly by the React UI via requestRestart().
   */
  async restartLevel() {
    if (!this.sys.isActive() || !this.sharpener) return;
    this.score = 0;
    this.hits = 0;
    this.attemptsLeft = this.totalPages;
    this.settledFrames = 0;
    this.flightTicks = 0;
    this.recentSpeeds.length = 0;

    this.tweens.killTweensOf(this.sharpener);
    this.time.removeAllEvents();

    await this.mountPage(0, false);
    this.placeSharpener(false);

    this.setState('ready');
    this.emitHud();
  }

  private emitHud() {
    bus.emit('hud', {
      score: this.score,
      hits: this.hits,
      totalTargets: this.totalPages,
      attemptsLeft: this.attemptsLeft,
      totalAttempts: this.totalPages,
    });
  }
}
