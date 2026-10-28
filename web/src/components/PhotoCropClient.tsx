import type { Box, Outline } from "@/lib/sam/protocol";

/**
 * One region of a large photo, filling its container, with SAM outlines drawn
 * in the photo's own pixel coordinates. The SVG viewBox does the crop, so
 * image and outlines can never drift apart.
 */
export function PhotoCropClient({
  src,
  alt,
  width,
  height,
  region,
  outlines = [],
  color = "#12a85f",
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  region: Box;
  outlines?: Outline[];
  color?: string;
  className?: string;
}) {
  const rw = region.right - region.left;
  const rh = region.bottom - region.top;
  return (
    <svg
      viewBox={`${region.left} ${region.top} ${rw} ${rh}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={alt}
    >
      <image href={src} x={0} y={0} width={width} height={height} />
      {outlines.map((o) => (
        <g
          key={o.id}
          transform={`translate(${o.box.left} ${o.box.top}) scale(${(o.box.right - o.box.left) / o.rasterWidth} ${(o.box.bottom - o.box.top) / o.rasterHeight})`}
        >
          <path d={o.path} fill={color} fillOpacity={0.18} fillRule="evenodd" />
          <path d={o.path} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}
