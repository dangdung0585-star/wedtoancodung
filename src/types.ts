export interface Point {
  id: string;
  label: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

export interface Line {
  p1: string; // id or label
  p2: string; // id or label
  type: 'solid' | 'dashed';
}

export interface GeometryData {
  points: Point[];
  lines: Line[];
  analysis: string;
}

export interface AppStatus {
  message: string;
  color: 'emerald' | 'indigo' | 'red' | 'slate' | 'teal';
}

export interface LassoPoint {
  x: number;
  y: number;
}

export type CanvasMode = 'view' | 'lasso' | 'edit';
