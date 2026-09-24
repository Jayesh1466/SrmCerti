"use client";

import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface EditableItem {
  id: string;
  label: string;
  position: Position;
  color?: string;
  kind: "image" | "text";
  imageUrl?: string;
  textPreview?: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
}

interface Props {
  backgroundUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  items: EditableItem[];
  activeId?: string | null;
  onChange: (id: string, position: Position) => void;
  onSelect?: (id: string) => void;
  maxWidth?: number;
}

function useImage(url: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
  useEffect(() => {
    if (!url) return;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    image.onload = () => setImg(image);
  }, [url]);
  return img;
}

function EditableNode({
  item,
  scaleX,
  scaleY,
  displayScale,
  isActive,
  onSelect,
  onChange,
}: {
  item: EditableItem;
  scaleX: number;
  scaleY: number;
  displayScale: number;
  isActive: boolean;
  onSelect: () => void;
  onChange: (pos: Position) => void;
}) {
  const shapeRef = useRef<Konva.Rect | Konva.Image | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const img = useImage(item.imageUrl);

  useEffect(() => {
    if (isActive && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isActive]);

  const x = item.position.x * scaleX;
  const y = item.position.y * scaleY;
  const width = item.position.width * scaleX;
  const height = item.position.height * scaleY;

  const commonProps = {
    x,
    y,
    width,
    height,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onChange({
        x: node.x() / scaleX,
        y: node.y() / scaleY,
        width: item.position.width,
        height: item.position.height,
      });
    },
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;
      const nodeScaleX = node.scaleX();
      const nodeScaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: node.x() / scaleX,
        y: node.y() / scaleY,
        width: (node.width() * nodeScaleX) / scaleX,
        height: (node.height() * nodeScaleY) / scaleY,
      });
    },
  };

  return (
    <>
      {item.kind === "image" ? (
        img ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <KonvaImage ref={shapeRef as any} image={img} {...commonProps} />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Rect ref={shapeRef as any} {...commonProps} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
        )
      ) : (
        <>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Rect ref={shapeRef as any} {...commonProps} fill="rgba(59,130,246,0.08)" stroke={isActive ? "#2563eb" : "#94a3b8"} strokeWidth={1} dash={[4, 3]} />
          <Text
            x={x}
            y={y}
            width={width}
            height={height}
            text={item.textPreview || item.label}
            fontSize={(item.fontSize || 24) * displayScale}
            fontFamily={item.fontFamily || "Arial"}
            fill={item.fontColor || "#000"}
            align={item.align || "center"}
            verticalAlign={item.verticalAlign || "middle"}
            listening={false}
          />
        </>
      )}
      {isActive && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Transformer ref={trRef as any} rotateEnabled={false} boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)} />
      )}
    </>
  );
}

export function CanvasEditor({
  backgroundUrl,
  naturalWidth,
  naturalHeight,
  items,
  activeId,
  onChange,
  onSelect,
  maxWidth = 800,
}: Props) {
  const bgImg = useImage(backgroundUrl);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effectiveMaxWidth = containerWidth ? Math.min(maxWidth, containerWidth) : maxWidth;
  const scale = Math.min(effectiveMaxWidth / naturalWidth, 1) || 1;
  const stageWidth = naturalWidth * scale;
  const stageHeight = naturalHeight * scale;

  const RULER_SIZE = 18;
  // Ticks every 10%, with 0/50/100 labeled and the center tick emphasized.
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="w-full max-w-full">
      <div className="flex">
        <div style={{ width: RULER_SIZE }} className="shrink-0" />
        <div ref={containerRef} className="relative min-w-0 flex-1" style={{ height: RULER_SIZE }}>
          {containerWidth != null &&
            ticks.map((pct) => (
              <div
                key={pct}
                className={cn(
                  "absolute bottom-0 flex flex-col items-center",
                  pct === 50 ? "text-red-500" : "text-slate-400"
                )}
                style={{ left: (pct / 100) * stageWidth, transform: "translateX(-50%)" }}
              >
                <span className="text-[9px] leading-none">{pct}</span>
                <div className={cn("w-px", pct === 50 ? "h-2.5 bg-red-500" : "h-1.5 bg-slate-300")} />
              </div>
            ))}
        </div>
      </div>
      <div className="flex">
        <div style={{ width: RULER_SIZE, height: stageHeight }} className="relative shrink-0">
          {ticks.map((pct) => (
            <div
              key={pct}
              className={cn(
                "absolute right-0 flex items-center gap-0.5",
                pct === 50 ? "text-red-500" : "text-slate-400"
              )}
              style={{ top: (pct / 100) * stageHeight, transform: "translateY(-50%)" }}
            >
              <span className="text-[9px] leading-none">{pct}</span>
              <div className={cn("h-px", pct === 50 ? "w-2.5 bg-red-500" : "w-1.5 bg-slate-300")} />
            </div>
          ))}
        </div>
        <div className="min-w-0 overflow-hidden rounded-md border border-slate-300 bg-white">
          <Stage width={stageWidth} height={stageHeight}>
            <Layer>
              {bgImg && <KonvaImage image={bgImg} width={stageWidth} height={stageHeight} />}
              {!bgImg && <Rect width={stageWidth} height={stageHeight} fill="#f1f5f9" />}
              {/* Center guides to help align elements to the middle of the certificate */}
              <Line points={[stageWidth / 2, 0, stageWidth / 2, stageHeight]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} opacity={0.6} listening={false} />
              <Line points={[0, stageHeight / 2, stageWidth, stageHeight / 2]} stroke="#ef4444" strokeWidth={1} dash={[4, 4]} opacity={0.6} listening={false} />
              {items.map((item) => (
                <EditableNode
                  key={item.id}
                  item={item}
                  scaleX={stageWidth}
                  scaleY={stageHeight}
                  displayScale={scale}
                  isActive={activeId === item.id}
                  onSelect={() => onSelect?.(item.id)}
                  onChange={(pos) => onChange(item.id, pos)}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
