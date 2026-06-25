/* ============================================================
   SIGAP RATU - WebGIS Platform JavaScript
   ============================================================
   Struktur:
   - Landing Page Logic
   - Preview Map
   - GIS Page Management
   - GIS Map Initialization
   - Layer Management
   - Basemap Switching
   - User Interaction
   - Utility Functions
   - GPX Export
   ============================================================ */

/* ==================== LANDING PAGE LOGIC ==================== */

// Navbar scroll effect
const navbar = document.getElementById("navbar");
if (navbar) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// Reveal on scroll animation
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1 },
);

reveals.forEach((r) => observer.observe(r));

/* ==================== PREVIEW MAP (Landing Page) ==================== */

let previewMap;

/**
 * Initialize preview map on landing page
 * Displays a non-interactive map preview with risk zones
 */
function initPreviewMap() {
  previewMap = L.map("preview-map", {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    attributionControl: false,
  });

  // Add base layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
    previewMap,
  );

  const center = [-7.0218, 106.54466];
  previewMap.setView(center, 14);

  // Risk zones visualization
  L.circle(center, {
    radius: 400,
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.35,
    weight: 2,
  }).addTo(previewMap);

  L.circle(center, {
    radius: 700,
    color: "#fbbf24",
    fillColor: "#fbbf24",
    fillOpacity: 0.2,
    weight: 1.5,
    dashArray: "6 4",
  }).addTo(previewMap);

  L.circle(center, {
    radius: 1000,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 0.08,
    weight: 1.5,
    dashArray: "6 4",
  }).addTo(previewMap);

  // PLTU marker
  const pltuIcon = L.divIcon({
    className: "",
    html: `<div style="background:linear-gradient(135deg,#059669,#064e3b);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:white;font-size:13px;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 15px rgba(5,150,105,0.5);">⚡</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  L.marker(center, { icon: pltuIcon })
    .bindPopup(
      `<div class="popup-title">⚡ PLTU Pelabuhan Ratu</div><div class="popup-body">Pembangkit Listrik Tenaga Uap<br>Kapasitas: 3 × 350 MW</div><span class="popup-badge">Zona Risiko Tinggi</span>`,
    )
    .addTo(previewMap);
}

// Initialize preview map when "Why" section becomes visible
const whyObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !previewMap) {
        initPreviewMap();
      }
    });
  },
  { threshold: 0.2 },
);

const whySection = document.getElementById("mengapa");
if (whySection) whyObs.observe(whySection);

/* ==================== GIS PAGE MANAGEMENT ==================== */

/**
 * Open GIS page with loading animation
 */
function openGIS() {
  document.getElementById("landing").style.display = "none";
  document.getElementById("gis-page").style.display = "block";

  // Show loading screen
  setTimeout(() => {
    document.getElementById("gis-loading").style.opacity = "1";
  }, 50);

  // Hide loading and init map
  setTimeout(() => {
    document.getElementById("gis-loading").style.transition = "opacity 0.8s";
    document.getElementById("gis-loading").style.opacity = "0";
    setTimeout(() => {
      document.getElementById("gis-loading").style.display = "none";
      if (!gisMap) initGISMap();
    }, 800);
  }, 2500);
}

/**
 * Close GIS page and return to landing
 */
function closeGIS() {
  document.getElementById("gis-page").style.display = "none";
  document.getElementById("landing").style.display = "block";
  document.getElementById("gis-loading").style.display = "flex";
  document.getElementById("gis-loading").style.opacity = "1";
}

/* ==================== GIS MAP INITIALIZATION ==================== */

let gisMap, riskLayer, evacLayer, assemblyLayer, facilitiesLayer;
let baseLayers = {};
let currentBasemap = "osm";
let layerState = {
  risk: true,
  evac: true,
  assembly: true,
  facilities: true,
};

/**
 * Initialize the main GIS map with all layers and features
 */
function initGISMap() {
  const center = [-7.0218, 106.54466];

  // Create map instance
  gisMap = L.map("gis-map", {
    zoomControl: true,
    attributionControl: true,
  }).setView(center, 14);

  // ——— BASEMAPS ———
  baseLayers.osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    },
  );

  baseLayers.satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "© Esri",
      maxZoom: 19,
    },
  );

  baseLayers.topo = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenTopoMap",
      maxZoom: 17,
    },
  );

  baseLayers.osm.addTo(gisMap);

  // ——— RISK ZONES LAYER ———
  // Aturan Leaflet: layer yang di-addTo() TERAKHIR = posisi PALING ATAS = diklik duluan.
  // Urutan wajib: Buffer (bawah) → Kuning (tengah) → Merah (paling atas).
  riskLayer = L.layerGroup();

  // ① Zona Buffer — ditambah PERTAMA supaya posisinya PALING BAWAH
  L.circle(center, {
    radius: 1000,
    color: "#3b82f6",
    fillColor: "#3b82f6",
    fillOpacity: 0.08,
    weight: 1.5,
    dashArray: "4 6",
  })
    .bindPopup(
      `<div class="popup-title">🔵 Zona Buffer</div><div class="popup-body">Radius 1000–1700m dari pusat PLTU<br>Area pengawasan dan monitoring<br>Akses: Terbatas</div><span class="popup-badge safe">BUFFER</span>`,
    )
    .addTo(riskLayer);

  // ② Zona Kuning — ditambah KEDUA, posisi TENGAH
  L.circle(center, {
    radius: 700,
    color: "#f59e0b",
    fillColor: "#fbbf24",
    fillOpacity: 0.18,
    weight: 2,
    dashArray: "8 4",
  })
    .bindPopup(
      `<div class="popup-title">🟡 Zona Risiko Tinggi</div><div class="popup-body">Radius 500–1000m dari pusat PLTU<br>Risiko: Paparan Bahan Berbahaya<br>Akses: Dengan APD Lengkap</div><span class="popup-badge med">TINGGI</span>`,
    )
    .addTo(riskLayer);

  // ③ Zona Merah — ditambah TERAKHIR supaya posisinya PALING ATAS
  L.circle(center, {
    radius: 400,
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.3,
    weight: 2.5,
  })
    .bindPopup(
      `<div class="popup-title">🔴 Zona Risiko Sangat Tinggi</div><div class="popup-body">Radius 500m dari pusat PLTU<br>Risiko: Kebakaran, Ledakan, Gas Berbahaya<br>Akses: Personel Terotorisasi</div><span class="popup-badge">SANGAT TINGGI</span>`,
    )
    .addTo(riskLayer);

  riskLayer.addTo(gisMap);

  // ——— EVACUATION ROUTES LAYER ———
  evacLayer = L.layerGroup();

  const evacRoutes = [
    {
      coords: [
        [-6.995, 106.56],
        [-6.99, 106.555],
        [-6.985, 106.548],
        [-6.98, 106.54],
      ],
      name: "Jalur Evakuasi Utara",
      dir: "Menuju Jl. Pelabuhan Ratu",
    },
    {
      coords: [
        [-7.0215757, 106.544147],
        [-7.021535, 106.5442114],
        [-7.0213374, 106.5441294],
        [-7.0211805, 106.5440416],
        [-7.0209247, 106.5439127],
        [-7.0203841, 106.5448088],
        [-7.0202156, 106.5451133],
        [-7.0202098, 106.5451133],
      ],
      name: "Jalur Evakuasi Tsunami",
      dir: "Menuju Area Evakuasi Terbuka",
    },
    {
      coords: [
        [-7.0225259, 106.5421955],
        [-7.0221909, 106.5428916],
        [-7.0218769, 106.5435296],
        [-7.021699, 106.5439304],
        [-7.0216257, 106.5441308],
        [-7.021924, 106.5442837],
      ],
      name: "Jalur Evakuasi Safety Center",
      dir: "Menuju Area Safety Center",
    },
    {
      coords: [
        [-7.0263338, 106.5460987],
        [-7.0256723, 106.5458003],
        [-7.0249318, 106.5454621],
        [-7.0240532, 106.5450741],
        [-7.0238162, 106.5449746],
        [-7.0236089, 106.5450244],
        [-7.0234805, 106.5452333],
        [-7.0233621, 106.5455217],
      ],
      name: "Jalur Evakuasi Area Terbuka",
      dir: "Menuju Area Terbuka Ring 1",
    },
    {
      coords: [
        [-7.0233001, 106.5426008],
        [-7.022999, 106.5432077],
        [-7.0227193, 106.5437351],
        [-7.0225472, 106.5441107],
        [-7.0223967, 106.5444647],
        [-7.0222533, 106.5443853],
      ],
      name: "Jalur Evakuasi Area Safety Center 2",
      dir: "Menuju Area Evakuasi Safety Center 2",
    },
  ];

  evacRoutes.forEach((r, i) => {
    L.polyline(r.coords, {
      color: i % 2 === 0 ? "#3b82f6" : "#60a5fa",
      weight: 4,
      opacity: 0.85,
      dashArray: i % 2 === 0 ? null : "10 5",
    })
      .bindPopup(
        `<div class="popup-title">🔷 ${r.name}</div><div class="popup-body">${r.dir}<br>Panjang: ${(1.2 + i * 0.4).toFixed(1)} km<br>Status: Aktif & Terverifikasi</div><span class="popup-badge safe">AMAN</span>`,
      )
      .addTo(evacLayer);

    // Arrow decorations on routes
    const mid = Math.floor(r.coords.length / 2);
    const arrowIcon = L.divIcon({
      className: "",
      html: `<div style="background:#3b82f6;color:white;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:9px;border:2px solid rgba(255,255,255,0.5);">▶</div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker(r.coords[mid], { icon: arrowIcon }).addTo(evacLayer);
  });

  evacLayer.addTo(gisMap);

  // ——— ASSEMBLY POINTS LAYER ———
  assemblyLayer = L.layerGroup();

  const assemblyPts = [
    {
      lat: -7.0219,
      lng: 106.5442,
      name: "Titik Kumpul A",
      cap: "500 orang",
      desc: "Area Safety Center",
    },
    {
      lat: -7.02339,
      lng: 106.5458,
      name: "Titik Kumpul B",
      cap: "800 orang",
      desc: "Area Terbuka Ring 1",
    },
    {
      lat: -7.0202,
      lng: 106.5451,
      name: "Titik Kumpul C",
      cap: "600 orang",
      desc: "Area Titik Evakuasi Tsunami",
    },
  ];

  assemblyPts.forEach((p) => {
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:linear-gradient(135deg,#10b981,#059669);width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:white;font-size:14px;border:2.5px solid rgba(255,255,255,0.6);box-shadow:0 4px 15px rgba(16,185,129,0.5);">👥</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([p.lat, p.lng], { icon })
      .bindPopup(
        `<div class="popup-title">👥 ${p.name}</div><div class="popup-body">${p.desc}<br>Kapasitas: ${p.cap}<br>Fasilitas: P3K, Air Bersih, Komunikasi</div><span class="popup-badge safe">TITIK KUMPUL</span>`,
      )
      .addTo(assemblyLayer);
  });

  assemblyLayer.addTo(gisMap);

  // ——— FACILITIES LAYER ———
  facilitiesLayer = L.layerGroup();

  const facilities = [
    {
      lat: -7.0218,
      lng: 106.5446,
      name: "PLTU Pelabuhan Ratu",
      type: "Pembangkit",
      icon: "⚡",
      color: "#059669",
      risk: "SANGAT TINGGI",
    },
    {
      lat: -7.0221,
      lng: 106.5443,
      name: "Gedung Safety Center",
      type: "Safety Office",
      icon: "🏬",
      color: "#dc2626",
      risk: "AMAN",
    },
    {
      lat: -7.0211,
      lng: 106.54437,
      name: "Masjid Nurul Iman",
      type: "Mosque",
      icon: "🕌",
      color: "#0369a1",
      risk: "AMAN",
    },
    {
      lat: -7.0244,
      lng: 106.5457,
      name: "Ruang Kontrol Utama",
      type: "Kontrol",
      icon: "🖥️",
      color: "#7c3aed",
      risk: "SEDANG",
    },
    {
      lat: -7.02114,
      lng: 106.54494,
      name: "Klinik PLTU",
      type: "Medis",
      icon: "🏥",
      color: "#dc2626",
      risk: "AMAN",
    },
    {
      lat: -7.0212,
      lng: 106.5439,
      name: "Pos Keamanan",
      type: "Security",
      icon: "🛡️",
      color: "#059669",
      risk: "AMAN",
    },
  ];

  facilities.forEach((f) => {
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:${f.color};width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;border:2px solid rgba(255,255,255,0.4);box-shadow:0 4px 15px rgba(0,0,0,0.3);">${f.icon}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker([f.lat, f.lng], { icon })
      .bindPopup(
        `<div class="popup-title">${f.icon} ${f.name}</div><div class="popup-body">Tipe: ${f.type}<br>Koordinat: ${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}</div><span class="popup-badge ${f.risk === "AMAN" ? "safe" : f.risk === "SEDANG" ? "med" : ""}">${f.risk}</span>`,
      )
      .addTo(facilitiesLayer);
  });

  facilitiesLayer.addTo(gisMap);

  // ——— PLTU CENTER MARKER (Special) ———
  const pltuIcon = L.divIcon({
    className: "",
    html: `<div style="background:linear-gradient(135deg,#059669,#064e3b);width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:white;font-size:20px;border:3px solid rgba(255,255,255,0.5);box-shadow:0 0 30px rgba(5,150,105,0.6),0 6px 20px rgba(0,0,0,0.3);">⚡</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  L.marker(center, { icon: pltuIcon })
    .bindPopup(
      `<div class="popup-title">⚡ PLTU Pelabuhan Ratu</div><div class="popup-body">Pembangkit Listrik Tenaga Uap<br>Kapasitas: 3 × 350 MW = 1.050 MW<br>Bahan Bakar: Batubara<br>Status: Operasional</div><span class="popup-badge">PUSAT OPERASI</span>`,
    )
    .addTo(gisMap)
    .openPopup();

  // ——— MAP EVENTS ———

  // Update coordinates display on mouse move
  gisMap.on("mousemove", (e) => {
    document.getElementById("coord-text").textContent =
      `Lat: ${e.latlng.lat.toFixed(5)} | Lng: ${e.latlng.lng.toFixed(5)} | Zoom: ${gisMap.getZoom()}`;
  });

  // Search functionality
  const searchInput = document.getElementById("gis-search");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const q = e.target.value.toLowerCase();

        if (q.includes("pltu") || q.includes("pusat")) {
          gisMap.setView(center, 16);
        } else if (q.includes("kumpul") || q.includes("assembly")) {
          gisMap.setView([-7.0218, 106.54466], 15);
        } else if (q.includes("evakuasi")) {
          gisMap.setView([-7.0218, 106.54466], 14);
        }
      }
    });
  }
}

/* ==================== LAYER MANAGEMENT ==================== */

/**
 * Toggle map layers on/off
 * @param {string} name - Layer name (risk, evac, assembly, facilities)
 */
function toggleLayer(name) {
  layerState[name] = !layerState[name];
  const toggle = document.getElementById("toggle-" + name);
  toggle.classList.toggle("on", layerState[name]);

  const layerMap = {
    risk: riskLayer,
    evac: evacLayer,
    assembly: assemblyLayer,
    facilities: facilitiesLayer,
  };

  if (layerState[name]) {
    layerMap[name].addTo(gisMap);
  } else {
    gisMap.removeLayer(layerMap[name]);
  }
}

/* ==================== BASEMAP SWITCHING ==================== */

/**
 * Switch between different basemaps
 * @param {string} type - Basemap type (osm, satellite, topo)
 */
function setBasemap(type) {
  // Hapus semua basemap lama, tapi JANGAN sentuh overlay layer
  ["osm", "satellite", "topo"].forEach((t) => {
    if (gisMap.hasLayer(baseLayers[t])) {
      gisMap.removeLayer(baseLayers[t]);
    }
    const el = document.getElementById("bm-" + t);
    if (el) el.style.color = "rgba(255,255,255,0.75)";
  });

  // Tambah basemap baru
  // Overlay layer (zona, evakuasi, dll) tidak disentuh
  // sehingga urutan layer tetap terjaga
  baseLayers[type].addTo(gisMap);

  // Update label aktif di sidebar
  const el = document.getElementById("bm-" + type);
  if (el) el.style.color = "#6ee7b7";

  currentBasemap = type;
}

/* ==================== USER INTERACTION ==================== */

/**
 * Locate user and center map on their location
 */
function locateUser() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gisMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {
        gisMap.setView([-7.0218, 106.54466], 15);
      },
    );
  }
}

/**
 * Reset map view to default center and zoom
 */
function fitBounds() {
  if (gisMap) {
    gisMap.setView([-7.0218, 106.54466], 13);
  }
}

/* ============================================================
   SIGAP AI CHAT — JavaScript
   Tempelkan seluruh blok ini ke dalam tag <script>,
   TEPAT SEBELUM tag penutup </script> paling bawah di HTML kamu.
   
   Jika tidak ada <script> khusus, buat baru sebelum </body>:
   <script>
     // paste semua kode ini di sini
   </script>
   ============================================================ */

/* ══════════════════════════════════════════
   1. STATE & INISIALISASI
══════════════════════════════════════════ */
let acpIsOpen = false;

// Isi timestamp saat halaman dimuat
(function acpInit() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Set label tanggal di divider
  const dateDiv = document.getElementById("acpDateDiv");
  if (dateDiv) dateDiv.textContent = "Hari ini · " + dateStr;

  // Tambahkan pesan sambutan AI saat halaman siap
  setTimeout(function () {
    acpAppendAI(ACP_KB.sambutan, timeStr);
    // Tampilkan badge unread setelah sedikit delay
    setTimeout(function () {
      document.getElementById("fabBadge").classList.add("show");
    }, 800);
  }, 400);
})();

/* ══════════════════════════════════════════
   2. KNOWLEDGE BASE — RESPONS AI
   Tambah atau edit jawaban sesuai kebutuhan
══════════════════════════════════════════ */
const ACP_KB = {
  /* Pesan sambutan pertama kali */
  sambutan: {
    label: ["fas fa-circle", "SIGAP AI"],
    text: "Selamat datang. Sistem monitoring <strong>PLTU Pelabuhan Ratu</strong> aktif. Saya siap membantu analisis risiko, jalur evakuasi, dan monitoring operasional area.",
    data: [
      { k: "Sistem", v: "Operasional Penuh" },
      { k: "Zona dipantau", v: "5 zona aktif" },
      { k: "Cuaca", v: "28°C · Berawan · Angin 12 km/h" },
      { k: "Alert aktif", v: "2 peringatan", c: "danger" },
    ],
    chips: [],
  },

  /* Klinik */
  klinik: {
    label: ["fas fa-hospital-alt", "Facility Locate"],
    text: "Klinik PLTU terdeteksi <strong>340m</strong> arah barat dari pusat operasi. Marker disorot pada peta GIS.",
    data: [
      { k: "Fasilitas", v: "Klinik PLTU Pelabuhan Ratu" },
      { k: "Jarak", v: "340m · ±4 menit jalan kaki" },
      { k: "Arah", v: "Barat — Pos Keamanan Gate 2" },
      { k: "Kapasitas", v: "20 pasien rawat" },
      { k: "Layanan", v: "P3K, UGD Ringan, Ambulans" },
      { k: "Status", v: "Operasional 24/7" },
    ],
    chips: [
      { cls: "acb-green", ic: "fas fa-check", tx: "Marker aktif di peta" },
      { cls: "acb-blue", ic: "fas fa-phone", tx: "Ext. 1121" },
    ],
  },

  /* Risiko */
  risiko: {
    label: ["fas fa-shield-halved", "Risk Analysis"],
    alert: true,
    text: "Terdeteksi <strong>2 zona aktif</strong> dengan level peringatan tinggi di sekitar pusat PLTU. APD wajib digunakan di zona merah.",
    data: [
      { k: "Zona Merah", v: "⬤ SANGAT TINGGI — r ≤ 500m", c: "danger" },
      { k: "Zona Kuning", v: "⬤ TINGGI — r 500–1000m", c: "warn" },
      { k: "Zona Biru", v: "⬤ BUFFER — r 1000–1700m", c: "muted" },
      { k: "Akses merah", v: "Personel Terotorisasi + APD", c: "danger" },
      { k: "Update", v: "Hari ini · 08:31 WIB" },
    ],
    chips: [
      { cls: "acb-red", ic: "fas fa-fire", tx: "Kebakaran" },
      { cls: "acb-red", ic: "fas fa-bomb", tx: "Ledakan" },
      { cls: "acb-yellow", ic: "fas fa-skull-crossbones", tx: "B3 Berbahaya" },
    ],
  },

  /* Shelter */
  shelter: {
    label: ["fas fa-people-roof", "Shelter Finder"],
    text: "Ditemukan <strong>5 titik kumpul</strong> aktif dalam radius 2.8km. Titik Kumpul A adalah yang terdekat.",
    data: [
      { k: "TK-A · Safety Center", v: "1.2km · 500 orang" },
      { k: "TK-B · Area Terbuka Ring 2", v: "1.6km · 800 orang" },
      { k: "TK-C · Area Evakuasi Tsunami", v: "2.4km · <br> 600 orang" },
    ],
    chips: [
      { cls: "acb-green", ic: "fas fa-map", tx: "Semua marker aktif" },
      { cls: "acb-blue", ic: "fas fa-users", tx: "1.900 total kapasitas" },
    ],
  },

  /* Evakuasi */
  evakuasi: {
    label: ["fas fa-route", "Evacuation Routes"],
    text: "<strong>4 jalur evakuasi</strong> aktif dan terverifikasi. Semua rute bebas hambatan per monitoring 08:00 WIB.",
    data: [
      { k: "JE-001 Utara", v: "1.2km · Aman ✓" },
      { k: "JE-002 Selatan", v: "1.6km · Aman ✓" },
      { k: "JE-003 Timur", v: "2.0km · Aman ✓" },
      { k: "JE-004 Barat", v: "2.4km · Aman ✓" },
    ],
    chips: [
      { cls: "acb-blue", ic: "fas fa-download", tx: "GPX siap diunduh" },
      { cls: "acb-green", ic: "fas fa-check", tx: "Semua jalur aktif" },
    ],
  },

  /* POS */
  pos: {
    label: ["fas fa-map-pin", "POS Location"],
    text: "<strong>POS 1</strong> berada di Gate-1 pintu masuk utama PLTU. Saat ini 3 dari 4 personel hadir dan siaga.",
    data: [
      { k: "Nama", v: "POS Keamanan Gate-1" },
      { k: "Koordinat", v: "-6.9960°, 106.5558°" },
      { k: "Personel", v: "3 dari 4 hadir" },
      { k: "Shift", v: "Pagi · 06:00–14:00 WIB" },
      { k: "Status", v: "Aktif Siaga" },
    ],
    chips: [
      { cls: "acb-green", ic: "fas fa-shield-alt", tx: "Pos Aktif" },
      { cls: "acb-blue", ic: "fas fa-phone", tx: "Ext. 1001" },
    ],
  },

  /* Default (tidak cocok keyword manapun) */
  default: {
    label: ["fas fa-microchip", "SIGAP AI"],
    text: "Perintah diterima. Saya dapat membantu dengan <strong>analisis zona risiko</strong>, navigasi evakuasi, status fasilitas, cuaca real-time, dan monitoring operasional PLTU.",
    data: [
      { k: "Mode", v: "GIS Command Assistant" },
      { k: "Coverage", v: "PLTU Pelabuhan Ratu" },
      { k: "Respons", v: "< 1 detik" },
    ],
    chips: [
      {
        cls: "acb-blue",
        ic: "fas fa-circle-info",
        tx: "Coba suggestion chips di atas",
      },
    ],
  },
};

/* ── Pilih respons berdasarkan kata kunci */
function acpPickResponse(text) {
  var t = text.toLowerCase();
  if (t.includes("klinik") || t.includes("medis") || t.includes("dokter"))
    return ACP_KB.klinik;
  if (t.includes("risiko") || t.includes("bahaya") || t.includes("zona"))
    return ACP_KB.risiko;
  if (t.includes("shelter") || t.includes("kumpul") || t.includes("titik"))
    return ACP_KB.shelter;
  if (t.includes("evakuasi") || t.includes("jalur") || t.includes("rute"))
    return ACP_KB.evakuasi;
  if (t.includes("pos") || t.includes("security") || t.includes("keamanan"))
    return ACP_KB.pos;
  return ACP_KB.default;
}

/* ══════════════════════════════════════════
   3. KONTROL PANEL (buka / tutup / reset)
══════════════════════════════════════════ */
function acpToggle() {
  var panel = document.getElementById("aiChatPanel");
  var fab = document.getElementById("aiFab");

  acpIsOpen = !acpIsOpen;
  panel.classList.toggle("panel-open", acpIsOpen);
  fab.classList.toggle("is-open", acpIsOpen);

  if (acpIsOpen) {
    // Sembunyikan badge unread
    document.getElementById("fabBadge").classList.remove("show");
    // Scroll ke bawah & fokus input
    setTimeout(function () {
      var msgs = document.getElementById("acpMessages");
      msgs.scrollTop = msgs.scrollHeight;
      document.getElementById("acpInput").focus();
    }, 150);
  }
}

function acpClear() {
  /* Hapus semua pesan kecuali divider tanggal dan sambutan */
  var msgs = document.getElementById("acpMessages");
  var items = Array.from(msgs.children);
  // Simpan 2 elemen pertama: divider + pesan sambutan
  items.slice(2).forEach(function (el) {
    el.remove();
  });
}

/* ══════════════════════════════════════════
   4. MENGIRIM PESAN
══════════════════════════════════════════ */
function acpSend() {
  var input = document.getElementById("acpInput");
  var text = input.value.trim();
  if (!text) return;

  // Tambah bubble user
  acpAppendUser(text);

  // Bersihkan input
  input.value = "";
  input.style.height = "auto";
  document.getElementById("acpCounter").textContent = "0 / 400";
  document.getElementById("acpCounter").style.color = "rgba(255,255,255,0.2)";

  // Tampilkan typing, lalu respons AI
  acpShowTyping();
  var delay = 850 + Math.random() * 550;
  setTimeout(function () {
    acpHideTyping();
    acpAppendAI(acpPickResponse(text));
  }, delay);
}

function acpSendQuick(text) {
  if (!acpIsOpen) acpToggle();
  document.getElementById("acpInput").value = text;
  setTimeout(acpSend, 60);
}

/* ══════════════════════════════════════════
   5. RENDER BUBBLE
══════════════════════════════════════════ */

/* Ambil waktu sekarang */
function acpNow() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Escape karakter HTML */
function acpEsc(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Scroll ke bawah area pesan */
function acpScrollBottom() {
  requestAnimationFrame(function () {
    var msgs = document.getElementById("acpMessages");
    msgs.scrollTop = msgs.scrollHeight;
  });
}

/* Bubble pesan USER */
function acpAppendUser(text) {
  var msgs = document.getElementById("acpMessages");
  var row = document.createElement("div");
  row.className = "acp-row user-row";
  row.innerHTML =
    '<div class="acp-msg-wrap">' +
    '<div class="acp-bubble user-bubble">' +
    acpEsc(text) +
    "</div>" +
    '<div class="acp-time">' +
    acpNow() +
    "</div>" +
    "</div>";
  msgs.appendChild(row);
  acpScrollBottom();
}

/* Typing indicator */
function acpShowTyping() {
  var msgs = document.getElementById("acpMessages");
  var row = document.createElement("div");
  row.className = "acp-typing-row";
  row.id = "acpTypingRow";
  row.innerHTML =
    '<div class="acp-row-avatar"><i class="fas fa-microchip"></i></div>' +
    '<div class="acp-typing-bubble">' +
    '<span class="acp-typing-text">SIGAP AI sedang menganalisis\u2026</span>' +
    '<div class="acp-dots"><span></span><span></span><span></span></div>' +
    "</div>";
  msgs.appendChild(row);
  acpScrollBottom();
}
function acpHideTyping() {
  var el = document.getElementById("acpTypingRow");
  if (el) el.remove();
}

/* Bubble AI — data tabel + chips */
function acpAppendAI(res, overrideTime) {
  var msgs = document.getElementById("acpMessages");
  var time = overrideTime || acpNow();

  /* Bangun HTML tabel data */
  var dataHtml = "";
  if (res.data && res.data.length) {
    dataHtml = '<div class="acp-data-table">';
    res.data.forEach(function (r) {
      var cClass = r.c ? " " + r.c : "";
      dataHtml +=
        '<div class="acp-data-row">' +
        '<span class="acp-dk">' +
        r.k +
        "</span>" +
        '<span class="acp-dv' +
        cClass +
        '">' +
        r.v +
        "</span>" +
        "</div>";
    });
    dataHtml += "</div>";
  }

  /* Bangun HTML chips */
  var chipsHtml = "";
  if (res.chips && res.chips.length) {
    chipsHtml = '<div class="acp-chips-row">';
    res.chips.forEach(function (c) {
      chipsHtml +=
        '<span class="acp-chip-badge ' +
        c.cls +
        '">' +
        '<i class="' +
        c.ic +
        '"></i> ' +
        c.tx +
        "</span>";
    });
    chipsHtml += "</div>";
  }

  var alertClass = res.alert ? " alert-bubble" : "";

  var row = document.createElement("div");
  row.className = "acp-row";
  row.innerHTML =
    '<div class="acp-row-avatar"><i class="fas fa-microchip"></i></div>' +
    '<div class="acp-msg-wrap">' +
    '<div class="acp-bubble' +
    alertClass +
    '">' +
    '<div class="acp-bubble-label">' +
    '<i class="' +
    res.label[0] +
    '"></i> ' +
    res.label[1] +
    "</div>" +
    res.text +
    dataHtml +
    chipsHtml +
    "</div>" +
    '<div class="acp-time">' +
    time +
    (res === ACP_KB.sambutan ? "" : " · Diproses 0.3d") +
    "</div>" +
    "</div>";
  msgs.appendChild(row);
  acpScrollBottom();
}

/* ══════════════════════════════════════════
   6. UTILITAS INPUT
══════════════════════════════════════════ */

/* Enter = kirim, Shift+Enter = baris baru */
function acpHandleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    acpSend();
  }
}

/* Auto resize textarea */
function acpAutoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 110) + "px";
}

/* Counter karakter */
function acpUpdateCounter(el) {
  var len = el.value.length;
  var counter = document.getElementById("acpCounter");
  counter.textContent = len + " / 400";
  counter.style.color =
    len > 360 ? "rgba(252,165,165,0.75)" : "rgba(255,255,255,0.2)";
  if (len > 400) el.value = el.value.slice(0, 400);
}

/* ==================== GPX EXPORT ==================== */

/**
 * Download evacuation routes as GPX file
 */
function downloadGPX() {
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SIGAP RATU WebGIS">
  <metadata>
    <name>Jalur Evakuasi PLTU Pelabuhan Ratu</name>
    <desc>Jalur evakuasi resmi PLTU Pelabuhan Ratu</desc>
  </metadata>
  <rte>
    <name>Jalur Evakuasi Utara</name>
    <rtept lat="-6.995" lon="106.560"><name>Start - PLTU</name></rtept>
    <rtept lat="-6.990" lon="106.555"><name>Titik 1</name></rtept>
    <rtept lat="-6.985" lon="106.548"><name>Titik 2</name></rtept>
    <rtept lat="-6.980" lon="106.540"><name>Titik Kumpul A</name></rtept>
  </rte>
  <rte>
    <name>Jalur Evakuasi Selatan</name>
    <rtept lat="-6.995" lon="106.560"><name>Start - PLTU</name></rtept>
    <rtept lat="-7.002" lon="106.558"><name>Titik 1</name></rtept>
    <rtept lat="-7.010" lon="106.552"><name>Titik 2</name></rtept>
    <rtept lat="-7.015" lon="106.545"><name>Titik Kumpul B</name></rtept>
  </rte>
  <wpt lat="-6.983" lon="106.548"><name>Titik Kumpul A</name><desc>Area Parkir Utama, Kapasitas 500 orang</desc></wpt>
  <wpt lat="-7.010" lon="106.550"><name>Titik Kumpul B</name><desc>Lapangan Olahraga, Kapasitas 800 orang</desc></wpt>
  <wpt lat="-6.995" lon="106.582"><name>Titik Kumpul C</name><desc>Area Terbuka Timur, Kapasitas 300 orang</desc></wpt>
</gpx>`;

  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jalur-evakuasi-pltu-pelabuhan-ratu.gpx";
  a.click();
}
