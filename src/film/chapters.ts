/**
 * Chapter registry. Each chapter: id, labels, scroll length (svh, desktop / mobile).
 * The DOM section holds the real text; the 3D shot renders behind it.
 * Camera keyframes live on the rail as one station per chapter (see rail.ts).
 */
export type ChapterId =
  | 'hero' | 'thread' | 'weave' | 'sarees' | 'mor' | 'suits' | 'chakra' | 'picks' | 'lookbook' | 'visit' | 'knot';

export type Chapter = {
  id: ChapterId;
  label: string;
  labelHi: string;
  /**
   * Scroll length in svh. A chapter with a sticky stage needs more than 100: the extra is how
   * long the stage stays pinned (hero: the coin turn, weave: one stretch per fabric). The knot is
   * exactly one screen, so its stage never overlaps the footer.
   */
  span: { d: number; m: number };
  /** 0..1 — how much of the chapter the camera holds at its station before travelling on. */
  hold: number;
};

export const CHAPTERS: Chapter[] = [
  { id: 'hero', label: 'Draped in Devotion', labelHi: 'श्रद्धा', span: { d: 150, m: 150 }, hold: 0.55 },
  { id: 'thread', label: 'Ek Dhaaga', labelHi: 'एक धागा', span: { d: 150, m: 100 }, hold: 0.2 },
  { id: 'weave', label: 'The Weave', labelHi: 'बुनाई', span: { d: 250, m: 250 }, hold: 0.85 },
  { id: 'sarees', label: 'Six Yards', labelHi: 'छह गज़', span: { d: 250, m: 180 }, hold: 0.85 },
  { id: 'mor', label: 'Mor Pankh', labelHi: 'मोरपंख', span: { d: 50, m: 40 }, hold: 0.5 },
  { id: 'suits', label: 'Suits', labelHi: 'सूट', span: { d: 200, m: 140 }, hold: 0.85 },
  { id: 'chakra', label: 'Rang Chakra', labelHi: 'रंग चक्र', span: { d: 150, m: 100 }, hold: 0.85 },
  { id: 'picks', label: 'Makhan Chor Picks', labelHi: 'माखन चोर पसंद', span: { d: 150, m: 100 }, hold: 0.85 },
  { id: 'lookbook', label: 'Lookbook', labelHi: 'लुकबुक', span: { d: 200, m: 120 }, hold: 0.85 },
  { id: 'visit', label: 'Visit Banswara', labelHi: 'बांसवाड़ा', span: { d: 150, m: 100 }, hold: 0.8 },
  { id: 'knot', label: 'The Knot', labelHi: 'गाँठ', span: { d: 100, m: 100 }, hold: 1 },
];

export const chapterIndex = (id: ChapterId) => CHAPTERS.findIndex((c) => c.id === id);
