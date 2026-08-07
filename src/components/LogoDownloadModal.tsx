import React, { useState } from 'react';
import { X, Download, Image as ImageIcon, Sparkles, Check, Copy } from 'lucide-react';

interface LogoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoDownloadModal: React.FC<LogoDownloadModalProps> = ({ isOpen, onClose }) => {
  const [copiedSvg, setCopiedSvg] = useState(false);

  if (!isOpen) return null;

  // SVG String for inumis.app Logo Emblem
  const emblemSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="goldGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#f59e0b"/>
      <stop offset="70%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#2a201b"/>
      <stop offset="100%" stop-color="#120e0c"/>
    </radialGradient>
  </defs>
  <!-- Background Shield -->
  <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bgGrad)" stroke="#451a03" stroke-width="8"/>
  <!-- Outer Coin Ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="url(#ringGrad)" stroke-width="18"/>
  <circle cx="256" cy="256" r="172" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="6,6"/>
  <!-- Coin Body -->
  <circle cx="256" cy="256" r="150" fill="url(#goldGrad)"/>
  <!-- Inner Coin Details -->
  <circle cx="256" cy="256" r="132" fill="none" stroke="#78350f" stroke-width="4" opacity="0.6"/>
  <!-- Stylized i and Coin Icon -->
  <path d="M 230,175 C 230,161 241,150 255,150 C 269,150 280,161 280,175 C 280,189 269,200 255,200 C 241,200 230,189 230,175 Z" fill="#fff" opacity="0.95"/>
  <path d="M 236,230 L 276,230 L 276,340 C 276,350 268,358 258,358 L 236,358 L 236,340 L 254,340 L 254,248 L 236,248 Z" fill="#fff" opacity="0.95"/>
</svg>`;

  // SVG String for full inumis.app Banner / Horizon Logo
  const fullBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" width="1000" height="300">
  <defs>
    <radialGradient id="bGoldGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#f59e0b"/>
      <stop offset="70%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </radialGradient>
    <linearGradient id="bTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="300" rx="40" fill="#181311"/>
  <!-- Emblem -->
  <g transform="translate(60, 40)">
    <circle cx="110" cy="110" r="100" fill="none" stroke="#d97706" stroke-width="10"/>
    <circle cx="110" cy="110" r="88" fill="url(#bGoldGrad)"/>
    <path d="M 95,65 C 95,57 101,50 110,50 C 119,50 125,57 125,65 C 125,73 119,80 110,80 C 101,80 95,73 95,65 Z" fill="#ffffff"/>
    <path d="M 98,95 L 122,95 L 122,160 L 98,160 Z" fill="#ffffff"/>
  </g>
  <!-- Typography -->
  <text x="310" y="170" font-family="Georgia, serif" font-size="110" font-weight="bold" fill="url(#bTextGrad)">inumis<tspan fill="#94a3b8">.app</tspan></text>
  <text x="315" y="225" font-family="sans-serif" font-size="28" fill="#d6d3d1" letter-spacing="4">DIGITALE MÜNZSAMMLUNG &amp; KI-NUMISMATIK</text>
</svg>`;

  const downloadSvg = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPng = (svgString: string, filename: string, width = 1024, height = 1024) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const copySvgToClipboard = (svgString: string) => {
    navigator.clipboard.writeText(svgString);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1f1916] border border-amber-900/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-[#171210]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100 font-serif">inumis.app Offizielles Logo Download</h2>
              <p className="text-xs text-stone-400">Hochauflösende Vektor- und Bild-Dateien für Ihre Webseite & Präsentationen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800/50 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Option 1: Full Branding Banner Logo */}
          <div className="bg-[#181311] border border-amber-900/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  1. Offizielles Horizontal-Logo (Webseite & Banner)
                </h3>
                <p className="text-xs text-stone-400">Enthält das inumis.app Emblem + Schriftzug in Gold & Weiß</p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-6 bg-[#120e0c] rounded-lg border border-stone-800 flex justify-center items-center">
              <div 
                className="w-full max-w-lg aspect-[10/3]"
                dangerouslySetInnerHTML={{ __html: fullBannerSvg }}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => downloadSvg(fullBannerSvg, 'inumis-app-logo-banner.svg')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors shadow-md"
              >
                <Download className="w-4 h-4" />
                SVG Vektor-Logo (.svg)
              </button>

              <button
                onClick={() => downloadPng(fullBannerSvg, 'inumis-app-logo-banner-hd.png', 1920, 576)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-900/40 rounded-lg text-xs transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                PNG HD Banner (1920x576 px)
              </button>

              <button
                onClick={() => copySvgToClipboard(fullBannerSvg)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 rounded-lg transition-colors ml-auto"
              >
                {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSvg ? 'SVG Kopiert!' : 'SVG-Code kopieren'}
              </button>
            </div>
          </div>

          {/* Option 2: App Emblem / Icon */}
          <div className="bg-[#181311] border border-amber-900/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  2. Münz-Emblem / App Icon (Quadratisch)
                </h3>
                <p className="text-xs text-stone-400">Perfekt als Favicon, App-Icon oder Social Media Profilbild</p>
              </div>
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#120e0c] rounded-lg border border-stone-800 flex flex-col items-center justify-center gap-2">
                <div 
                  className="w-32 h-32"
                  dangerouslySetInnerHTML={{ __html: emblemSvg }}
                />
                <span className="text-[11px] text-stone-400">Vorschau Icon (512x512)</span>
              </div>

              <div className="flex flex-col justify-center space-y-3 p-4 bg-stone-900/40 rounded-lg border border-stone-800/80">
                <p className="text-xs text-stone-300 leading-relaxed">
                  Dieses Gold-Münz-Emblem repräsentiert die Marke <strong>inumis.app</strong> mit dem stilisierten «i» in einer antiken Präge-Optik.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => downloadSvg(emblemSvg, 'inumis-app-emblem.svg')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Emblem SVG herunterladen
                  </button>

                  <button
                    onClick={() => downloadPng(emblemSvg, 'inumis-app-icon-1024x1024.png', 1024, 1024)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    PNG High-Res (1024 x 1024 px)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#171210] border-t border-amber-900/40 flex items-center justify-between text-xs text-stone-400">
          <span>inumis.app • Brand Assets</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
