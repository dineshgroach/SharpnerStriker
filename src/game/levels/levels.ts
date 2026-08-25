export interface TargetSpec {
  id: string;
  /** Rect as fractions of the page box (0..1, origin top-left). */
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  points: number;
}

export interface LevelData {
  id: number;
  title: string;
  /** URL of the page image under public/assets/Pages/. */
  pageUrl: string;
  /** Display width of the page in world units (px). Height follows the PNG aspect ratio. */
  pageWidth: number;
  attempts: number;
  targets: TargetSpec[];
}

const PAGE_WIDTH = 720;

/**
 * Ordered book pages. The run plays each page once: land on any photo to
 * score it, otherwise move on. Bounding boxes below were mapped from the
 * PNG artwork.
 */
export const levels: LevelData[] = [
  {
    id: 1,
    title: 'Page 1',
    pageUrl: `${import.meta.env.BASE_URL}assets/Pages/Page1.png`,
    pageWidth: PAGE_WIDTH,
    attempts: 1,
    targets: [
      { id: 'city-square', fx: 0.0785, fy: 0.236, fw: 0.5523, fh: 0.2385, points: 100 },
      { id: 'family-portrait', fx: 0.6591, fy: 0.78, fw: 0.2624, fh: 0.1205, points: 150 },
    ],
  },
  {
    id: 2,
    title: 'Page 2',
    pageUrl: `${import.meta.env.BASE_URL}assets/Pages/Page2.png`,
    pageWidth: PAGE_WIDTH,
    attempts: 1,
    targets: [
      { id: 'city-crowd', fx: 0.6284, fy: 0.0771, fw: 0.3261, fh: 0.3903, points: 100 },
      { id: 'harbor-boats', fx: 0.0464, fy: 0.7183, fw: 0.5412, fh: 0.2153, points: 150 },
    ],
  },
  {
    id: 3,
    title: 'Page 3',
    pageUrl: `${import.meta.env.BASE_URL}assets/Pages/Page3.png`,
    pageWidth: PAGE_WIDTH,
    attempts: 1,
    targets: [
      { id: 'clock-tower', fx: 0.636, fy: 0.0758, fw: 0.3156, fh: 0.3696, points: 100 },
      { id: 'harbor-panorama', fx: 0.0474, fy: 0.633, fw: 0.9052, fh: 0.1765, points: 150 },
    ],
  },
  {
    id: 4,
    title: 'Page 4',
    pageUrl: `${import.meta.env.BASE_URL}assets/Pages/Page4.png`,
    pageWidth: PAGE_WIDTH,
    attempts: 1,
    targets: [
      { id: 'cobbled-street', fx: 0.6389, fy: 0.0778, fw: 0.3147, fh: 0.3528, points: 100 },
      { id: 'grand-theatre', fx: 0.0436, fy: 0.501, fw: 0.5602, fh: 0.2032, points: 150 },
    ],
  },
  {
    id: 5,
    title: 'Page 5',
    pageUrl: `${import.meta.env.BASE_URL}assets/Pages/Page5.png`,
    pageWidth: PAGE_WIDTH,
    attempts: 1,
    targets: [
      { id: 'bridge-panorama', fx: 0.0455, fy: 0.0718, fw: 0.909, fh: 0.3588, points: 200 },
    ],
  },
];
