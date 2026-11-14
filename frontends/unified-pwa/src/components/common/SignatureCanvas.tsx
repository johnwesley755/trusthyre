import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  label?: string;
  required?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  width = 600,
  height = 180,
  label = "Draw Digital Signature",
  required = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Resize and calibrate high-DPI canvas to exactly match the container width/height
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = rect.width > 0 ? rect.width : (width || 500);
    const targetHeight = height || 160;

    canvas.width = targetWidth * dpr;
    canvas.height = targetHeight * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0F2F63';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (!e.touches || e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure stroke styling is active
    ctx.strokeStyle = '#0F2F63';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className="relative w-full rounded-2xl border-2 border-dashed border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden group select-none shadow-xs"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none block"
          style={{ width: '100%', height: `${height}px` }}
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 dark:text-zinc-500 text-xs select-none">
            <span>Sign with your finger, stylus, or mouse here</span>
          </div>
        )}

        <div className="absolute bottom-2 right-3 pointer-events-none select-none">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 dark:text-zinc-700">
            TrustHyre Certified Signature Pad
          </span>
        </div>
      </div>
    </div>
  );
};
