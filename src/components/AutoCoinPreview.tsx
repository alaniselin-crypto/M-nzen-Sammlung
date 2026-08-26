import React, { useEffect, useRef, useState } from 'react';
import { CoinAvatar } from './CoinAvatar';
import { formatDriveImageUrl } from '../utils/csv';

interface AutoCoinPreviewProps {
  imageUrl: string;
  name: string;
  faceValue?: string;
  currency?: string;
  material?: string;
  isBanknote?: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

const ANALYSIS_SIZE = 256;
const PREVIEW_SIZE = 512;

const detectCoinBounds = (image: HTMLImageElement): Bounds | null => {
  const scale = Math.min(1, ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const cornerDepth = Math.max(2, Math.round(Math.min(width, height) * 0.08));
  const cornerPixels: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inCorner =
        (x < cornerDepth || x >= width - cornerDepth) &&
        (y < cornerDepth || y >= height - cornerDepth);
      if (inCorner) cornerPixels.push((y * width + x) * 4);
    }
  }

  if (cornerPixels.length === 0) return null;

  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  for (const index of cornerPixels) {
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    alpha += pixels[index + 3];
  }

  const sampleCount = cornerPixels.length;
  red /= sampleCount;
  green /= sampleCount;
  blue /= sampleCount;
  alpha /= sampleCount;

  let variance = 0;
  for (const index of cornerPixels) {
    variance +=
      (pixels[index] - red) ** 2 +
      (pixels[index + 1] - green) ** 2 +
      (pixels[index + 2] - blue) ** 2;
  }
  variance /= sampleCount;

  const colorThreshold = Math.min(85, Math.max(28, Math.sqrt(variance) * 2.2 + 18));
  const thresholdSquared = colorThreshold ** 2;
  const mask = new Uint8Array(width * height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    if (alpha < 32) {
      mask[pixel] = pixels[index + 3] > 64 ? 1 : 0;
      continue;
    }

    const distanceSquared =
      (pixels[index] - red) ** 2 +
      (pixels[index + 1] - green) ** 2 +
      (pixels[index + 2] - blue) ** 2;
    mask[pixel] = distanceSquared > thresholdSquared && pixels[index + 3] > 64 ? 1 : 0;
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let bestBounds: Bounds | null = null;
  let bestScore = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;

    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) continue;
        const neighborX = neighbor % width;
        if (Math.abs(neighborX - x) > 1) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const areaRatio = area / (width * height);
    const aspectRatio = boxWidth / boxHeight;
    const fillRatio = area / (boxWidth * boxHeight);
    if (
      areaRatio < 0.03 ||
      areaRatio > 0.85 ||
      aspectRatio < 0.72 ||
      aspectRatio > 1.38 ||
      fillRatio < 0.35 ||
      fillRatio > 0.95
    ) {
      continue;
    }

    const centerX = sumX / area;
    const centerY = sumY / area;
    const centerDistance = Math.hypot(centerX - width / 2, centerY - height / 2);
    const centerFactor = Math.max(0.35, 1 - centerDistance / Math.hypot(width / 2, height / 2));
    const roundness = 1 - Math.min(1, Math.abs(1 - aspectRatio));
    const fillFactor = 1 - Math.min(1, Math.abs(0.78 - fillRatio) / 0.78);
    const score = area * roundness * fillFactor * centerFactor;

    if (score > bestScore) {
      bestScore = score;
      bestBounds = { minX, minY, maxX, maxY, centerX, centerY };
    }
  }

  return bestBounds;
};

export const AutoCoinPreview: React.FC<AutoCoinPreviewProps> = ({
  imageUrl,
  name,
  faceValue,
  currency,
  material,
  isBanknote = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detected, setDetected] = useState(false);
  const formattedUrl = formatDriveImageUrl(imageUrl);

  useEffect(() => {
    let cancelled = false;
    setDetected(false);
    if (!formattedUrl || isBanknote) return;

    const image = new Image();
    if (/^https?:/i.test(formattedUrl)) image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;

      try {
        const bounds = detectCoinBounds(image);
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!bounds || !canvas || !context) return;

        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;
        context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        context.save();
        context.beginPath();
        context.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2);
        context.clip();

        const scaleX = image.naturalWidth / Math.max(1, Math.round(image.naturalWidth * Math.min(1, ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))));
        const scaleY = image.naturalHeight / Math.max(1, Math.round(image.naturalHeight * Math.min(1, ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))));
        const minX = bounds.minX * scaleX;
        const maxX = (bounds.maxX + 1) * scaleX;
        const minY = bounds.minY * scaleY;
        const maxY = (bounds.maxY + 1) * scaleY;
        const detectedWidth = maxX - minX;
        const detectedHeight = maxY - minY;
        const drawScale = (PREVIEW_SIZE * 0.9) / Math.max(detectedWidth, detectedHeight);
        const centerX = bounds.centerX * scaleX;
        const centerY = bounds.centerY * scaleY;

        context.drawImage(
          image,
          PREVIEW_SIZE / 2 - centerX * drawScale,
          PREVIEW_SIZE / 2 - centerY * drawScale,
          image.naturalWidth * drawScale,
          image.naturalHeight * drawScale
        );
        context.restore();
        if (!cancelled) setDetected(true);
      } catch {
        // Cross-origin or uncertain images silently retain the standard preview.
      }
    };
    image.onerror = () => undefined;
    image.src = formattedUrl;

    return () => {
      cancelled = true;
    };
  }, [formattedUrl, isBanknote]);

  return (
    <div className="relative w-full h-full">
      <CoinAvatar
        imageUrl={imageUrl}
        name={name}
        faceValue={faceValue}
        currency={currency}
        material={material}
        isBanknote={isBanknote}
        size="lg"
        className={`!w-full !h-full !rounded-none !border-0 !shadow-none !object-cover !object-center ${detected ? 'invisible' : ''}`}
      />
      <canvas
        ref={canvasRef}
        aria-label={name}
        className={`absolute inset-0 w-full h-full ${detected ? 'block' : 'hidden'}`}
      />
    </div>
  );
};
