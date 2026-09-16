// High-fidelity SVG packaging graphics with crisp typography and realistic product layouts

export const sampleBiscuitPackageSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="100%" stop-color="#fef3c7"/>
    </linearGradient>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background Packaging Pouch/Box -->
  <rect x="50" y="30" width="700" height="540" rx="16" fill="url(#bgGrad)" stroke="#d97706" stroke-width="3" filter="url(#shadow)"/>

  <!-- Top Brand Banner -->
  <path d="M50 46 C50 37.16 57.16 30 66 30 L734 30 C742.84 30 750 37.16 750 46 L750 110 L50 110 Z" fill="url(#bannerGrad)"/>
  
  <text x="80" y="72" font-family="sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="1">
    NUTRIBAKE™ FOODS
  </text>
  <text x="80" y="96" font-family="sans-serif" font-size="14" font-weight="600" fill="#fde68a">
    PREMIUM BAKERY &amp; CONFECTIONERY SELECTION
  </text>
  <rect x="650" y="55" width="60" height="32" rx="4" fill="#15803d"/>
  <circle cx="680" cy="71" r="7" fill="#ffffff"/>
  <circle cx="680" cy="71" r="5" fill="#15803d"/>

  <!-- Main Product Name (Principal Display Panel) -->
  <g id="box-product-name">
    <rect x="80" y="130" width="460" height="75" rx="8" fill="#ffffff" fill-opacity="0.8" stroke="#f59e0b" stroke-width="1.5"/>
    <text x="100" y="165" font-family="sans-serif" font-size="24" font-weight="800" fill="#78350f">
      BUTTER DELITE BISCUITS
    </text>
    <text x="100" y="190" font-family="sans-serif" font-size="13" font-weight="600" fill="#92400e">
      COMMODITY: CRISPY BUTTER COOKIES (SWEETENED)
    </text>
  </g>

  <!-- Illustration Graphic Area -->
  <rect x="570" y="130" width="160" height="150" rx="12" fill="#fed7aa" stroke="#fb923c" stroke-width="2"/>
  <circle cx="650" cy="205" r="45" fill="#f59e0b" opacity="0.4"/>
  <circle cx="640" cy="195" r="35" fill="#d97706" opacity="0.8"/>
  <circle cx="630" cy="185" r="4" fill="#78350f"/>
  <circle cx="655" cy="205" r="4" fill="#78350f"/>
  <circle cx="645" cy="175" r="3" fill="#78350f"/>
  <text x="610" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#78350f">100% REAL BUTTER</text>

  <!-- Manufacturer & Packer Section -->
  <g id="box-manufacturer">
    <rect x="80" y="225" width="460" height="90" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="96" y="248" font-family="sans-serif" font-size="11" font-weight="700" fill="#475569">
      MANUFACTURED &amp; PACKED BY:
    </text>
    <text x="96" y="270" font-family="sans-serif" font-size="14" font-weight="700" fill="#0f172a">
      NutriBake Foods Pvt. Ltd.
    </text>
    <text x="96" y="290" font-family="sans-serif" font-size="12" fill="#334155">
      Plot 42, Industrial Area, Okhla Phase-III, New Delhi - 110020, India
    </text>
    <text x="96" y="306" font-family="sans-serif" font-size="11" fill="#64748b">
      FSSAI Lic. No. 10014011002450 | Country of Origin: India
    </text>
  </g>

  <!-- Net Quantity Declaration -->
  <g id="box-net-quantity">
    <rect x="80" y="335" width="300" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="96" y="357" font-family="sans-serif" font-size="11" font-weight="700" fill="#475569">
      NET QUANTITY / NET WEIGHT:
    </text>
    <text x="96" y="382" font-family="sans-serif" font-size="20" font-weight="800" fill="#0f172a">
      100 g
    </text>
  </g>

  <!-- Maximum Retail Price (MRP) & Unit Sale Price Declaration -->
  <g id="box-mrp">
    <rect x="400" y="335" width="330" height="95" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="416" y="357" font-family="sans-serif" font-size="11" font-weight="700" fill="#475569">
      MAXIMUM RETAIL PRICE (MRP):
    </text>
    <text x="416" y="385" font-family="sans-serif" font-size="22" font-weight="900" fill="#0f172a">
      ₹ 50.00
    </text>
    <text x="525" y="382" font-family="sans-serif" font-size="12" font-weight="600" fill="#64748b">
      (INCL. OF ALL TAXES)
    </text>
    <text x="416" y="415" font-family="sans-serif" font-size="13" font-weight="700" fill="#0369a1">
      Unit Sale Price: ₹ 0.50 / g
    </text>
  </g>

  <!-- Date of Packaging & Batch -->
  <rect x="80" y="415" width="300" height="50" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="96" y="435" font-family="sans-serif" font-size="11" fill="#64748b">BATCH NO: <tspan font-weight="700" fill="#0f172a">NB-2026-B8</tspan></text>
  <text x="96" y="452" font-family="sans-serif" font-size="11" fill="#64748b">PKD: <tspan font-weight="700" fill="#0f172a">01/09/2026</tspan> | BEST BEFORE 6 MONTHS</text>

  <!-- Empty / Missing Consumer Care Zone on Panel -->
  <g id="box-consumer-care-missing">
    <rect x="80" y="480" width="650" height="65" rx="8" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="100" y="508" font-family="sans-serif" font-size="13" font-weight="700" fill="#e11d48">
      [ALERT: CONSUMER CARE CONTACT PANEL OMITTED OR OBSCURED]
    </text>
    <text x="100" y="528" font-family="sans-serif" font-size="11" fill="#9f1239">
      Mandatory telephone / email / grievance officer contact under Rule 6(1)(n) not detected in declaration zone.
    </text>
  </g>
