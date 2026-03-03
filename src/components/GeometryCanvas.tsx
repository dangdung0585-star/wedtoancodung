import React, { useEffect, useRef, useState } from 'react';
import { Point, Line, CanvasMode, LassoPoint } from '../types';

interface GeometryCanvasProps {
  points: Point[];
  lines: Line[];
  mode?: CanvasMode;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onPointsChange?: (points: Point[]) => void;
  onLinesChange?: (lines: Line[]) => void;
}

const GeometryCanvas: React.FC<GeometryCanvasProps> = ({ 
  points, 
  lines, 
  mode = 'view', 
  selectedIds = [], 
  onSelectionChange,
  onPointsChange,
  onLinesChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lassoPath, setLassoPath] = useState<LassoPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);

  // Helper to get distance between point and line segment
  const distToSegment = (p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2);
  };

  // Ray-casting algorithm for point-in-polygon
  const isPointInPolygon = (point: { x: number; y: number }, polygon: LassoPoint[]) => {
    if (polygon.length < 3) return false;
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  const drawAll = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw Lines
    lines.forEach((line) => {
      const p1 = points.find((p) => p.label === line.p1 || p.id === line.p1);
      const p2 = points.find((p) => p.label === line.p2 || p.id === line.p2);

      if (p1 && p2) {
        const x1 = (p1.x / 100) * width;
        const y1 = (p1.y / 100) * height;
        const x2 = (p2.x / 100) * width;
        const y2 = (p2.y / 100) * height;

        ctx.beginPath();
        ctx.lineWidth = mode === 'edit' ? 4 : 2.5;
        ctx.strokeStyle = '#14b8a6';

        if (line.type === 'dashed') {
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.6)';
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw Points
    points.forEach((p) => {
      const px = (p.x / 100) * width;
      const py = (p.y / 100) * height;
      const isSelected = selectedIds.includes(p.id);
      const isDragged = draggedPointId === p.id;

      ctx.setLineDash([]);
      
      // Selection or Drag Highlight
      if (isSelected || isDragged) {
        // Outer glow
        ctx.beginPath();
        ctx.arc(px, py, 15, 0, Math.PI * 2);
        ctx.fillStyle = isDragged ? 'rgba(20, 184, 166, 0.2)' : 'rgba(99, 102, 241, 0.2)';
        ctx.fill();

        // Distinct border
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.strokeStyle = isDragged ? '#14b8a6' : '#6366f1';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = isSelected ? '#6366f1' : '#14b8a6';
      ctx.beginPath();
      ctx.arc(px, py, mode === 'edit' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Label Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = 'bold 15px Inter';
      ctx.fillText(p.label, px + 9, py - 7);

      // Label
      ctx.fillStyle = isSelected ? '#818cf8' : '#fff';
      ctx.fillText(p.label, px + 8, py - 8);
    });

    // Draw Lasso Path
    if (lassoPath.length > 1) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      if (!isDrawing && lassoPath.length > 2) {
        ctx.closePath();
      }
      ctx.stroke();
      
      // Fill lasso area
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.fill();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'lasso') {
      setIsDrawing(true);
      setLassoPath([{ x, y }]);
      if (onSelectionChange) onSelectionChange([]);
      return;
    }

    if (mode === 'edit') {
      // Check for point click (drag)
      const clickedPoint = points.find(p => {
        const px = (p.x / 100) * rect.width;
        const py = (p.y / 100) * rect.height;
        return Math.sqrt((px - x) ** 2 + (py - y) ** 2) < 15;
      });

      if (clickedPoint) {
        setDraggedPointId(clickedPoint.id);
        return;
      }

      // Check for line click (toggle type)
      const clickedLineIndex = lines.findIndex(line => {
        const p1 = points.find(p => p.label === line.p1 || p.id === line.p1);
        const p2 = points.find(p => p.label === line.p2 || p.id === line.p2);
        if (!p1 || !p2) return false;
        const v = { x: (p1.x / 100) * rect.width, y: (p1.y / 100) * rect.height };
        const w = { x: (p2.x / 100) * rect.width, y: (p2.y / 100) * rect.height };
        return distToSegment({ x, y }, v, w) < 8;
      });

      if (clickedLineIndex !== -1 && onLinesChange) {
        const newLines = [...lines];
        newLines[clickedLineIndex] = {
          ...newLines[clickedLineIndex],
          type: newLines[clickedLineIndex].type === 'solid' ? 'dashed' : 'solid'
        };
        onLinesChange(newLines);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing && mode === 'lasso') {
      const newPath = [...lassoPath, { x, y }];
      setLassoPath(newPath);
      
      const width = rect.width;
      const height = rect.height;
      const newlySelected = points
        .filter(p => isPointInPolygon({ x: (p.x / 100) * width, y: (p.y / 100) * height }, newPath))
        .map(p => p.id);
      
      if (onSelectionChange) {
        onSelectionChange(newlySelected);
      }
      return;
    }

    if (draggedPointId && mode === 'edit' && onPointsChange) {
      const newPoints = points.map(p => {
        if (p.id === draggedPointId) {
          return {
            ...p,
            x: Math.max(0, Math.min(100, (x / rect.width) * 100)),
            y: Math.max(0, Math.min(100, (y / rect.height) * 100))
          };
        }
        return p;
      });
      onPointsChange(newPoints);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDraggedPointId(null);
  };

  useEffect(() => {
    if (mode !== 'lasso') {
      setLassoPath([]);
      if (onSelectionChange) onSelectionChange([]);
    }
  }, [mode, onSelectionChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) drawAll(ctx, width, height);
          }
        }
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [points, lines, lassoPath, selectedIds, isDrawing]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-slate-950 relative overflow-hidden ${mode === 'lasso' ? 'cursor-crosshair' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

export default GeometryCanvas;
