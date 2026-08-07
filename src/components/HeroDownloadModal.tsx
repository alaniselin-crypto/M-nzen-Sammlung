import React, { useState } from 'react';
import { X, Download, Sparkles, Image as ImageIcon, Sliders, Check, Layers } from 'lucide-react';

interface HeroDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeroDownloadModal: React.FC<HeroDownloadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'hero' | 'cards'>('cards'); // Default to 3 cards requested
  const [headline, setHeadline] = useState('RARE COINS & HISTORIC BANKNOTES, CURATED');
  const [subtitle, setSubtitle] = useState('Shop authenticated pieces, explore themed collections, and build a legacy set with expert guidance from first purchase to portfolio worthy rarities.');
  const [buttonText, setButtonText] = useState('VIEW COLLECTIONS');
  const [brandText, setBrandText] = useState('INUMIS.APP');
  const [coinStyle, setCoinStyle] = useState<'silver' | 'gold' | 'antique'>('silver');
  const [bgStyle, setBgStyle] = useState<'cream' | 'dark' | 'emerald'>('cream');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  // Background colors
  const bgColors = {
    cream: '#f5f1e8',
    dark: '#14110f',
    emerald: '#0c1a15'
  };

  // Text colors
  const textColors = {
    cream: { primary: '#1a221f', secondary: '#4a5550', brand: '#785b28', btnBg: '#1a2923', btnText: '#ffffff' },
    dark: { primary: '#f5efdf', secondary: '#a8a090', brand: '#d4af37', btnBg: '#d4af37', btnText: '#14110f' },
    emerald: { primary: '#f2f7f4', secondary: '#a3c2b5', brand: '#e5c158', btnBg: '#e5c158', btnText: '#0c1a15' }
  };

  const currentTheme = textColors[bgStyle];

  // ==========================================
  // CARD 1: Vertikale Banknoten (1080x1080)
  // ==========================================
  const generateCard1VerticalBanknotes = () => {
    const bg = bgColors[bgStyle];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${bg}"/>
  
  <!-- Subtle inner margin frame -->
  <rect x="30" y="30" width="1020" height="1020" fill="none" stroke="#e2d8c3" stroke-width="1.5" opacity="0.5"/>

  <!-- Left Banknote (Front / Teal & Slate) -->
  <g transform="translate(180, 160)">
    <!-- Shadow -->
    <rect x="12" y="16" width="310" height="720" rx="10" fill="#000000" opacity="0.08"/>
    <!-- Note Base -->
    <rect width="310" height="720" rx="8" fill="#e2ece9" stroke="#115e59" stroke-width="3"/>
    <rect x="8" y="8" width="294" height="704" rx="6" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-dasharray="6,3"/>
    
    <!-- Top & Bottom Headers -->
    <rect x="16" y="16" width="278" height="40" fill="#115e59" rx="4"/>
    <text x="155" y="42" font-family="monospace" font-size="16" font-weight="bold" fill="#ccfbf1" text-anchor="middle" letter-spacing="4">SPECIMEN</text>
    
    <rect x="16" y="664" width="278" height="40" fill="#115e59" rx="4"/>
    <text x="155" y="688" font-family="monospace" font-size="13" font-weight="bold" fill="#99f6e4" text-anchor="middle" letter-spacing="3">NOT LEGAL TENDER</text>

    <!-- Holographic Foil Strip -->
    <rect x="30" y="70" width="250" height="24" fill="url(#holoGrad)" rx="3" opacity="0.85"/>

    <!-- Central Engraved Portrait Frame -->
    <g transform="translate(35, 120)">
      <!-- Oval Frame -->
      <ellipse cx="120" cy="190" rx="100" ry="140" fill="#f0fdfa" stroke="#0f766e" stroke-width="4"/>
      <ellipse cx="120" cy="190" rx="92" ry="132" fill="none" stroke="#14b8a6" stroke-width="1" stroke-dasharray="3,3"/>
      
      <!-- Statesman Portrait Engraving Lines -->
      <g stroke="#134e4a" stroke-width="1.8" fill="none">
        <!-- Head Contour & Hair -->
        <path d="M 80,120 C 100,80 150,80 160,120 C 170,140 165,160 160,180 C 150,220 90,220 80,180 Z" fill="#2dd4bf" opacity="0.15"/>
        <path d="M 85,115 C 95,95 145,95 155,115 C 165,135 160,170 155,190 Z" stroke-width="2"/>
        <!-- Eyes & Nose -->
        <path d="M 100,140 Q 110,135 120,140 M 130,140 Q 140,135 150,140"/>
        <path d="M 125,140 L 122,165 L 132,168"/>
        <path d="M 112,185 Q 125,192 138,185"/>
        <!-- Suit & Tie -->
        <path d="M 60,280 L 105,210 L 125,240 L 145,210 L 190,280" stroke-width="2.5"/>
        <path d="M 125,240 L 125,320" stroke-width="3"/>
      </g>
    </g>

    <!-- Side Vertical Text -->
    <text x="32" y="480" font-family="Georgia, serif" font-size="14" font-weight="bold" fill="#0f766e" transform="rotate(-90 32 480)" letter-spacing="4">RONAC MTIEMAS</text>

    <!-- Numerals and Stamps -->
    <text x="250" y="580" font-family="monospace" font-size="28" font-weight="bold" fill="#0f766e" text-anchor="middle">10</text>
    <text x="250" y="110" font-family="monospace" font-size="16" fill="#134e4a" text-anchor="middle">88118</text>
    
    <!-- Hologram Rosette at Bottom -->
    <circle cx="155" cy="600" r="28" fill="url(#holoGrad2)" stroke="#0d9488" stroke-width="2"/>
  </g>

  <!-- Right Banknote (Back / Mint Green Rosette) -->
  <g transform="translate(580, 160)">
    <!-- Shadow -->
    <rect x="12" y="16" width="310" height="720" rx="10" fill="#000000" opacity="0.08"/>
    <!-- Note Base -->
    <rect width="310" height="720" rx="8" fill="#f0fdf4" stroke="#15803d" stroke-width="3"/>
    <rect x="8" y="8" width="294" height="704" rx="6" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6,3"/>

    <!-- Large Top Numeral -->
    <text x="50" y="80" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#166534">10</text>
    <text x="230" y="520" font-family="Georgia, serif" font-size="16" fill="#15803d" transform="rotate(90 230 520)" letter-spacing="6">ESTORLINAS</text>

    <!-- Geometric Guilloche Rosette Wheel -->
    <g transform="translate(155, 300)">
      <circle cx="0" cy="0" r="110" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
      <circle cx="0" cy="0" r="92" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="4,4"/>
      
      <!-- Inner Star Geometry -->
      <path d="M 0,-80 L 22,-22 L 80,0 L 22,22 L 0,80 L -22,22 L -80,0 L -22,-22 Z" fill="#15803d" opacity="0.85"/>
      <path d="M -56,-56 L 0,-20 L 56,-56 L 20,0 L 56,56 L 0,20 L -56,56 L -20,0 Z" fill="#86efac" opacity="0.6"/>
      <circle cx="0" cy="0" r="30" fill="#f0fdf4" stroke="#166534" stroke-width="2"/>
      <circle cx="0" cy="0" r="14" fill="#166534"/>
    </g>

    <!-- Watermark Stamp Overlay -->
    <g transform="translate(155, 520)">
      <text x="0" y="0" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#16a34a" text-anchor="middle" opacity="0.25" transform="rotate(-45)">SPECIMEN</text>
    </g>

    <!-- Serial & Bottom Bar -->
    <text x="155" y="630" font-family="monospace" font-size="15" font-weight="bold" fill="#15803d" text-anchor="middle" letter-spacing="3">1Z00059</text>
    <rect x="16" y="664" width="278" height="40" fill="#166534" rx="4"/>
    <text x="155" y="688" font-family="monospace" font-size="13" font-weight="bold" fill="#dcfce7" text-anchor="middle" letter-spacing="3">NOT LEGAL TENDER</text>
  </g>

  <!-- Gradients -->
  <defs>
    <linearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="25%" stop-color="#eab308"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="75%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <radialGradient id="holoGrad2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </radialGradient>
  </defs>
</svg>`;
  };

  // ==========================================
  // CARD 2: Münzenpaar Avers/Revers (1080x1080)
  // ==========================================
  const generateCard2CoinsPair = () => {
    const bg = bgColors[bgStyle];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${bg}"/>

  <defs>
    <radialGradient id="cSilvGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#f1f5f9"/>
      <stop offset="55%" stop-color="#cbd5e1"/>
      <stop offset="85%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#334155"/>
    </radialGradient>
    <linearGradient id="cSilvRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>

  <!-- Left Coin (Avers: "1 ZŁOTY / FRANKEN") -->
  <g transform="translate(300, 540)">
    <!-- Soft Shadow -->
    <circle cx="0" cy="18" r="230" fill="#000000" opacity="0.08"/>
    <!-- Outer Rim -->
    <circle cx="0" cy="0" r="230" fill="none" stroke="url(#cSilvRim)" stroke-width="16"/>
    <circle cx="0" cy="0" r="212" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,4"/>
    <!-- Main Silver Coin Body -->
    <circle cx="0" cy="0" r="200" fill="url(#cSilvGrad)"/>
    <circle cx="0" cy="0" r="184" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>

    <!-- Wreath Leaves Frame -->
    <g stroke="#1e293b" fill="none" stroke-width="3" opacity="0.8">
      <!-- Left Oak Branch -->
      <path d="M -130,40 C -160,-20 -140,-90 -90,-130 C -50,-160 -10,-170 0,-170"/>
      <path d="M -120,-30 C -100,-40 -90,-20 -110,0"/>
      <path d="M -135,-80 C -110,-85 -100,-65 -125,-50"/>
      <!-- Right Oak Branch -->
      <path d="M 130,40 C 160,-20 140,-90 90,-130 C 50,-160 10,-170 0,-170"/>
      <path d="M 120,-30 C 100,-40 90,-20 110,0"/>
      <path d="M 135,-80 C 110,-85 100,-65 125,-50"/>
    </g>

    <!-- Center Numeral "1" -->
    <text x="0" y="25" font-family="Georgia, serif" font-size="130" font-weight="bold" fill="#0f172a" text-anchor="middle">1</text>
    <text x="0" y="85" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#1e293b" text-anchor="middle" letter-spacing="6">ZŁOTY</text>
  </g>

  <!-- Right Coin (Revers: Eagle Coat of Arms & Year 2016) -->
  <g transform="translate(780, 540)">
    <!-- Soft Shadow -->
    <circle cx="0" cy="18" r="230" fill="#000000" opacity="0.08"/>
    <!-- Outer Rim -->
    <circle cx="0" cy="0" r="230" fill="none" stroke="url(#cSilvRim)" stroke-width="16"/>
    <circle cx="0" cy="0" r="212" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,4"/>
    <!-- Main Silver Coin Body -->
    <circle cx="0" cy="0" r="200" fill="url(#cSilvGrad)"/>
    <circle cx="0" cy="0" r="184" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>

    <!-- Circular Country Name Inscription -->
    <path id="coinArcCard" d="M -140,40 A 150,150 0 1,1 140,40" fill="none"/>
    <text font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#0f172a" letter-spacing="4">
      <textPath href="#coinArcCard" startOffset="50%" text-anchor="middle">RZECZPOSPOLITA POLSKA</textPath>
    </text>

    <!-- Center Crowned Eagle Relief -->
    <g transform="translate(0, -10)" fill="#0f172a" opacity="0.85">
      <!-- Crown -->
      <path d="M -20,-85 L -28,-100 L -10,-92 L 0,-105 L 10,-92 L 28,-100 L 20,-85 Z"/>
      <!-- Eagle Head -->
      <path d="M -12,-80 C -15,-65 15,-65 12,-80 C 18,-78 26,-72 24,-66 L 12,-65 Z"/>
      <!-- Wings Spread -->
      <path d="M 0,-50 C -40,-80 -90,-60 -105,-10 C -80,0 -40,-10 -15,-30 Z"/>
      <path d="M 0,-50 C 40,-80 90,-60 105,-10 C 80,0 40,-10 15,-30 Z"/>
      <!-- Feathers & Tail -->
      <path d="M -60,-10 C -80,30 -40,60 -20,70 L 0,30 L 20,70 C 40,60 80,30 60,-10 Z"/>
      <path d="M -15,40 L 0,85 L 15,40 Z"/>
    </g>

    <!-- Mint Year -->
    <text x="0" y="145" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="#0f172a" text-anchor="middle" letter-spacing="5">• 2016 •</text>
  </g>
</svg>`;
  };

  // ==========================================
  // CARD 3: Überlappende Vintage Banknoten (1080x1080)
  // ==========================================
  const generateCard3OverlappingBanknotes = () => {
    const bg = bgColors[bgStyle];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${bg}"/>

  <!-- Back Banknote (Top Right, Burgundy/Rose) -->
  <g transform="translate(240, 200)">
    <!-- Shadow -->
    <rect x="16" y="20" width="620" height="360" rx="10" fill="#000000" opacity="0.1"/>
    <!-- Note Base -->
    <rect width="620" height="360" rx="8" fill="#fcf4f4" stroke="#881337" stroke-width="4"/>
    <rect x="10" y="10" width="600" height="340" rx="6" fill="none" stroke="#be123c" stroke-width="1.5" stroke-dasharray="6,4"/>

    <!-- Corner Numerals -->
    <text x="35" y="55" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#881337">100</text>
    <text x="585" y="55" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#881337" text-anchor="end">100</text>
    <text x="35" y="325" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#881337">100</text>
    <text x="585" y="325" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#881337" text-anchor="end">100</text>

    <!-- Intricate Center Guilloche Frame -->
    <rect x="140" y="70" width="340" height="220" fill="#ffe4e6" stroke="#9f1239" stroke-width="2" rx="6"/>
    <rect x="150" y="80" width="320" height="200" fill="none" stroke="#f43f5e" stroke-width="1" stroke-dasharray="4,3"/>
    
    <text x="310" y="160" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#881337" text-anchor="middle" letter-spacing="4">COLLECTOR</text>
    <text x="310" y="210" font-family="Georgia, serif" font-size="54" font-weight="bold" fill="#9f1239" text-anchor="middle">100</text>
  </g>

  <!-- Front Banknote (Bottom Left, Overlapping) -->
  <g transform="translate(180, 420)">
    <!-- Drop Shadow -->
    <rect x="20" y="24" width="660" height="380" rx="12" fill="#000000" opacity="0.18"/>
    <!-- Note Base -->
    <rect width="660" height="380" rx="10" fill="#fff5f5" stroke="#7f1d1d" stroke-width="4"/>
    <rect x="12" y="12" width="636" height="356" rx="8" fill="none" stroke="#991b1b" stroke-width="2" stroke-dasharray="8,4"/>

    <!-- Corner Numerals -->
    <text x="40" y="60" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#7f1d1d">100</text>
    <text x="620" y="60" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#7f1d1d" text-anchor="end">100</text>
    <text x="40" y="340" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#7f1d1d">100</text>
    <text x="620" y="340" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#7f1d1d" text-anchor="end">100</text>

    <!-- Oval Queen / Classical Portrait Frame Right -->
    <g transform="translate(420, 60)">
      <ellipse cx="100" cy="130" rx="85" ry="110" fill="#fef2f2" stroke="#991b1b" stroke-width="3"/>
      <ellipse cx="100" cy="130" rx="77" ry="102" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,3"/>
      
      <!-- Engraved Female Portrait Contour -->
      <g stroke="#7f1d1d" stroke-width="1.8" fill="none">
        <path d="M 70,80 C 85,55 125,55 135,80 C 145,95 140,115 135,130 C 125,160 75,160 70,130 Z" fill="#fca5a5" opacity="0.2"/>
        <path d="M 85,100 Q 95,95 105,100 M 115,100 Q 125,95 135,100"/>
        <path d="M 110,100 L 108,120 L 115,122"/>
        <path d="M 98,135 Q 110,142 122,135"/>
        <path d="M 50,210 L 85,155 L 100,180 L 115,155 L 150,210" stroke-width="2"/>
      </g>
    </g>

    <!-- Diagonal SPECIMEN Watermark Band -->
    <g transform="translate(200, 220)">
      <text x="0" y="0" font-family="monospace" font-size="42" font-weight="bold" fill="#b91c1c" opacity="0.35" transform="rotate(-25)" letter-spacing="6">SPECIMEN</text>
    </g>

    <!-- Microtext Header & Labels -->
    <text x="220" y="110" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#7f1d1d" letter-spacing="3">FANTASIA RESERV</text>
    <text x="220" y="140" font-family="monospace" font-size="12" fill="#991b1b">A01234567</text>

    <!-- Bottom Security Bar -->
    <rect x="80" y="310" width="280" height="22" fill="#fee2e2" stroke="#b91c1c" stroke-width="1" rx="3"/>
    <text x="220" y="325" font-family="monospace" font-size="10" font-weight="bold" fill="#7f1d1d" text-anchor="middle" letter-spacing="2">NOT LEGAL TENDER</text>
  </g>
</svg>`;
  };

  // Construct full SVG string for 1920x1080 Desktop Hero
  const generateFullHeroSvg = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="${bgColors[bgStyle]}"/>
  
  <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
    <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
  </radialGradient>
  <rect width="1920" height="1080" fill="url(#vignette)"/>

  <!-- Top Logo / Header Branding -->
  <g transform="translate(960, 100)">
    <circle cx="0" cy="0" r="28" fill="none" stroke="${currentTheme.brand}" stroke-width="2"/>
    <text x="0" y="6" font-family="Georgia, serif" font-size="20" font-weight="bold" text-anchor="middle" fill="${currentTheme.brand}">N</text>
    <text x="0" y="52" font-family="Georgia, serif" font-size="22" font-weight="bold" text-anchor="middle" letter-spacing="6" fill="${currentTheme.primary}">${brandText}</text>
  </g>

  <!-- Left Content Column -->
  <g transform="translate(180, 320)">
    <text font-family="Georgia, serif" font-size="64" font-weight="bold" fill="${currentTheme.primary}" letter-spacing="2">
      <tspan x="0" dy="0">${headline.split(',')[0] || headline}</tspan>
      ${headline.includes(',') ? `<tspan x="0" dy="80">${headline.split(',')[1]}</tspan>` : ''}
    </text>

    <text font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="${currentTheme.secondary}" x="0" y="240">
      <tspan x="0" dy="0">${subtitle.slice(0, 65)}</tspan>
      <tspan x="0" dy="36">${subtitle.slice(65, 130)}</tspan>
      <tspan x="0" dy="36">${subtitle.slice(130)}</tspan>
    </text>

    <g transform="translate(0, 380)">
      <rect width="280" height="64" rx="4" fill="${currentTheme.btnBg}"/>
      <text x="140" y="40" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" letter-spacing="3" fill="${currentTheme.btnText}">${buttonText}</text>
    </g>
  </g>

  <!-- Right Column: Coin Graphic -->
  <g transform="translate(1180, 240) scale(1.15)">
    ${generateCard2CoinsPair()}
  </g>
</svg>`;
  };

  // Helper to trigger browser download
  const triggerDownload = (content: string, filename: string, isSvg = true) => {
    if (isSvg) {
      const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // PNG conversion
      setDownloading(true);
      const img = new Image();
      const svgBlob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = bgColors[bgStyle];
          ctx.fillRect(0, 0, 1080, 1080);
          ctx.drawImage(img, 0, 0, 1080, 1080);
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
            setDownloading(false);
          }, 'image/png', 1.0);
        } else {
          setDownloading(false);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const downloadCard1 = (asPng = true) => {
    triggerDownload(generateCard1VerticalBanknotes(), `inumis-showcard-1-banknotes.${asPng ? 'png' : 'svg'}`, !asPng);
  };

  const downloadCard2 = (asPng = true) => {
    triggerDownload(generateCard2CoinsPair(), `inumis-showcard-2-coins.${asPng ? 'png' : 'svg'}`, !asPng);
  };

  const downloadCard3 = (asPng = true) => {
    triggerDownload(generateCard3OverlappingBanknotes(), `inumis-showcard-3-vintage.${asPng ? 'png' : 'svg'}`, !asPng);
  };

  const downloadAll3Cards = () => {
    downloadCard1(true);
    setTimeout(() => downloadCard2(true), 400);
    setTimeout(() => downloadCard3(true), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1c1613] border border-amber-900/50 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-[#15100e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-lg">
              <ImageIcon className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100 font-serif">Webseiten-Grafiken & Showcards Generator</h2>
              <p className="text-xs text-stone-400">Erstellen & Herunterladen hochauflösender Grafiken für Ihre Numismatik-Homepage</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Tab Switcher */}
        <div className="flex border-b border-amber-900/30 bg-[#181210] px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'cards'
                ? 'bg-[#1c1613] text-amber-300 border-amber-900/50 border-b-transparent shadow-md'
                : 'bg-stone-900/40 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            3er-Set Produkt-Karten (1:1 Quadratisch - 1080x1080)
          </button>

          <button
            onClick={() => setActiveTab('hero')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x ${
              activeTab === 'hero'
                ? 'bg-[#1c1613] text-amber-300 border-amber-900/50 border-b-transparent shadow-md'
                : 'bg-stone-900/40 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Desktop Hero Banner (16:9 Landscape - 1920x1080)
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'cards' ? (
            /* TAB 2: 3 SQUARE SHOWCARDS SET */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    3 Quadratische Homepage Feature-Karten (Exakt wie Ihre Vorlage)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">3 aufeinander abgestimmte Numismatik-Motive auf cremigem Pergament-Hintergrund (1080 × 1080 px)</p>
                </div>

                <button
                  onClick={downloadAll3Cards}
                  disabled={downloading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/50 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Alle 3 Karten Herunterladen (PNG)
                </button>
              </div>

              {/* Grid with 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-[#16110f] border border-amber-900/30 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">1. Vertikale Banknoten</span>
                    <span className="text-[10px] text-stone-400 font-mono">1080×1080</span>
                  </div>

                  <div 
                    className="w-full aspect-square rounded-xl overflow-hidden border border-amber-900/20 shadow-inner flex items-center justify-center p-2"
                    style={{ backgroundColor: bgColors[bgStyle] }}
                    dangerouslySetInnerHTML={{ __html: generateCard1VerticalBanknotes() }}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => downloadCard1(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      PNG
                    </button>
                    <button
                      onClick={() => downloadCard1(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      SVG
                    </button>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-[#16110f] border border-amber-900/30 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">2. Münzpaar (Avers & Revers)</span>
                    <span className="text-[10px] text-stone-400 font-mono">1080×1080</span>
                  </div>

                  <div 
                    className="w-full aspect-square rounded-xl overflow-hidden border border-amber-900/20 shadow-inner flex items-center justify-center p-2"
                    style={{ backgroundColor: bgColors[bgStyle] }}
                    dangerouslySetInnerHTML={{ __html: generateCard2CoinsPair() }}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => downloadCard2(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      PNG
                    </button>
                    <button
                      onClick={() => downloadCard2(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      SVG
                    </button>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-[#16110f] border border-amber-900/30 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">3. Überlappende Geldscheine</span>
                    <span className="text-[10px] text-stone-400 font-mono">1080×1080</span>
                  </div>

                  <div 
                    className="w-full aspect-square rounded-xl overflow-hidden border border-amber-900/20 shadow-inner flex items-center justify-center p-2"
                    style={{ backgroundColor: bgColors[bgStyle] }}
                    dangerouslySetInnerHTML={{ __html: generateCard3OverlappingBanknotes() }}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => downloadCard3(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      PNG
                    </button>
                    <button
                      onClick={() => downloadCard3(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      SVG
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: DESKTOP HERO BANNER (16:9) */
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Desktop Hero Banner Vorschau (16:9)
                  </label>
                  <span className="text-[11px] text-stone-400">1920 × 1080 px</span>
                </div>

                <div 
                  className="w-full aspect-[16/9] rounded-xl border border-amber-900/40 shadow-2xl overflow-hidden flex items-center justify-center relative transition-colors duration-300"
                  style={{ backgroundColor: bgColors[bgStyle] }}
                  dangerouslySetInnerHTML={{ __html: generateFullHeroSvg() }}
                />
              </div>

              {/* Text Customizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#16110f] p-5 rounded-xl border border-amber-900/30">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">Texte Anpassen</h3>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Markenname:</label>
                    <input
                      type="text"
                      value={brandText}
                      onChange={(e) => setBrandText(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Hauptüberschrift (Headline):</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">Details</h3>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Unterüberschrift:</label>
                    <textarea
                      rows={2}
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Button Text:</label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#15100e] border-t border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-400">
            Formate: PNG (High Quality Image) & SVG (Skalierbarer Vektor)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
