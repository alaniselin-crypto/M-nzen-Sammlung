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

interface DetectedCircle {
  centerX: number;
  centerY: number;
  diameter: number;
}

const ANALYSIS_SIZE = 256;
const PREVIEW_SIZE = 512;

const detectCoinCircle = (image: HTMLImageElement): DetectedCircle | null => {
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
  const grayscale = new Float32Array(width * height);
  const gradientX = new Float32Array(width * height);
  const gradientY = new Float32Array(width * height);
  const gradientMagnitude = new Float32Array(width * height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    grayscale[pixel] = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
  }

  const magnitudes: number[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const gx =
        -grayscale[index - width - 1] + grayscale[index - width + 1] +
        -2 * grayscale[index - 1] + 2 * grayscale[index + 1] +
        -grayscale[index + width - 1] + grayscale[index + width + 1];
      const gy =
        -grayscale[index - width - 1] - 2 * grayscale[index - width] - grayscale[index - width + 1] +
        grayscale[index + width - 1] + 2 * grayscale[index + width] + grayscale[index + width + 1];
      const magnitude = Math.hypot(gx, gy);
      gradientX[index] = gx;
      gradientY[index] = gy;
      gradientMagnitude[index] = magnitude;
      if (magnitude > 0) magnitudes.push(magnitude);
    }
  }

  if (magnitudes.length === 0) return null;
  magnitudes.sort((a, b) => a - b);
  const edgeThreshold = Math.max(20, magnitudes[Math.floor(magnitudes.length * 0.88)] || 0);
  const minDimension = Math.min(width, height);
  const minRadius = Math.max(8, Math.round(minDimension * 0.15));
  const maxRadius = Math.max(minRadius, Math.round(minDimension * 0.49));

  const scoreCircle = (centerX: number, centerY: number, radius: number, samples: number) => {
    let score = 0;
    let covered = 0;
    let validSamples = 0;

    for (let sample = 0; sample < samples; sample += 1) {
      const angle = (sample / samples) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = Math.round(centerX + radius * cos);
      const y = Math.round(centerY + radius * sin);
      if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

      validSamples += 1;
      const index = y * width + x;
      const magnitude = gradientMagnitude[index];
      if (magnitude < edgeThreshold) continue;

      const radialAlignment = Math.abs((gradientX[index] * cos + gradientY[index] * sin) / magnitude);
      if (radialAlignment < 0.45) continue;
      covered += 1;
      score += Math.min(2, magnitude / edgeThreshold) * radialAlignment;
    }

    if (validSamples < samples * 0.9) return null;
    const coverage = covered / validSamples;
    if (coverage < 0.48) return null;
    return (score / validSamples) * (0.85 + 0.15 * radius / maxRadius);
  };

  let bestCircle: DetectedCircle | null = null;
  let bestScore = 0;
  const coarseStep = 4;

  for (let radius = minRadius; radius <= maxRadius; radius += 3) {
    for (let centerY = radius; centerY < height - radius; centerY += coarseStep) {
      for (let centerX = radius; centerX < width - radius; centerX += coarseStep) {
        const score = scoreCircle(centerX, centerY, radius, 48);
        if (score !== null && score > bestScore) {
          bestScore = score;
          bestCircle = { centerX, centerY, diameter: radius * 2 };
        }
      }
    }
  }

  if (!bestCircle || bestScore < 0.55) return null;

  const coarseRadius = bestCircle.diameter / 2;
  let refinedCircle = bestCircle;
  let refinedScore = bestScore;
  for (let radius = Math.max(minRadius, coarseRadius - 3); radius <= Math.min(maxRadius, coarseRadius + 3); radius += 1) {
    for (let centerY = bestCircle.centerY - 4; centerY <= bestCircle.centerY + 4; centerY += 1) {
      for (let centerX = bestCircle.centerX - 4; centerX <= bestCircle.centerX + 4; centerX += 1) {
        const score = scoreCircle(centerX, centerY, radius, 96);
        if (score !== null && score > refinedScore) {
          refinedScore = score;
          refinedCircle = { centerX, centerY, diameter: radius * 2 };
        }
      }
    }
  }

  return refinedCircle;
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
        const circle = detectCoinCircle(image);
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!circle || !canvas || !context) return;

        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;
        context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        context.save();
        context.beginPath();
        context.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2);
        context.clip();

        const scaleX = image.naturalWidth / Math.max(1, Math.round(image.naturalWidth * Math.min(1, ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))));
        const scaleY = image.naturalHeight / Math.max(1, Math.round(image.naturalHeight * Math.min(1, ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight))));
        const detectedDiameter = circle.diameter * ((scaleX + scaleY) / 2);
        const drawScale = (PREVIEW_SIZE * 0.9) / detectedDiameter;
        const centerX = circle.centerX * scaleX;
        const centerY = circle.centerY * scaleY;

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
