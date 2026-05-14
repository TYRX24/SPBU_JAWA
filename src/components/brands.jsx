// Brand logo components — uses real logo files from /Logo folder
const LOGO_PATH = {
  Pertamina: "public/assets/Logo/PERTAMINA_id7hJAjeL4_0.svg",
  Shell:     "public/assets/Logo/Shell_id0Yn1dyVO_1.svg",
  BP:        "public/assets/Logo/Bp_Symbol_0.svg",
  VIVO:      "public/assets/Logo/Logo_Vivo_Energy_Indonesia.png",
};

window.BrandLogos = Object.fromEntries(
  Object.entries(LOGO_PATH).map(([brand, src]) => [
    brand,
    ({ size = 24 }) => (
      <img
        src={src}
        width={size}
        height={size}
        alt={brand}
        style={{ objectFit: "contain", display: "block" }}
      />
    ),
  ])
);

window.BrandColors = {
  Pertamina: "#D8232A",
  Shell:     "#FBCE07",
  BP:        "#009900",
  VIVO:      "#E30613",
};

window.BrandHeroBg = {
  Pertamina: "linear-gradient(135deg, #d8232a 0%, #8e161c 100%)",
  Shell:     "linear-gradient(135deg, #fbce07 0%, #d92d27 100%)",
  BP:        "linear-gradient(135deg, #009900 0%, #ffe600 100%)",
  VIVO:      "linear-gradient(135deg, #e30613 0%, #6c0309 100%)",
};

// OSM menggunakan nama BBM Pertamina untuk semua brand — mapping ke nama resmi tiap brand
const FUEL_MAP = {
  Shell: {
    "Pertamax":       "Shell Super",
    "Pertamax Turbo": "Shell V-Power",
    "Diesel":         "Shell Diesel Extra",
  },
  BP: {
    "Pertamax":       "BP 92",
    "Pertamax Turbo": "BP 95",
    "Diesel":         "BP Diesel",
  },
  VIVO: {
    "Pertamax":       "Revvo 92",
    "Pertamax Turbo": "Revvo 95",
    "Diesel":         "Revvo D",
  },
  Pertamina: {
    "Diesel":   "Solar",
    "Gasoline": "Pertalite",
  },
};

window.getFuelName = (brand, fuel) => FUEL_MAP[brand]?.[fuel] ?? fuel;
