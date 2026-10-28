import Image from "next/image";
import type { Box, Outline } from "@/lib/sam/protocol";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Region of the full image to show, in image pixels. */
  region: Box;
  outlines?: Outline[];
  color?: string;
  className?: string;
};

/** Show one region of a large photo, with SAM outlines in the photo's own coordinates. */
export function PhotoCrop({ src, alt, width, height, region, outlines = [], color = "#d2441e", className = "" }: Props) {
  const rw = region.right - region.left;
  const rh = region.bottom - region.top;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${rw} / ${rh}` }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 40vw, 90vw"
        className="absolute max-w-none"
        style={{
          width: `${(width / rw) * 100}%`,
          height: "auto",
          left: `${(-region.left / rw) * 100}%`,
          top: `${(-region.top / rh) * 100}%`,
        }}
      />
      <svg
        viewBox={`${region.left} ${region.top} ${rw} ${rh}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {outlines.map((o) => (
          <g
            key={o.id}
            transform={`translate(${o.box.left} ${o.box.top}) scale(${(o.box.right - o.box.left) / o.rasterWidth} ${(o.box.bottom - o.box.top) / o.rasterHeight})`}
          >
            <path d={o.path} fill={color} fillOpacity={0.14} fillRule="evenodd" />
            <path d={o.path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Grow a box around its centre, keeping it inside the image and at a given aspect. */
export function regionAround(box: Box, imgW: number, imgH: number, grow = 2.4, aspect = 4 / 3): Box {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  let w = (box.right - box.left) * grow;
  let h = (box.bottom - box.top) * grow;
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  w = Math.min(w, imgW);
  h = Math.min(h, imgH);
  const left = Math.min(Math.max(0, cx - w / 2), imgW - w);
  const top = Math.min(Math.max(0, cy - h / 2), imgH - h);
  return { left, top, right: left + w, bottom: top + h };
}