</svg>
`)}`;

export const sampleHoneyPackageSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#f8fafc"/>
  <rect x="60" y="40" width="680" height="520" rx="16" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
  
  <rect x="60" y="40" width="680" height="80" rx="16" fill="#0369a1"/>
  <text x="100" y="90" font-family="sans-serif" font-size="26" font-weight="800" fill="#ffffff">PUREHARVEST™ ORGANIC HONEY</text>
  
  <!-- Commodity Name -->
  <rect x="100" y="145" width="400" height="50" rx="6" fill="#f0f9ff" stroke="#bae6fd"/>
  <text x="120" y="175" font-family="sans-serif" font-size="18" font-weight="700" fill="#0369a1">COMMODITY: 100% NATURAL RAW HONEY</text>
  
  <!-- Manufacturer -->
  <rect x="100" y="215" width="400" height="70" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="120" y="240" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">Mfd by: PureHarvest Organics Ltd, G.T. Road, Karnal, Haryana</text>
  <text x="120" y="262" font-family="sans-serif" font-size="11" fill="#64748b">FSSAI Lic. 10816002000188 | Country of Origin: India</text>

  <!-- Net Qty -->
  <rect x="100" y="305" width="220" height="55" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="120" y="338" font-family="sans-serif" font-size="20" font-weight="800" fill="#0f172a">Net Qty: 500 g</text>

  <!-- MRP -->
  <rect x="340" y="305" width="360" height="55" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="360" y="338" font-family="sans-serif" font-size="20" font-weight="800" fill="#0f172a">MRP: ₹ 340.00 <tspan font-size="12" fill="#64748b">(₹0.68/g)</tspan></text>

  <!-- Consumer Care -->
  <rect x="100" y="380" width="600" height="70" rx="6" fill="#ecfdf5" stroke="#10b981"/>
  <text x="120" y="405" font-family="sans-serif" font-size="12" font-weight="700" fill="#065f46">CONSUMER CARE CELL:</text>
  <text x="120" y="425" font-family="sans-serif" font-size="12" fill="#047857">Manager - Grievance Redressal, PureHarvest Organics Ltd, Toll Free: 1800-419-8900 | care@pureharvest.in</text>
</svg>
`)}`;
