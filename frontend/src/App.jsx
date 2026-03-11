import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./App.css";

const DEFAULT_API_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
const LOGIN_COVER_IMAGE = import.meta.env.VITE_LOGIN_COVER_IMAGE || "/cover-login.jpg";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";
const PATH_LOGIN = "/login";
const PATH_DISCOVER = "/descubrir-centros";
const PATH_DISCOVER_ALIAS = "/descubir-centros";
const PATH_ABOUT = "/quienes-somos";
const PATH_PRICING = "/precios-planes";
const PATH_SSO_CALLBACK = "/auth/callback";
const PORTAL_TO_PATH = {
  platform_admin: "/admin",
  owner: "/owner",
  student: "/student",
};
const TAX_CONDITION_OPTIONS = [
  { value: "monotributista", label: "Monotributista" },
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "exento", label: "Exento" },
  { value: "consumidor_final", label: "Consumidor Final" },
  { value: "otro", label: "Otro" },
];
const IIBB_TYPE_OPTIONS = [
  { value: "local", label: "Contribuyente local" },
  { value: "convenio_multilateral", label: "Convenio multilateral" },
  { value: "exento", label: "Exento" },
];
const AFIP_BILLING_SYSTEM_OPTIONS = [
  { value: "wsfe", label: "Webservice WSFE" },
  { value: "comprobantes_en_linea", label: "Comprobantes en linea" },
];
const AFIP_ENVIRONMENT_OPTIONS = [
  { value: "homologacion", label: "Homologacion" },
  { value: "produccion", label: "Produccion" },
];
const WEEK_DAY_OPTIONS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miercoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sabado" },
  { key: "sun", label: "Domingo" },
];

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function createEmptyWeeklyHours() {
  return WEEK_DAY_OPTIONS.reduce((acc, day) => {
    acc[day.key] = {
      enabled: false,
      morning_start: "",
      morning_end: "",
      afternoon_start: "",
      afternoon_end: "",
    };
    return acc;
  }, {});
}

function normalizeTimeValue(value) {
  if (!value) return "";
  const raw = String(value);
  if (raw.length >= 5) return raw.slice(0, 5);
  return raw;
}

function normalizeWeeklyHours(weeklyHours, fallbackOpen = "", fallbackClose = "") {
  const normalized = createEmptyWeeklyHours();
  const source = weeklyHours || {};

  WEEK_DAY_OPTIONS.forEach((day) => {
    const row = source[day.key] || {};
    normalized[day.key] = {
      enabled: !!row.enabled,
      morning_start: normalizeTimeValue(row.morning_start),
      morning_end: normalizeTimeValue(row.morning_end),
      afternoon_start: normalizeTimeValue(row.afternoon_start),
      afternoon_end: normalizeTimeValue(row.afternoon_end),
    };
  });

  const hasAnyEnabled = WEEK_DAY_OPTIONS.some((day) => normalized[day.key].enabled);
  if (!hasAnyEnabled && fallbackOpen && fallbackClose) {
    WEEK_DAY_OPTIONS.forEach((day) => {
      normalized[day.key] = {
        ...normalized[day.key],
        enabled: true,
        morning_start: normalizeTimeValue(fallbackOpen),
        morning_end: normalizeTimeValue(fallbackClose),
      };
    });
  }

  return normalized;
}
const OWNER_MODULE_CATALOG = [
  { key: "configuracion", label: "Configuracion", icon: "settings" },
  { key: "pos", label: "POS", icon: "receipt" },
  { key: "alumnos", label: "Alumnos", icon: "users" },
  { key: "clases", label: "Clases", icon: "calendar" },
  { key: "tutoriales", label: "Tutoriales | Videos", icon: "video" },
  { key: "tableros", label: "Tableros", icon: "chart" },
  { key: "contactos", label: "Contactos", icon: "contacts" },
  { key: "redes_sociales", label: "Redes sociales", icon: "megaphone" },
];
const SUBSCRIPTION_PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];
const ACCESSIBILITY_OPTIONS = [
  { key: "screenReader", label: "Screen Reader", icon: "SR" },
  { key: "biggerText", label: "Bigger Text", icon: "T+" },
  { key: "highContrast", label: "Contrast +" , icon: "C+" },
  { key: "textSpacing", label: "Text Spacing", icon: "TS" },
  { key: "highlightLinks", label: "Highlight Links", icon: "LN" },
  { key: "pauseAnimations", label: "Pause Animations", icon: "PA" },
  { key: "hideImages", label: "Hide Images", icon: "IMG" },
  { key: "dyslexiaFont", label: "Dyslexia Friendly", icon: "Df" },
  { key: "biggerCursor", label: "Cursor", icon: "CUR" },
];

function ModuleGlyph({ icon }) {
  const commonProps = {
    className: "module-glyph",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (icon) {
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.4" />
          <path d="M12 2.7v2.7M12 18.6v2.7M2.7 12h2.7M18.6 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...commonProps}>
          <path d="M7 3.5h10a1 1 0 0 1 1 1v15.8L16 19l-2 1.3L12 19l-2 1.3L8 19l-2 1.3V4.5a1 1 0 0 1 1-1z" />
          <path d="M9 8h6M9 11h6M9 14h4" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="10" r="2.5" />
          <circle cx="15.6" cy="11.4" r="2" />
          <path d="M4.5 18c.8-2.2 2.5-3.4 4.5-3.4s3.7 1.2 4.5 3.4M13 18c.5-1.4 1.6-2.4 3.1-2.4s2.6 1 3.1 2.4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M13 13h3M8 16h3" />
        </svg>
      );
    case "video":
      return (
        <svg {...commonProps}>
          <rect x="3.8" y="6" width="12.2" height="12" rx="2" />
          <path d="M16 10l4-2v8l-4-2z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...commonProps}>
          <path d="M4 18h16M6 18v-6M12 18V7M18 18v-3.5" />
        </svg>
      );
    case "contacts":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="6" width="17" height="12" rx="2" />
          <circle cx="8.5" cy="12" r="2" />
          <path d="M6.2 15.5c.6-1 1.4-1.5 2.3-1.5.9 0 1.7.5 2.3 1.5M13 10h5M13 13h5" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...commonProps}>
          <path d="M4 12l10-4v8L4 12zM14 9v6" />
          <path d="M6 13l1.5 4h2l-1-3" />
          <path d="M17 10.5a3 3 0 0 1 0 3M19 9a5.2 5.2 0 0 1 0 6" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
const HELP_MENU_CONTENT = {
  login: {
    title: "Ayuda de acceso",
    subtitle: "Inicia sesion o crea cuenta desde marketplace.",
    items: [
      "Usa Ingresar para cuentas existentes y Crear cuenta para nuevos alumnos.",
      "Si SSO no aparece, revisa con admin global si Google/Facebook estan habilitados.",
      "Puedes ir al buscador publico sin iniciar sesion.",
    ],
  },
  discover: {
    title: "Ayuda de descubrir centros",
    subtitle: "Busqueda publica por cercania, mapa y direccion.",
    items: [
      "Presiona Usar mi ubicacion para ordenar centros por cercania.",
      "Selecciona un pin o usa Ver en mapa para enfocar una sucursal.",
      "Usa Como llegar para abrir Google Maps con navegacion.",
    ],
  },
  about: {
    title: "Ayuda de informacion",
    subtitle: "Conoce NILA y la propuesta para estudios.",
    items: [
      "Esta seccion explica mision, propuesta y publico objetivo.",
      "Puedes continuar a Precios y planes desde el menu superior.",
    ],
  },
  pricing: {
    title: "Ayuda de planes",
    subtitle: "Compara planes y elige segun tu operacion.",
    items: [
      "Starter: operacion inicial.",
      "Growth: operacion profesional multi-sede.",
      "Enterprise: implementacion a medida.",
    ],
  },
  sso: {
    title: "Ayuda de SSO",
    subtitle: "Diagnostico rapido de errores de autenticacion social.",
    items: [
      "Si cancelaste consentimiento, reintenta con el mismo proveedor.",
      "Si falta email, habilita permiso de email en el proveedor.",
      "Si provider_disabled, el admin global debe habilitar SSO.",
    ],
  },
  admin: {
    title: "Ayuda de admin global",
    subtitle: "Gobierno de plataforma, seguridad y suscripciones.",
    items: [
      "Configura SSO global antes de habilitar login social en usuarios.",
      "Asigna owner a organizaciones desde Gestion de owners.",
      "Define plan y modulos por organizacion para controlar alcance funcional.",
    ],
  },
  owner_launcher: {
    title: "Ayuda de launcher owner",
    subtitle: "Selecciona el modulo habilitado por suscripcion.",
    items: [
      "Si no ves un modulo, admin global aun no lo habilito.",
      "Empieza por Configuracion para datos de empresa y sedes.",
      "Luego continua con Clases, Alumnos y POS.",
    ],
  },
  owner_configuracion: {
    title: "Ayuda de configuracion",
    subtitle: "Empresa, sucursales, horarios y salones.",
    items: [
      "Carga datos fiscales completos antes de operar facturacion.",
      "Define horarios por dia para soportar horario cortado.",
      "Administra salones por sucursal y verifica capacidad total.",
    ],
  },
  owner_clases: {
    title: "Ayuda de clases",
    subtitle: "Agenda operativa con validaciones automáticas.",
    items: [
      "La capacidad de clase no puede superar capacidad del salon.",
      "No se permite solapamiento de salon ni instructor.",
      "Usa filtros por empresa, sede, instructor y estado.",
    ],
  },
  owner_alumnos: {
    title: "Ayuda de alumnos",
    subtitle: "Gestion de ficha, nivel e historial.",
    items: [
      "Puedes crear, editar y asignar alumnos a sedes.",
      "Registra eventos en historial para trazabilidad.",
      "Un alumno del sistema puede pertenecer a varias empresas.",
    ],
  },
  owner_pos: {
    title: "Ayuda de POS y cobros",
    subtitle: "Planes, pagos y comprobantes.",
    items: [
      "Registra pagos por clase o membresia.",
      "Si el pago queda aprobado, puedes emitir comprobante ARCA.",
      "Usa simulacion webhook MP en ambientes de prueba.",
    ],
  },
  owner_default: {
    title: "Ayuda de modulo owner",
    subtitle: "Operacion del modulo actual.",
    items: [
      "Este modulo depende del plan habilitado por admin global.",
      "Si necesitas funciones extra, solicita ampliacion de suscripcion.",
    ],
  },
  student: {
    title: "Ayuda de portal alumno",
    subtitle: "Perfiles, marketplace y pagos.",
    items: [
      "Puedes asociarte a nuevas empresas desde Marketplace.",
      "Revisa el estado de pagos y abre checkout cuando corresponda.",
      "Tus perfiles quedan separados por empresa.",
    ],
  },
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return PATH_LOGIN;
  return pathname.replace(/\/+$/, "") || PATH_LOGIN;
}

function getPortalByPath(pathname) {
  const normalized = normalizePath(pathname);
  if (normalized === PORTAL_TO_PATH.platform_admin) return "platform_admin";
  if (normalized === PORTAL_TO_PATH.owner) return "owner";
  if (normalized === PORTAL_TO_PATH.student) return "student";
  return null;
}

function isSSOCallbackPath(pathname) {
  return normalizePath(pathname) === PATH_SSO_CALLBACK;
}

function isDiscoverPath(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === PATH_DISCOVER || normalized === PATH_DISCOVER_ALIAS;
}

function isAboutPath(pathname) {
  return normalizePath(pathname) === PATH_ABOUT;
}

function isPricingPath(pathname) {
  return normalizePath(pathname) === PATH_PRICING;
}

function getPathByPortal(portal) {
  return PORTAL_TO_PATH[portal] || PATH_LOGIN;
}

function normalizeDateTimeLocal(value) {
  if (!value) return "";
  return String(value).slice(0, 16);
}

function toApiDateTime(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (raw.length === 16) return `${raw}:00`;
  return raw;
}

function formatDateTimeLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount, currency = "ARS") {
  const number = Number(amount || 0);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(number);
}

function getPaymentStatusLabel(status) {
  const map = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    canceled: "Cancelado",
    refunded: "Reintegrado",
  };
  return map[status] || status || "-";
}

function buildSSOError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getCenterAddressLabel(center) {
  const parts = [center.address, center.city].map((item) => String(item || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "Direccion no declarada";
}

function buildGoogleMapsPlaceUrl(center) {
  if (!center) return "#";
  const query = center.geo
    ? `${center.geo.lat},${center.geo.lon}`
    : `${center.name} ${center.organization_name} ${getCenterAddressLabel(center)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsDirectionsUrl(center, userCoords) {
  if (!center) return "#";
  const destination = center.geo
    ? `${center.geo.lat},${center.geo.lon}`
    : `${center.name} ${center.organization_name} ${getCenterAddressLabel(center)}`;
  const query = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });
  if (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lon)) {
    query.set("origin", `${userCoords.lat},${userCoords.lon}`);
  }
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

function formatDistanceLabel(distanceKm) {
  if (distanceKm == null) return "-";
  if (!Number.isFinite(distanceKm)) return "-";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function getFriendlySSOMessage(code, provider, fallback) {
  const providerLabel = provider === "google" ? "Google" : provider === "facebook" ? "Facebook" : "SSO";
  const messages = {
    sdk_missing_config: `Falta configurar ${providerLabel} en frontend.`,
    sdk_load_failed: `No se pudo cargar el servicio de ${providerLabel}.`,
    sdk_unavailable: `${providerLabel} no esta disponible en este navegador.`,
    consent_cancelled: `Cancelaste el consentimiento de ${providerLabel}.`,
    popup_closed: `Cerraste la ventana de ${providerLabel} antes de finalizar.`,
    missing_access_token: `${providerLabel} no devolvio token de acceso.`,
    email_not_provided: `${providerLabel} no devolvio email. Debes compartir permiso de email.`,
    provider_disabled: `${providerLabel} esta deshabilitado por administrador.`,
    app_not_authorized: `La aplicacion no esta autorizada en ${providerLabel}.`,
    invalid_token: `Token invalido recibido desde ${providerLabel}.`,
    organization_unavailable: "La empresa elegida no esta disponible para registro.",
    invalid_organization: "La empresa seleccionada no es valida.",
    token_validation_failed: `No se pudo validar tu acceso con ${providerLabel}.`,
    provider_http_error: `${providerLabel} rechazo la autenticacion.`,
  };
  return messages[code] || fallback || "No se pudo iniciar sesion con SSO.";
}

function DiscoverCentersMap({ centers, userCoords, selectedCenterKey, onSelectCenter }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const centerMarkersLayerRef = useRef(null);
  const userMarkerLayerRef = useRef(null);
  const hasManualNavigationRef = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.setView([-34.603722, -58.381592], 11);

    mapRef.current = map;
    centerMarkersLayerRef.current = L.layerGroup().addTo(map);
    userMarkerLayerRef.current = L.layerGroup().addTo(map);

    map.on("dragstart", () => {
      hasManualNavigationRef.current = true;
    });
    map.on("zoomstart", () => {
      hasManualNavigationRef.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      centerMarkersLayerRef.current = null;
      userMarkerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const userLayer = userMarkerLayerRef.current;
    if (!userLayer) return;
    userLayer.clearLayers();

    if (!userCoords || !Number.isFinite(userCoords.lat) || !Number.isFinite(userCoords.lon)) return;
    const userPosition = [userCoords.lat, userCoords.lon];
    L.circle(userPosition, {
      radius: 120,
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.22,
      weight: 2,
    }).addTo(userLayer);
    L.circleMarker(userPosition, {
      radius: 6,
      color: "#1d4ed8",
      fillColor: "#1d4ed8",
      fillOpacity: 1,
      weight: 1,
    })
      .bindTooltip("Tu ubicacion", { direction: "top" })
      .addTo(userLayer);
  }, [userCoords]);

  useEffect(() => {
    const map = mapRef.current;
    const centerLayer = centerMarkersLayerRef.current;
    if (!map || !centerLayer) return;

    centerLayer.clearLayers();
    const validCenters = centers.filter(
      (center) => Number.isFinite(center?.geo?.lat) && Number.isFinite(center?.geo?.lon)
    );
    if (!validCenters.length) return;

    validCenters.forEach((center) => {
      const isSelected = String(center.key) === String(selectedCenterKey);
      const marker = L.circleMarker([center.geo.lat, center.geo.lon], {
        radius: isSelected ? 9 : 7,
        weight: isSelected ? 3 : 2,
        color: isSelected ? "#111827" : "#1d4ed8",
        fillColor: isSelected ? "#0ea5e9" : "#60a5fa",
        fillOpacity: 0.95,
      });
      marker
        .bindTooltip(`${center.name} - ${center.organization_name}`, {
          direction: "top",
          offset: [0, -8],
        })
        .on("click", () => onSelectCenter(String(center.key)));
      centerLayer.addLayer(marker);
    });

    if (!hasManualNavigationRef.current) {
      const bounds = L.latLngBounds(validCenters.map((center) => [center.geo.lat, center.geo.lon]));
      if (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lon)) {
        bounds.extend([userCoords.lat, userCoords.lon]);
      }
      map.fitBounds(bounds.pad(0.16), { animate: false });
    }
  }, [centers, selectedCenterKey, userCoords, onSelectCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const selected = centers.find(
      (center) =>
        String(center.key) === String(selectedCenterKey) &&
        Number.isFinite(center?.geo?.lat) &&
        Number.isFinite(center?.geo?.lon)
    );
    if (!selected) return;
    map.flyTo([selected.geo.lat, selected.geo.lon], Math.max(map.getZoom(), 14), { duration: 0.45 });
  }, [centers, selectedCenterKey]);

  return <div ref={mapContainerRef} className="discover-map-canvas" aria-label="Mapa de centros cercanos" />;
}

function App() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [marketplaceOrganizations, setMarketplaceOrganizations] = useState([]);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverUserCoords, setDiscoverUserCoords] = useState(null);
  const [discoverLocationStatus, setDiscoverLocationStatus] = useState("idle");
  const [discoverLocationMessage, setDiscoverLocationMessage] = useState("");
  const [discoverCenterGeoMap, setDiscoverCenterGeoMap] = useState({});
  const [discoverCenterGeoLoading, setDiscoverCenterGeoLoading] = useState(false);
  const [discoverSelectedCenterKey, setDiscoverSelectedCenterKey] = useState("");
  const [publicAuthConfig, setPublicAuthConfig] = useState({ allow_google_sso: false, allow_facebook_sso: false });
  const [platformSettings, setPlatformSettings] = useState({ allow_google_sso: false, allow_facebook_sso: false });
  const [adminOrgConfig, setAdminOrgConfig] = useState({
    organizationId: "",
    subscription_enabled: false,
    subscription_plan: "starter",
    enabled_modules: OWNER_MODULE_CATALOG.map((module) => module.key),
    mercadolibre_enabled: false,
    electronic_billing_enabled: false,
  });

  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [resetPasswordDrafts, setResetPasswordDrafts] = useState({});
  const [ownerOrganizationDrafts, setOwnerOrganizationDrafts] = useState({});
  const [organizationForm, setOrganizationForm] = useState({
    name: "",
    logo: "",
    legal_name: "",
    tax_id: "",
    address: "",
    tax_condition: "",
    fiscal_street: "",
    fiscal_street_number: "",
    fiscal_floor: "",
    fiscal_apartment: "",
    fiscal_city: "",
    fiscal_province: "",
    fiscal_postal_code: "",
    activity_start_date: "",
    main_activity_code: "",
    fiscal_email: "",
    fiscal_phone: "",
    iibb_number: "",
    iibb_type: "",
    iibb_jurisdiction: "",
    iibb_condition: "",
    afip_pos_number: "",
    afip_pos_billing_system: "",
    afip_pos_address: "",
    wsaa_certificate_alias: "",
    afip_environment: "",
  });
  const [organizationEditForm, setOrganizationEditForm] = useState({
    id: "",
    name: "",
    logo: "",
    legal_name: "",
    tax_id: "",
    address: "",
    tax_condition: "",
    enabled_modules: ["configuracion", "pos", "alumnos", "clases", "tutoriales", "tableros", "contactos", "redes_sociales"],
    fiscal_document_issued: false,
    mercadolibre_enabled: false,
    electronic_billing_enabled: false,
    fiscal_street: "",
    fiscal_street_number: "",
    fiscal_floor: "",
    fiscal_apartment: "",
    fiscal_city: "",
    fiscal_province: "",
    fiscal_postal_code: "",
    activity_start_date: "",
    main_activity_code: "",
    fiscal_email: "",
    fiscal_phone: "",
    iibb_number: "",
    iibb_type: "",
    iibb_jurisdiction: "",
    iibb_condition: "",
    afip_pos_number: "",
    afip_pos_billing_system: "",
    afip_pos_address: "",
    wsaa_certificate_alias: "",
    afip_environment: "",
  });
  const [establishmentForm, setEstablishmentForm] = useState({
    name: "",
    organization: "",
    address: "",
    city: "",
    open_time: "",
    close_time: "",
    weekly_hours: createEmptyWeeklyHours(),
  });
  const [establishmentEditId, setEstablishmentEditId] = useState("");
  const [establishmentEditorOpen, setEstablishmentEditorOpen] = useState(false);
  const [establishmentEditorMode, setEstablishmentEditorMode] = useState("create");
  const [establishmentEditForm, setEstablishmentEditForm] = useState({
    name: "",
    organization: "",
    address: "",
    city: "",
    open_time: "",
    close_time: "",
    weekly_hours: createEmptyWeeklyHours(),
    is_active: true,
  });
  const [roomForm, setRoomForm] = useState({ establishment: "", name: "", room_type: "", capacity: "1", is_active: true });
  const [roomEditId, setRoomEditId] = useState("");
  const [roomEditForm, setRoomEditForm] = useState({
    establishment: "",
    name: "",
    room_type: "",
    capacity: "1",
    is_active: true,
    is_blocked: false,
    blocked_reason: "",
    blocked_from: "",
    blocked_to: "",
  });
  const [classForm, setClassForm] = useState({
    organization: "",
    establishment: "",
    room: "",
    instructor: "",
    name: "",
    start_at: "",
    end_at: "",
    capacity: "1",
  });
  const [classEditId, setClassEditId] = useState("");
  const [classEditForm, setClassEditForm] = useState({
    organization: "",
    establishment: "",
    room: "",
    instructor: "",
    name: "",
    start_at: "",
    end_at: "",
    capacity: "1",
  });
  const [classFilters, setClassFilters] = useState({
    organization: "",
    establishment: "",
    instructor: "",
    status: "all",
  });
  const [membershipPlanForm, setMembershipPlanForm] = useState({
    organization: "",
    name: "",
    description: "",
    price: "",
    currency: "ARS",
    duration_days: "30",
    classes_per_week: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    organization: "",
    student: "",
    payment_type: "class_single",
    studio_class: "",
    membership_plan: "",
    amount: "",
    currency: "ARS",
    provider: "mercadopago",
    payer_name: "",
    payer_email: "",
    description: "",
  });
  const [studentPaymentForm, setStudentPaymentForm] = useState({
    organization: "",
    payment_type: "class_single",
    studio_class: "",
    membership_plan: "",
    amount: "",
    currency: "ARS",
    payer_name: "",
    payer_email: "",
    description: "",
  });
  const [newStudent, setNewStudent] = useState({
    organization: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    current_level: "",
  });
  const [studentEditForm, setStudentEditForm] = useState({
    studentId: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    current_level: "",
    notes: "",
    is_active: true,
    establishmentIdsCsv: "",
  });
  const [registerStudentForm, setRegisterStudentForm] = useState({
    organization_id: "",
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [joinMarketplaceForm, setJoinMarketplaceForm] = useState({
    organization_id: "",
    first_name: "",
    last_name: "",
    phone: "",
    current_level: "",
  });
  const [assignForm, setAssignForm] = useState({ studentId: "", establishmentIdsCsv: "" });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [historyNote, setHistoryNote] = useState("");
  const [selectedEstablishmentForRooms, setSelectedEstablishmentForRooms] = useState("");
  const [pathname, setPathname] = useState(normalizePath(window.location.pathname));
  const [ssoCallbackState, setSSOCallbackState] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem("nila_sso_callback_state");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  });
  const [ownerModule, setOwnerModule] = useState("launcher");
  const [companyConfigTab, setCompanyConfigTab] = useState("general");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginTab, setLoginTab] = useState("signin");
  const [registerStep, setRegisterStep] = useState(1);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [screenReaderStatus, setScreenReaderStatus] = useState("");
  const screenReaderRef = useRef({ lastText: "", lastAt: 0 });
  const discoverCenterGeoTriedRef = useRef(new Set());
  const discoverCenterGeoStorageRef = useRef({});
  const [accessibilityState, setAccessibilityState] = useState({
    screenReader: false,
    biggerText: false,
    highContrast: false,
    textSpacing: false,
    highlightLinks: false,
    pauseAnimations: false,
    hideImages: false,
    dyslexiaFont: false,
    biggerCursor: false,
  });

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === Number(selectedStudentId)),
    [students, selectedStudentId]
  );
  const selectedMarketplaceOrganization = useMemo(
    () => marketplaceOrganizations.find((org) => String(org.id) === String(registerStudentForm.organization_id)),
    [marketplaceOrganizations, registerStudentForm.organization_id]
  );
  const marketplaceCenters = useMemo(() => {
    const entries = [];
    const organizations = Array.isArray(marketplaceOrganizations) ? marketplaceOrganizations : [];
    organizations.forEach((organization) => {
      const orgId = String(organization?.id || "");
      const orgName = String(organization?.name || "Centro");
      const organizationEstablishments =
        Array.isArray(organization.establishments) && organization.establishments.length
          ? organization.establishments
          : [
              {
                id: `org-${orgId || "0"}`,
                name: orgName,
                address: organization.address || "",
                city: organization.city || "",
                open_time: null,
                close_time: null,
                weekly_hours: null,
                is_org_fallback: true,
              },
            ];

      organizationEstablishments.forEach((establishment) => {
        entries.push({
          key: `${orgId || "0"}-${String(establishment?.id || "0")}`,
          organization_id: organization.id,
          organization_name: orgName,
          organization_logo: organization.logo || "",
          organization_plan: organization.subscription_plan || "",
          establishment_id: establishment.id,
          name: String(establishment?.name || orgName),
          address: establishment.address || organization.address || "",
          city: establishment.city || organization.city || "",
          open_time: establishment.open_time || null,
          close_time: establishment.close_time || null,
          weekly_hours: establishment.weekly_hours || null,
          is_fallback: !!establishment.is_org_fallback,
        });
      });
    });
    return entries;
  }, [marketplaceOrganizations]);
  const discoverCenters = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(discoverSearch);
    return marketplaceCenters
      .map((center) => {
        const centerGeo = discoverCenterGeoMap[center.key];
        const distanceKm =
          discoverUserCoords && centerGeo
            ? haversineDistanceKm(discoverUserCoords.lat, discoverUserCoords.lon, centerGeo.lat, centerGeo.lon)
            : null;
        const searchable = normalizeSearchValue(
          `${center.name} ${center.organization_name} ${center.address} ${center.city} ${center.organization_plan}`
        );
        return {
          ...center,
          distanceKm,
          searchable,
          geo: centerGeo || null,
        };
      })
      .filter((center) => !normalizedSearch || center.searchable.includes(normalizedSearch))
      .sort((a, b) => {
        const aOrgName = String(a.organization_name || "");
        const bOrgName = String(b.organization_name || "");
        const aCenterName = String(a.name || "");
        const bCenterName = String(b.name || "");
        if (discoverUserCoords) {
          const aDistance = a.distanceKm;
          const bDistance = b.distanceKm;
          const aHasDistance = Number.isFinite(aDistance);
          const bHasDistance = Number.isFinite(bDistance);
          if (aHasDistance && bHasDistance) return aDistance - bDistance;
          if (aHasDistance) return -1;
          if (bHasDistance) return 1;
        }
        const byOrg = aOrgName.localeCompare(bOrgName, "es", { sensitivity: "base" });
        if (byOrg !== 0) return byOrg;
        return aCenterName.localeCompare(bCenterName, "es", { sensitivity: "base" });
      });
  }, [marketplaceCenters, discoverCenterGeoMap, discoverUserCoords, discoverSearch]);
  const nearestDiscoverCenter = useMemo(
    () => discoverCenters.find((center) => Number.isFinite(center.distanceKm)) || null,
    [discoverCenters]
  );
  const selectedDiscoverCenter = useMemo(
    () => discoverCenters.find((center) => String(center.key) === String(discoverSelectedCenterKey)) || null,
    [discoverCenters, discoverSelectedCenterKey]
  );
  const selectedBranchForRooms = useMemo(
    () => establishments.find((est) => String(est.id) === String(selectedEstablishmentForRooms)),
    [establishments, selectedEstablishmentForRooms]
  );
  const roomsForSelectedBranch = useMemo(
    () => rooms.filter((room) => String(room.establishment) === String(selectedEstablishmentForRooms)),
    [rooms, selectedEstablishmentForRooms]
  );
  const branchStatsByEstablishment = useMemo(() => {
    const stats = {};
    rooms.forEach((room) => {
      const key = String(room.establishment || "");
      if (!key) return;
      if (!stats[key]) {
        stats[key] = {
          rooms: 0,
          activeRooms: 0,
          blockedRooms: 0,
          totalCapacity: 0,
          availableCapacity: 0,
        };
      }
      const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 0;
      stats[key].rooms += 1;
      stats[key].totalCapacity += capacity;
      if (room.is_active) stats[key].activeRooms += 1;
      if (room.is_blocked) stats[key].blockedRooms += 1;
      if (room.is_active && !room.is_blocked) stats[key].availableCapacity += capacity;
    });
    return stats;
  }, [rooms]);
  const selectedBranchStats = useMemo(
    () =>
      branchStatsByEstablishment[String(selectedEstablishmentForRooms)] || {
        rooms: 0,
        activeRooms: 0,
        blockedRooms: 0,
        totalCapacity: 0,
        availableCapacity: 0,
      },
    [branchStatsByEstablishment, selectedEstablishmentForRooms]
  );
  const ownerUsers = useMemo(
    () => users.filter((user) => Array.isArray(user.roles) && user.roles.includes("owner")),
    [users]
  );
  const ownerHasOrganization = me?.portal === "owner" && organizations.length >= 1;
  const ownerOrganization = ownerHasOrganization ? organizations[0] : null;
  const enabledOwnerModules = useMemo(() => {
    const allowed = new Set(Array.isArray(ownerOrganization?.enabled_modules) ? ownerOrganization.enabled_modules : OWNER_MODULE_CATALOG.map((m) => m.key));
    return OWNER_MODULE_CATALOG.filter((module) => allowed.has(module.key));
  }, [ownerOrganization]);
  const isOwnerRole = Array.isArray(me?.roles) && me.roles.includes("owner");
  const isInstructorRole = Array.isArray(me?.roles) && me.roles.includes("instructor");
  const classFormEstablishments = useMemo(
    () => establishments.filter((est) => !classForm.organization || String(est.organization) === String(classForm.organization)),
    [establishments, classForm.organization]
  );
  const classFormRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.is_active &&
          !room.is_blocked &&
          (!classForm.establishment || String(room.establishment) === String(classForm.establishment))
      ),
    [rooms, classForm.establishment]
  );
  const selectedClassRoom = useMemo(
    () => classFormRooms.find((room) => String(room.id) === String(classForm.room)),
    [classFormRooms, classForm.room]
  );
  const classEditEstablishments = useMemo(
    () => establishments.filter((est) => !classEditForm.organization || String(est.organization) === String(classEditForm.organization)),
    [establishments, classEditForm.organization]
  );
  const classEditRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.is_active &&
          !room.is_blocked &&
          (!classEditForm.establishment || String(room.establishment) === String(classEditForm.establishment))
      ),
    [rooms, classEditForm.establishment]
  );
  const selectedClassEditRoom = useMemo(
    () => classEditRooms.find((room) => String(room.id) === String(classEditForm.room)),
    [classEditRooms, classEditForm.room]
  );
  const filteredClasses = useMemo(() => {
    const filtered = classes.filter((studioClass) => {
      if (classFilters.organization && String(studioClass.organization) !== String(classFilters.organization)) return false;
      if (classFilters.establishment && String(studioClass.establishment) !== String(classFilters.establishment)) return false;
      if (classFilters.instructor && String(studioClass.instructor || "") !== String(classFilters.instructor)) return false;
      if (classFilters.status !== "all" && studioClass.status !== classFilters.status) return false;
      return true;
    });
    return filtered.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [classes, classFilters]);
  const classSummary = useMemo(() => {
    const scheduled = filteredClasses.filter((item) => item.status === "scheduled").length;
    const canceled = filteredClasses.filter((item) => item.status === "canceled").length;
    const completed = filteredClasses.filter((item) => item.status === "completed").length;
    const totalCapacity = filteredClasses.reduce((acc, item) => acc + Number(item.capacity || 0), 0);
    return { scheduled, canceled, completed, totalCapacity };
  }, [filteredClasses]);
  const paymentFormStudents = useMemo(
    () => students.filter((student) => !paymentForm.organization || String(student.organization) === String(paymentForm.organization)),
    [students, paymentForm.organization]
  );
  const paymentFormClasses = useMemo(
    () => classes.filter((studioClass) => !paymentForm.organization || String(studioClass.organization) === String(paymentForm.organization)),
    [classes, paymentForm.organization]
  );
  const paymentFormPlans = useMemo(
    () =>
      membershipPlans.filter(
        (plan) =>
          plan.is_active &&
          (!paymentForm.organization || String(plan.organization) === String(paymentForm.organization))
      ),
    [membershipPlans, paymentForm.organization]
  );
  const studentOrganizationIds = useMemo(
    () => new Set(studentProfiles.map((profile) => String(profile.organization))),
    [studentProfiles]
  );
  const studentAvailableClasses = useMemo(
    () =>
      classes.filter(
        (studioClass) =>
          studioClass.status === "scheduled" &&
          (studentOrganizationIds.size === 0 || studentOrganizationIds.has(String(studioClass.organization)))
      ),
    [classes, studentOrganizationIds]
  );
  const studentAvailablePlans = useMemo(
    () =>
      membershipPlans.filter(
        (plan) => plan.is_active && (studentOrganizationIds.size === 0 || studentOrganizationIds.has(String(plan.organization)))
      ),
    [membershipPlans, studentOrganizationIds]
  );

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { ...options, headers });
  }

  async function extractErrorMessage(response, fallback) {
    const payload = await response.json().catch(() => ({}));
    if (typeof payload?.detail === "string") return payload.detail;
    const firstValue = payload && typeof payload === "object" ? Object.values(payload)[0] : null;
    if (Array.isArray(firstValue) && firstValue.length) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
    return fallback;
  }

  async function fetchMe(activeToken) {
    const response = await fetch(`${API_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!response.ok) {
      setToken("");
      setMe(null);
      return null;
    }

    const data = await response.json();
    setMe(data);
    return data;
  }

  async function loadMarketplaceData() {
    const response = await fetch(`${API_URL}/api/auth/marketplace-organizations/`);
    if (!response.ok) return;
    const payload = await response.json();
    setPublicAuthConfig({
      allow_google_sso: !!payload.allow_google_sso,
      allow_facebook_sso: !!payload.allow_facebook_sso,
    });
    setMarketplaceOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
  }

  function loadExternalScript(src, id) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(buildSSOError("sdk_load_failed", `No se pudo cargar ${src}`));
      document.head.appendChild(script);
    });
  }

  async function getGoogleSSOAccessToken() {
    if (!GOOGLE_CLIENT_ID) {
      throw buildSSOError("sdk_missing_config", "Falta VITE_GOOGLE_CLIENT_ID en frontend");
    }
    await loadExternalScript("https://accounts.google.com/gsi/client", "google-gsi-client");
    if (!window.google?.accounts?.oauth2?.initTokenClient) {
      throw buildSSOError("sdk_unavailable", "SDK de Google no disponible");
    }

    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        error_callback: (errorResponse) => {
          const reason = String(errorResponse?.type || errorResponse?.error || "").toLowerCase();
          if (reason.includes("popup_closed")) return reject(buildSSOError("popup_closed", "Cerraste la ventana de Google"));
          if (reason.includes("access_denied") || reason.includes("cancel")) {
            return reject(buildSSOError("consent_cancelled", "Consentimiento de Google cancelado"));
          }
          return reject(buildSSOError("token_validation_failed", "Google no pudo completar el login"));
        },
        callback: (response) => {
          if (response?.error) {
            const reason = String(response.error || "").toLowerCase();
            if (reason.includes("access_denied")) {
              reject(buildSSOError("consent_cancelled", "Consentimiento de Google cancelado"));
              return;
            }
            reject(buildSSOError("token_validation_failed", "Google devolvio un error de autenticacion"));
            return;
          }
          if (response?.access_token) resolve(response.access_token);
          else reject(buildSSOError("missing_access_token", "Google no devolvio access token"));
        },
      });
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
  }

  async function getFacebookSSOAccessToken() {
    if (!FACEBOOK_APP_ID) {
      throw buildSSOError("sdk_missing_config", "Falta VITE_FACEBOOK_APP_ID en frontend");
    }

    await loadExternalScript("https://connect.facebook.net/en_US/sdk.js", "facebook-sdk");
    if (!window.FB) {
      throw buildSSOError("sdk_unavailable", "SDK de Facebook no disponible");
    }

    window.FB.init({
      appId: FACEBOOK_APP_ID,
      cookie: true,
      xfbml: false,
      version: "v19.0",
    });

    return new Promise((resolve, reject) => {
      window.FB.login(
        (response) => {
          const token = response?.authResponse?.accessToken;
          if (token) resolve(token);
          else reject(buildSSOError("consent_cancelled", "Consentimiento de Facebook cancelado"));
        },
        { scope: "public_profile,email" }
      );
    });
  }

  async function handleTokenAuthentication(tokens) {
    if (!tokens?.access) {
      setError("No se pudo obtener token de sesion");
      return;
    }
    setToken(tokens.access);
    const meData = await fetchMe(tokens.access);
    if (meData?.portal) navigate(getPathByPortal(meData.portal), true);
  }

  function persistSSOCallbackState(nextState) {
    setSSOCallbackState(nextState);
    if (!nextState) {
      window.sessionStorage.removeItem("nila_sso_callback_state");
      return;
    }
    window.sessionStorage.setItem("nila_sso_callback_state", JSON.stringify(nextState));
  }

  function showSSOCallbackError(provider, code, fallbackMessage) {
    const friendlyMessage = getFriendlySSOMessage(code, provider, fallbackMessage);
    persistSSOCallbackState({
      provider,
      status: "error",
      code,
      message: friendlyMessage,
      occurred_at: new Date().toISOString(),
    });
    setError("");
    navigate(PATH_SSO_CALLBACK, true);
  }

  function navigate(nextPath, replace = false) {
    const normalized = normalizePath(nextPath);
    if (replace) {
      window.history.replaceState({}, "", normalized);
    } else {
      window.history.pushState({}, "", normalized);
    }
    setPathname(normalized);
  }

  function openLoginModal() {
    if (!isDiscoverPath(pathname) && normalizePath(pathname) !== PATH_LOGIN) {
      navigate(PATH_LOGIN, true);
    }
    setLoginModalOpen(true);
  }

  function closeLoginModal() {
    setLoginModalOpen(false);
    setLoginTab("signin");
    setRegisterStep(1);
  }

  function switchLoginTab(tab) {
    setLoginTab(tab);
    if (tab === "signup") {
      setRegisterStep(1);
    }
  }

  function openCompanyLogin() {
    if (normalizePath(pathname) !== PATH_LOGIN) {
      navigate(PATH_LOGIN, true);
    }
    setLoginTab("signin");
    setRegisterStep(1);
    setLoginModalOpen(true);
  }

  function openStudentLogin() {
    if (normalizePath(pathname) !== PATH_LOGIN) {
      navigate(PATH_LOGIN, true);
    }
    setLoginTab("signin");
    setRegisterStep(1);
    setLoginModalOpen(true);
  }

  function openFindCenter() {
    setLoginModalOpen(false);
    navigate(PATH_DISCOVER);
  }

  function openAbout() {
    setLoginModalOpen(false);
    navigate(PATH_ABOUT);
  }

  function openPricing() {
    setLoginModalOpen(false);
    navigate(PATH_PRICING);
  }

  function openMarketplaceSignupForOrganization(organizationId) {
    if (normalizePath(pathname) !== PATH_LOGIN) {
      navigate(PATH_LOGIN, true);
    }
    setRegisterStudentForm((prev) => ({ ...prev, organization_id: String(organizationId || "") }));
    setLoginTab("signup");
    setRegisterStep(1);
    setLoginModalOpen(true);
  }

  function requestDiscoverLocation() {
    if (!navigator.geolocation) {
      setDiscoverLocationStatus("error");
      setDiscoverLocationMessage("Este navegador no soporta geolocalizacion.");
      return;
    }

    setDiscoverLocationStatus("loading");
    setDiscoverLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDiscoverUserCoords({
          lat: Number(position.coords.latitude),
          lon: Number(position.coords.longitude),
        });
        setDiscoverLocationStatus("ready");
        setDiscoverLocationMessage("Ubicacion detectada correctamente.");
      },
      (geoError) => {
        let detail = "No pudimos obtener tu ubicacion.";
        if (geoError?.code === 1) detail = "Permiso de ubicacion denegado.";
        if (geoError?.code === 2) detail = "No se pudo determinar la ubicacion.";
        if (geoError?.code === 3) detail = "Tiempo de espera agotado para obtener la ubicacion.";
        setDiscoverLocationStatus("error");
        setDiscoverLocationMessage(detail);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 180000 }
    );
  }

  function selectOwnerModule(moduleKey) {
    setOwnerModule(moduleKey);
  }

  function toggleAccessibilityOption(optionKey) {
    setAccessibilityState((prev) => ({ ...prev, [optionKey]: !prev[optionKey] }));
  }

  function speakText(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setScreenReaderStatus("Este navegador no soporta lectura por voz.");
      return;
    }

    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) return;

    const now = Date.now();
    if (screenReaderRef.current.lastText === normalized && now - screenReaderRef.current.lastAt < 900) return;
    screenReaderRef.current = { lastText: normalized, lastAt: now };

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(normalized.slice(0, 220));
    const voices = synth.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("es")) ||
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
      null;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = "es-AR";
    }
    utterance.rate = 1;
    utterance.pitch = 1;

    setScreenReaderStatus("Lector activo.");
    synth.cancel();
    synth.resume();
    synth.speak(utterance);
  }

  function uploadOrganizationLogo(file, target = "edit") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El logo debe ser una imagen valida");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (!source) return;

      const image = new Image();
      image.onload = () => {
        const maxSide = 512;
        let width = image.width;
        let height = image.height;
        if (width > height && width > maxSide) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else if (height >= width && height > maxSide) {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("No se pudo procesar el logo");
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);

        const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressed = outputMime === "image/png"
          ? canvas.toDataURL(outputMime)
          : canvas.toDataURL(outputMime, 0.82);

        if (compressed.length > 1_400_000) {
          setError("El logo es muy grande. Usa una imagen mas liviana.");
          return;
        }

        if (target === "create") {
          setOrganizationForm((prev) => ({ ...prev, logo: compressed }));
        } else {
          setOrganizationEditForm((prev) => ({ ...prev, logo: compressed }));
        }
        setError("");
      };
      image.onerror = () => setError("No se pudo leer la imagen del logo");
      image.src = source;
    };
    reader.onerror = () => setError("No se pudo leer el archivo de logo");
    reader.readAsDataURL(file);
  }

  async function login(event) {
    event.preventDefault();
    setError("");

    const response = await fetch(`${API_URL}/api/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setError("Login invalido");
      return;
    }

    const data = await response.json();
    await handleTokenAuthentication({ access: data.access, refresh: data.refresh });
  }

  async function registerStudentFromMarketplace(event) {
    event.preventDefault();
    setError("");

    if (!registerStudentForm.organization_id) return setError("Selecciona una empresa del marketplace");

    const response = await fetch(`${API_URL}/api/auth/register-student/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: Number(registerStudentForm.organization_id),
        username: registerStudentForm.username || undefined,
        first_name: registerStudentForm.first_name,
        last_name: registerStudentForm.last_name,
        email: registerStudentForm.email,
        password: registerStudentForm.password,
        phone: registerStudentForm.phone,
      }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo crear la cuenta"));

    const data = await response.json();
    setRegisterStudentForm({
      organization_id: "",
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
    });
    await handleTokenAuthentication(data.tokens);
  }

  async function loginWithSSO(provider) {
    setError("");
    try {
      let endpoint = "";
      let providerTokenPayload = {};

      if (provider === "google") {
        const googleAccessToken = await getGoogleSSOAccessToken();
        endpoint = "/api/auth/sso/google/";
        providerTokenPayload = { google_access_token: googleAccessToken };
      } else {
        const facebookAccessToken = await getFacebookSSOAccessToken();
        endpoint = "/api/auth/sso/facebook/";
        providerTokenPayload = { facebook_access_token: facebookAccessToken };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...providerTokenPayload,
          organization_id: registerStudentForm.organization_id ? Number(registerStudentForm.organization_id) : undefined,
          first_name: registerStudentForm.first_name || undefined,
          last_name: registerStudentForm.last_name || undefined,
          phone: registerStudentForm.phone || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const code = payload?.code || "token_validation_failed";
        const detail = payload?.detail || "No se pudo autenticar con SSO";
        showSSOCallbackError(provider, code, detail);
        return;
      }
      const data = await response.json();
      persistSSOCallbackState({
        provider,
        status: "success",
        code: "ok",
        message: `${provider === "google" ? "Google" : "Facebook"} autenticado correctamente.`,
        occurred_at: new Date().toISOString(),
      });
      await handleTokenAuthentication(data.tokens);
    } catch (sdkError) {
      showSSOCallbackError(
        provider,
        sdkError?.code || "token_validation_failed",
        sdkError?.message || "No se pudo iniciar SSO"
      );
    }
  }

  async function loadPlatformAdminData() {
    const [summaryRes, organizationsRes, usersRes, rolesRes, settingsRes, paymentsRes, invoicesRes, plansRes] = await Promise.all([
      request("/api/dashboard/summary/"),
      request("/api/organizations/"),
      request("/api/users/"),
      request("/api/users/roles/"),
      request("/api/platform-settings/"),
      request("/api/payments/"),
      request("/api/invoices/"),
      request("/api/membership-plans/"),
    ]);

    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (organizationsRes.ok) setOrganizations(await organizationsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (rolesRes.ok) setRoles((await rolesRes.json()).roles || []);
    if (settingsRes.ok) setPlatformSettings(await settingsRes.json());
    if (paymentsRes.ok) setPayments(await paymentsRes.json());
    if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    if (plansRes.ok) setMembershipPlans(await plansRes.json());
  }

  async function loadOwnerData() {
    const [summaryRes, orgsRes, estRes, roomsRes, classesRes, instructorsRes, studentsRes, paymentsRes, invoicesRes, plansRes] = await Promise.all([
      request("/api/dashboard/summary/"),
      request("/api/organizations/"),
      request("/api/establishments/"),
      request("/api/rooms/"),
      request("/api/classes/"),
      request("/api/classes/instructors/"),
      request("/api/students/"),
      request("/api/payments/"),
      request("/api/invoices/"),
      request("/api/membership-plans/"),
    ]);

    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (orgsRes.ok) setOrganizations(await orgsRes.json());
    if (estRes.ok) setEstablishments(await estRes.json());
    if (roomsRes.ok) setRooms(await roomsRes.json());
    if (classesRes.ok) setClasses(await classesRes.json());
    if (instructorsRes.ok) setInstructors(await instructorsRes.json());
    if (studentsRes.ok) setStudents(await studentsRes.json());
    if (paymentsRes.ok) setPayments(await paymentsRes.json());
    if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    if (plansRes.ok) setMembershipPlans(await plansRes.json());
  }

  async function loadStudentData() {
    const [classesRes, plansRes, paymentsRes, invoicesRes, profilesRes] = await Promise.all([
      request("/api/classes/"),
      request("/api/membership-plans/"),
      request("/api/payments/"),
      request("/api/invoices/"),
      request("/api/students/my-profiles/"),
    ]);

    if (classesRes.ok) setClasses(await classesRes.json());
    if (plansRes.ok) setMembershipPlans(await plansRes.json());
    if (paymentsRes.ok) setPayments(await paymentsRes.json());
    if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    if (profilesRes.ok) setStudentProfiles(await profilesRes.json());
    loadMarketplaceData();
  }

  async function loadPortalData() {
    if (!token || !me) return;
    setError("");

    if (me.portal === "platform_admin") {
      await loadPlatformAdminData();
      return;
    }

    if (me.portal === "owner") {
      await loadOwnerData();
      return;
    }

    if (me.portal === "student") {
      await loadStudentData();
      return;
    }
  }

  async function createUser(event) {
    event.preventDefault();
    const response = await request("/api/users/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (!response.ok) return setError("No se pudo crear el usuario");
    setNewUser({ username: "", email: "", password: "" });
    loadPlatformAdminData();
  }

  async function assignRole(userId, role) {
    const response = await request(`/api/users/${userId}/assign-role/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) return setError("No se pudo asignar rol");
    loadPlatformAdminData();
  }

  async function resetUserPassword(userId) {
    const newPassword = (resetPasswordDrafts[userId] || "").trim();
    if (newPassword.length < 8) return setError("La nueva contraseña debe tener al menos 8 caracteres");

    const response = await request(`/api/users/${userId}/reset-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo resetear la contraseña");
    }

    setResetPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
    setError("");
  }

  async function deleteUser(userId) {
    const confirmed = window.confirm("¿Eliminar usuario? Esta accion no se puede deshacer.");
    if (!confirmed) return;

    const response = await request(`/api/users/${userId}/`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo eliminar el usuario");
    }

    setError("");
    loadPlatformAdminData();
  }

  async function assignOwnerToOrganization(userId) {
    const organizationId = Number(ownerOrganizationDrafts[userId]);
    if (!organizationId) return setError("Selecciona una organizacion");

    const response = await request(`/api/users/${userId}/assign-owner-organization/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: organizationId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo asignar owner a organizacion");
    }

    setError("");
    setOwnerOrganizationDrafts((prev) => ({ ...prev, [userId]: "" }));
    loadPlatformAdminData();
  }

  async function deactivateOwnerFromOrganization(userId, organizationId) {
    const response = await request(`/api/users/${userId}/deactivate-owner-organization/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organization_id: organizationId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo desactivar relacion owner-organizacion");
    }

    setError("");
    loadPlatformAdminData();
  }

  async function updatePlatformSetting(key, value) {
    const response = await request("/api/platform-settings/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!response.ok) return setError("No se pudo actualizar configuracion global");
    setPlatformSettings(await response.json());
  }

  async function patchOrganization(orgId, payload) {
    const response = await request(`/api/organizations/${orgId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return setError("No se pudo actualizar organizacion");
    loadPlatformAdminData();
  }

  function selectAdminOrganizationConfig(organizationId) {
    const selected = organizations.find((org) => org.id === Number(organizationId));
    if (!selected) {
      setAdminOrgConfig({
        organizationId: "",
        subscription_enabled: false,
        subscription_plan: "starter",
        enabled_modules: OWNER_MODULE_CATALOG.map((module) => module.key),
        mercadolibre_enabled: false,
        electronic_billing_enabled: false,
      });
      return;
    }
    setAdminOrgConfig({
      organizationId: String(selected.id),
      subscription_enabled: !!selected.subscription_enabled,
      subscription_plan: selected.subscription_plan || "starter",
      enabled_modules: Array.isArray(selected.enabled_modules)
        ? selected.enabled_modules
        : OWNER_MODULE_CATALOG.map((module) => module.key),
      mercadolibre_enabled: !!selected.mercadolibre_enabled,
      electronic_billing_enabled: !!selected.electronic_billing_enabled,
    });
  }

  function toggleAdminOrgModule(moduleKey) {
    setAdminOrgConfig((prev) => {
      const current = new Set(prev.enabled_modules || []);
      if (current.has(moduleKey)) current.delete(moduleKey);
      else current.add(moduleKey);
      return { ...prev, enabled_modules: Array.from(current) };
    });
  }

  async function saveAdminSubscriptionConfig(event) {
    event.preventDefault();
    if (!adminOrgConfig.organizationId) return setError("Selecciona una organizacion");
    await patchOrganization(Number(adminOrgConfig.organizationId), {
      subscription_enabled: !!adminOrgConfig.subscription_enabled,
      subscription_plan: adminOrgConfig.subscription_plan,
      enabled_modules: adminOrgConfig.enabled_modules,
      mercadolibre_enabled: !!adminOrgConfig.mercadolibre_enabled,
      electronic_billing_enabled: !!adminOrgConfig.electronic_billing_enabled,
    });
    setError("");
  }

  async function createOrganization(event) {
    event.preventDefault();
    if (ownerHasOrganization) {
      return setError("Solo puedes crear una empresa");
    }

    const payload = {
      name: organizationForm.name.trim(),
      logo: organizationForm.logo,
      legal_name: organizationForm.legal_name.trim(),
      tax_id: organizationForm.tax_id.trim(),
      address: organizationForm.address.trim(),
      tax_condition: organizationForm.tax_condition,
      fiscal_street: organizationForm.fiscal_street.trim(),
      fiscal_street_number: organizationForm.fiscal_street_number.trim(),
      fiscal_floor: organizationForm.fiscal_floor.trim(),
      fiscal_apartment: organizationForm.fiscal_apartment.trim(),
      fiscal_city: organizationForm.fiscal_city.trim(),
      fiscal_province: organizationForm.fiscal_province.trim(),
      fiscal_postal_code: organizationForm.fiscal_postal_code.trim(),
      activity_start_date: organizationForm.activity_start_date || null,
      main_activity_code: organizationForm.main_activity_code.trim(),
      fiscal_email: organizationForm.fiscal_email.trim(),
      fiscal_phone: organizationForm.fiscal_phone.trim(),
      iibb_number: organizationForm.iibb_number.trim(),
      iibb_type: organizationForm.iibb_type,
      iibb_jurisdiction: organizationForm.iibb_jurisdiction.trim(),
      iibb_condition: organizationForm.iibb_condition.trim(),
      afip_pos_number: organizationForm.afip_pos_number ? Number(organizationForm.afip_pos_number) : null,
      afip_pos_billing_system: organizationForm.afip_pos_billing_system,
      afip_pos_address: organizationForm.afip_pos_address.trim(),
      wsaa_certificate_alias: organizationForm.wsaa_certificate_alias.trim(),
      afip_environment: organizationForm.afip_environment,
    };

    const response = await request("/api/organizations/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || Object.values(data)[0]?.[0] || "No se pudo crear organizacion");
    }

    setOrganizationForm({
      name: "",
      logo: "",
      legal_name: "",
      tax_id: "",
      address: "",
      tax_condition: "",
      fiscal_street: "",
      fiscal_street_number: "",
      fiscal_floor: "",
      fiscal_apartment: "",
      fiscal_city: "",
      fiscal_province: "",
      fiscal_postal_code: "",
      activity_start_date: "",
      main_activity_code: "",
      fiscal_email: "",
      fiscal_phone: "",
      iibb_number: "",
      iibb_type: "",
      iibb_jurisdiction: "",
      iibb_condition: "",
      afip_pos_number: "",
      afip_pos_billing_system: "",
      afip_pos_address: "",
      wsaa_certificate_alias: "",
      afip_environment: "",
    });
    loadOwnerData();
  }

  async function updateOrganization(event) {
    event.preventDefault();
    if (!organizationEditForm.id) return;

    const payload = {
      name: organizationEditForm.name.trim(),
      logo: organizationEditForm.logo,
      legal_name: organizationEditForm.legal_name.trim(),
      tax_id: organizationEditForm.tax_id.trim(),
      address: organizationEditForm.address.trim(),
      tax_condition: organizationEditForm.tax_condition,
      fiscal_street: organizationEditForm.fiscal_street.trim(),
      fiscal_street_number: organizationEditForm.fiscal_street_number.trim(),
      fiscal_floor: organizationEditForm.fiscal_floor.trim(),
      fiscal_apartment: organizationEditForm.fiscal_apartment.trim(),
      fiscal_city: organizationEditForm.fiscal_city.trim(),
      fiscal_province: organizationEditForm.fiscal_province.trim(),
      fiscal_postal_code: organizationEditForm.fiscal_postal_code.trim(),
      activity_start_date: organizationEditForm.activity_start_date || null,
      main_activity_code: organizationEditForm.main_activity_code.trim(),
      fiscal_email: organizationEditForm.fiscal_email.trim(),
      fiscal_phone: organizationEditForm.fiscal_phone.trim(),
      iibb_number: organizationEditForm.iibb_number.trim(),
      iibb_type: organizationEditForm.iibb_type,
      iibb_jurisdiction: organizationEditForm.iibb_jurisdiction.trim(),
      iibb_condition: organizationEditForm.iibb_condition.trim(),
      afip_pos_number: organizationEditForm.afip_pos_number ? Number(organizationEditForm.afip_pos_number) : null,
      afip_pos_billing_system: organizationEditForm.afip_pos_billing_system,
      afip_pos_address: organizationEditForm.afip_pos_address.trim(),
      wsaa_certificate_alias: organizationEditForm.wsaa_certificate_alias.trim(),
      afip_environment: organizationEditForm.afip_environment,
    };

    const response = await request(`/api/organizations/${organizationEditForm.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || Object.values(data)[0]?.[0] || "No se pudo actualizar empresa");
    }

    setError("");
    loadOwnerData();
  }

  async function markOrganizationFiscalIssued() {
    if (!organizationEditForm.id) return;
    const response = await request(`/api/organizations/${organizationEditForm.id}/mark-fiscal-issued/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo marcar documento fiscal");
    }

    setError("");
    loadOwnerData();
  }

  async function createEstablishment(event) {
    event.preventDefault();
    const response = await request("/api/establishments/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: establishmentForm.name,
        organization: Number(establishmentForm.organization),
        address: establishmentForm.address,
        city: establishmentForm.city,
        open_time: establishmentForm.open_time || null,
        close_time: establishmentForm.close_time || null,
        weekly_hours: establishmentForm.weekly_hours || createEmptyWeeklyHours(),
      }),
    });
    if (!response.ok) return setError("No se pudo crear establecimiento");
    setEstablishmentForm({ name: "", organization: "", address: "", city: "", open_time: "", close_time: "", weekly_hours: createEmptyWeeklyHours() });
    setEstablishmentEditorOpen(false);
    loadOwnerData();
  }

  function startEditEstablishment(establishment) {
    setEstablishmentEditId(String(establishment.id));
    setEstablishmentEditorMode("edit");
    setEstablishmentEditorOpen(true);
    setEstablishmentEditForm({
      name: establishment.name || "",
      organization: String(establishment.organization || ""),
      address: establishment.address || "",
      city: establishment.city || "",
      open_time: normalizeTimeValue(establishment.open_time),
      close_time: normalizeTimeValue(establishment.close_time),
      weekly_hours: normalizeWeeklyHours(establishment.weekly_hours, establishment.open_time, establishment.close_time),
      is_active: !!establishment.is_active,
    });
  }

  function cancelEditEstablishment() {
    setEstablishmentEditId("");
    setEstablishmentEditorOpen(false);
    setEstablishmentEditForm({
      name: "",
      organization: "",
      address: "",
      city: "",
      open_time: "",
      close_time: "",
      weekly_hours: createEmptyWeeklyHours(),
      is_active: true,
    });
  }

  function updateWeeklyHoursField(target, dayKey, field, value) {
    if (target === "create") {
      setEstablishmentForm((prev) => ({
        ...prev,
        weekly_hours: {
          ...(prev.weekly_hours || createEmptyWeeklyHours()),
          [dayKey]: {
            ...((prev.weekly_hours || createEmptyWeeklyHours())[dayKey] || {}),
            [field]: value,
          },
        },
      }));
      return;
    }

    setEstablishmentEditForm((prev) => ({
      ...prev,
      weekly_hours: {
        ...(prev.weekly_hours || createEmptyWeeklyHours()),
        [dayKey]: {
          ...((prev.weekly_hours || createEmptyWeeklyHours())[dayKey] || {}),
          [field]: value,
        },
      },
    }));
  }

  function formatWeeklyHours(weeklyHours, openTime = "", closeTime = "") {
    const source = normalizeWeeklyHours(weeklyHours, openTime, closeTime);
    const lines = WEEK_DAY_OPTIONS.map((day) => {
      const row = source[day.key] || {};
      if (!row.enabled) return `${day.label}: cerrado`;
      const morning = row.morning_start && row.morning_end ? `${row.morning_start}-${row.morning_end}` : "";
      const afternoon = row.afternoon_start && row.afternoon_end ? `${row.afternoon_start}-${row.afternoon_end}` : "";
      const shifts = [morning, afternoon].filter(Boolean).join(" / ");
      return `${day.label}: ${shifts || "abierto"}`;
    });
    return lines;
  }

  function formatWeeklyHoursCompact(establishment) {
    const source = normalizeWeeklyHours(establishment.weekly_hours, establishment.open_time, establishment.close_time);
    const dayShort = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

    const getRangeLabel = (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return dayShort[fromIndex];
      return `${dayShort[fromIndex]}-${dayShort[toIndex]}`;
    };

    const getShiftLabel = (row) => {
      const morning = row.morning_start && row.morning_end ? `${row.morning_start}-${row.morning_end}` : "";
      const afternoon = row.afternoon_start && row.afternoon_end ? `${row.afternoon_start}-${row.afternoon_end}` : "";
      const shifts = [morning, afternoon].filter(Boolean);
      return shifts.length ? shifts.join(" / ") : "Abierto";
    };

    const rows = WEEK_DAY_OPTIONS.map((day, index) => ({
      index,
      enabled: !!source[day.key]?.enabled,
      shift: source[day.key] ? getShiftLabel(source[day.key]) : "Abierto",
    }));

    const groups = [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (!last || last.enabled !== row.enabled || (row.enabled && last.shift !== row.shift)) {
        groups.push({
          from: row.index,
          to: row.index,
          enabled: row.enabled,
          shift: row.shift,
        });
      } else {
        last.to = row.index;
      }
    }

    const openGroups = groups
      .filter((group) => group.enabled)
      .map((group) => `${getRangeLabel(group.from, group.to)}: ${group.shift}`);
    const closedGroups = groups
      .filter((group) => !group.enabled)
      .map((group) => getRangeLabel(group.from, group.to));

    return {
      openText: openGroups.length ? openGroups.join(" | ") : "Sin horarios cargados",
      closedText: closedGroups.length ? `Cerrado: ${closedGroups.join(", ")}` : "",
    };
  }

  function openBranchRooms(establishment) {
    setSelectedEstablishmentForRooms(String(establishment.id));
    setRoomForm({
      establishment: String(establishment.id),
      name: "",
      room_type: "",
      capacity: "1",
      is_active: true,
    });
    cancelEditRoom();
  }

  async function saveEstablishment(establishmentId) {
    const response = await request(`/api/establishments/${establishmentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: establishmentEditForm.name.trim(),
        organization: Number(establishmentEditForm.organization),
        address: establishmentEditForm.address,
        city: establishmentEditForm.city,
        open_time: establishmentEditForm.open_time || null,
        close_time: establishmentEditForm.close_time || null,
        weekly_hours: establishmentEditForm.weekly_hours || createEmptyWeeklyHours(),
        is_active: establishmentEditForm.is_active,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || Object.values(data)[0]?.[0] || "No se pudo editar sede");
    }

    setError("");
    cancelEditEstablishment();
    loadOwnerData();
  }

  async function deleteEstablishment(establishmentId) {
    const confirmed = window.confirm("¿Eliminar sede? Esta accion no se puede deshacer.");
    if (!confirmed) return;

    const response = await request(`/api/establishments/${establishmentId}/`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo eliminar sede");
    }

    setError("");
    if (String(establishmentId) === establishmentEditId) cancelEditEstablishment();
    if (String(establishmentId) === String(selectedEstablishmentForRooms)) {
      setSelectedEstablishmentForRooms("");
      cancelEditRoom();
      setRoomForm({ establishment: "", name: "", room_type: "", capacity: "1", is_active: true });
    }
    loadOwnerData();
  }

  async function createRoom(event) {
    event.preventDefault();
    const response = await request("/api/rooms/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment: Number(roomForm.establishment),
        name: roomForm.name,
        room_type: roomForm.room_type,
        capacity: Number(roomForm.capacity),
        is_active: roomForm.is_active,
      }),
    });
    if (!response.ok) return setError("No se pudo crear salon");
    setRoomForm({
      establishment: selectedEstablishmentForRooms || "",
      name: "",
      room_type: "",
      capacity: "1",
      is_active: true,
    });
    loadOwnerData();
  }

  function startEditRoom(room) {
    setRoomEditId(String(room.id));
    setRoomEditForm({
      establishment: String(room.establishment || ""),
      name: room.name || "",
      room_type: room.room_type || "",
      capacity: String(room.capacity || "1"),
      is_active: !!room.is_active,
      is_blocked: !!room.is_blocked,
      blocked_reason: room.blocked_reason || "",
      blocked_from: room.blocked_from ? String(room.blocked_from).slice(0, 16) : "",
      blocked_to: room.blocked_to ? String(room.blocked_to).slice(0, 16) : "",
    });
  }

  function cancelEditRoom() {
    setRoomEditId("");
    setRoomEditForm({
      establishment: "",
      name: "",
      room_type: "",
      capacity: "1",
      is_active: true,
      is_blocked: false,
      blocked_reason: "",
      blocked_from: "",
      blocked_to: "",
    });
  }

  async function saveRoom(roomId) {
    const response = await request(`/api/rooms/${roomId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        establishment: Number(roomEditForm.establishment),
        name: roomEditForm.name,
        room_type: roomEditForm.room_type,
        capacity: Number(roomEditForm.capacity),
        is_active: roomEditForm.is_active,
        is_blocked: roomEditForm.is_blocked,
        blocked_reason: roomEditForm.blocked_reason,
        blocked_from: roomEditForm.blocked_from || null,
        blocked_to: roomEditForm.blocked_to || null,
      }),
    });
    if (!response.ok) return setError("No se pudo editar salon");
    cancelEditRoom();
    loadOwnerData();
  }

  async function deleteRoom(roomId) {
    const confirmed = window.confirm("¿Eliminar salon? Esta accion no se puede deshacer.");
    if (!confirmed) return;
    const response = await request(`/api/rooms/${roomId}/`, { method: "DELETE" });
    if (!response.ok) return setError("No se pudo eliminar salon");
    if (String(roomId) === roomEditId) cancelEditRoom();
    loadOwnerData();
  }

  async function blockRoom(roomId, reason, blockedFrom = "", blockedTo = "") {
    const response = await request(`/api/rooms/${roomId}/block/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        blocked_from: blockedFrom || null,
        blocked_to: blockedTo || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo bloquear salon");
    }
    loadOwnerData();
  }

  async function unblockRoom(roomId) {
    const response = await request(`/api/rooms/${roomId}/unblock/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return setError(data.detail || "No se pudo desbloquear salon");
    }
    loadOwnerData();
  }

  function getRoomStatus(room) {
    if (!room.is_active) return "Inactivo";
    if (!room.is_blocked) return "Disponible";
    const from = room.blocked_from ? ` desde ${String(room.blocked_from).slice(0, 16)}` : "";
    const to = room.blocked_to ? ` hasta ${String(room.blocked_to).slice(0, 16)}` : "";
    return `Bloqueado${from}${to}`;
  }

  function applyClassFormRoom(roomId) {
    const selected = classFormRooms.find((room) => String(room.id) === String(roomId));
    setClassForm((prev) => {
      if (!selected) return { ...prev, room: roomId, capacity: prev.capacity || "1" };
      const roomCapacity = String(selected.capacity || 1);
      return { ...prev, room: roomId, capacity: roomCapacity };
    });
  }

  function applyClassEditRoom(roomId) {
    const selected = classEditRooms.find((room) => String(room.id) === String(roomId));
    setClassEditForm((prev) => {
      if (!selected) return { ...prev, room: roomId, capacity: prev.capacity || "1" };
      const roomCapacity = String(selected.capacity || 1);
      return { ...prev, room: roomId, capacity: roomCapacity };
    });
  }

  async function createClass(event) {
    event.preventDefault();
    if (!classForm.name.trim()) return setError("Nombre de clase es requerido");
    if (!classForm.organization) return setError("Selecciona una empresa");
    if (!classForm.establishment) return setError("Selecciona una sede");
    if (!classForm.start_at || !classForm.end_at) return setError("Completa inicio y fin de la clase");

    const startDate = new Date(classForm.start_at);
    const endDate = new Date(classForm.end_at);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return setError("El horario es invalido: fin debe ser mayor al inicio");
    }

    const numericCapacity = Number(classForm.capacity || 0);
    if (!Number.isFinite(numericCapacity) || numericCapacity < 1) {
      return setError("La capacidad debe ser mayor a 0");
    }
    if (selectedClassRoom && numericCapacity > Number(selectedClassRoom.capacity || 0)) {
      return setError(`La capacidad no puede superar ${selectedClassRoom.capacity} (salon seleccionado)`);
    }

    const payload = {
      organization: Number(classForm.organization),
      establishment: Number(classForm.establishment),
      room: classForm.room ? Number(classForm.room) : null,
      instructor: classForm.instructor ? Number(classForm.instructor) : null,
      name: classForm.name.trim(),
      start_at: toApiDateTime(classForm.start_at),
      end_at: toApiDateTime(classForm.end_at),
      capacity: numericCapacity,
    };
    const response = await request("/api/classes/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo crear clase"));
    setClassForm({ organization: "", establishment: "", room: "", instructor: "", name: "", start_at: "", end_at: "", capacity: "1" });
    setError("");
    loadOwnerData();
  }

  async function assignClassInstructor(classId, instructorId) {
    const response = await request(`/api/classes/${classId}/assign-instructor/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructor_id: Number(instructorId) }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo asignar instructor"));
    setError("");
    loadOwnerData();
  }

  async function assignClassRoom(classId, roomId) {
    const response = await request(`/api/classes/${classId}/assign-room/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: Number(roomId) }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo asignar salon"));
    setError("");
    loadOwnerData();
  }

  async function cancelClass(classId) {
    const response = await request(`/api/classes/${classId}/cancel/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo cancelar clase"));
    setError("");
    if (String(classId) === String(classEditId)) cancelEditClass();
    loadOwnerData();
  }

  function startEditClass(studioClass) {
    setClassEditId(String(studioClass.id));
    setClassEditForm({
      organization: String(studioClass.organization || ""),
      establishment: String(studioClass.establishment || ""),
      room: String(studioClass.room || ""),
      instructor: String(studioClass.instructor || ""),
      name: studioClass.name || "",
      start_at: normalizeDateTimeLocal(studioClass.start_at),
      end_at: normalizeDateTimeLocal(studioClass.end_at),
      capacity: String(studioClass.capacity || "1"),
    });
  }

  function cancelEditClass() {
    setClassEditId("");
    setClassEditForm({
      organization: "",
      establishment: "",
      room: "",
      instructor: "",
      name: "",
      start_at: "",
      end_at: "",
      capacity: "1",
    });
  }

  async function saveClass(classId) {
    if (!classEditForm.name.trim()) return setError("Nombre de clase es requerido");
    if (!classEditForm.organization) return setError("Selecciona una empresa");
    if (!classEditForm.establishment) return setError("Selecciona una sede");
    if (!classEditForm.start_at || !classEditForm.end_at) return setError("Completa inicio y fin de la clase");

    const startDate = new Date(classEditForm.start_at);
    const endDate = new Date(classEditForm.end_at);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return setError("El horario es invalido: fin debe ser mayor al inicio");
    }

    const numericCapacity = Number(classEditForm.capacity || 0);
    if (!Number.isFinite(numericCapacity) || numericCapacity < 1) {
      return setError("La capacidad debe ser mayor a 0");
    }
    if (selectedClassEditRoom && numericCapacity > Number(selectedClassEditRoom.capacity || 0)) {
      return setError(`La capacidad no puede superar ${selectedClassEditRoom.capacity} (salon seleccionado)`);
    }

    const payload = {
      organization: Number(classEditForm.organization),
      establishment: Number(classEditForm.establishment),
      room: classEditForm.room ? Number(classEditForm.room) : null,
      instructor: classEditForm.instructor ? Number(classEditForm.instructor) : null,
      name: classEditForm.name.trim(),
      start_at: toApiDateTime(classEditForm.start_at),
      end_at: toApiDateTime(classEditForm.end_at),
      capacity: numericCapacity,
    };

    const response = await request(`/api/classes/${classId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo editar clase"));
    setError("");
    cancelEditClass();
    loadOwnerData();
  }

  function canEditStudioClass(studioClass) {
    if (studioClass.status === "canceled") return false;
    if (isOwnerRole) return true;
    if (isInstructorRole) return Number(studioClass.instructor || 0) === Number(me?.id || 0);
    return false;
  }

  function canCancelStudioClass(studioClass) {
    if (studioClass.status === "canceled") return false;
    if (isOwnerRole) return true;
    if (isInstructorRole) return Number(studioClass.instructor || 0) === Number(me?.id || 0);
    return false;
  }

  async function createMembershipPlan(event) {
    event.preventDefault();
    const payload = {
      organization: Number(membershipPlanForm.organization),
      name: membershipPlanForm.name.trim(),
      description: membershipPlanForm.description.trim(),
      price: Number(membershipPlanForm.price),
      currency: membershipPlanForm.currency || "ARS",
      duration_days: Number(membershipPlanForm.duration_days || 30),
      classes_per_week: membershipPlanForm.classes_per_week ? Number(membershipPlanForm.classes_per_week) : null,
    };
    const response = await request("/api/membership-plans/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo crear el plan"));
    setMembershipPlanForm({
      organization: "",
      name: "",
      description: "",
      price: "",
      currency: "ARS",
      duration_days: "30",
      classes_per_week: "",
    });
    setError("");
    loadOwnerData();
  }

  async function createOwnerPayment(event) {
    event.preventDefault();
    const payload = {
      organization: Number(paymentForm.organization),
      student: paymentForm.student ? Number(paymentForm.student) : null,
      payment_type: paymentForm.payment_type,
      studio_class: paymentForm.payment_type === "class_single" && paymentForm.studio_class ? Number(paymentForm.studio_class) : null,
      membership_plan: paymentForm.payment_type === "membership" && paymentForm.membership_plan ? Number(paymentForm.membership_plan) : null,
      amount: Number(paymentForm.amount),
      currency: paymentForm.currency || "ARS",
      provider: paymentForm.provider || "mercadopago",
      payer_name: paymentForm.payer_name.trim(),
      payer_email: paymentForm.payer_email.trim(),
      description: paymentForm.description.trim(),
      status: paymentForm.provider === "manual" ? "approved" : "pending",
    };
    const response = await request("/api/payments/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo registrar el pago"));
    const created = await response.json();
    if (created.checkout_url && paymentForm.provider === "mercadopago") {
      window.open(created.checkout_url, "_blank", "noopener,noreferrer");
    }
    setPaymentForm({
      organization: "",
      student: "",
      payment_type: "class_single",
      studio_class: "",
      membership_plan: "",
      amount: "",
      currency: "ARS",
      provider: "mercadopago",
      payer_name: "",
      payer_email: "",
      description: "",
    });
    setError("");
    loadOwnerData();
  }

  async function createStudentPayment(event) {
    event.preventDefault();
    const payload = {
      organization: Number(studentPaymentForm.organization),
      payment_type: studentPaymentForm.payment_type,
      studio_class:
        studentPaymentForm.payment_type === "class_single" && studentPaymentForm.studio_class
          ? Number(studentPaymentForm.studio_class)
          : null,
      membership_plan:
        studentPaymentForm.payment_type === "membership" && studentPaymentForm.membership_plan
          ? Number(studentPaymentForm.membership_plan)
          : null,
      amount: Number(studentPaymentForm.amount),
      currency: studentPaymentForm.currency || "ARS",
      payer_name: studentPaymentForm.payer_name.trim() || me?.username || "",
      payer_email: studentPaymentForm.payer_email.trim() || me?.email || "",
      description: studentPaymentForm.description.trim(),
    };
    const response = await request("/api/payments/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo iniciar el pago"));
    const created = await response.json();
    if (created.checkout_url) {
      window.open(created.checkout_url, "_blank", "noopener,noreferrer");
    }
    setStudentPaymentForm({
      organization: "",
      payment_type: "class_single",
      studio_class: "",
      membership_plan: "",
      amount: "",
      currency: "ARS",
      payer_name: "",
      payer_email: "",
      description: "",
    });
    setError("");
    loadStudentData();
  }

  async function markPaymentAsPaid(paymentId) {
    const response = await request(`/api/payments/${paymentId}/mark-paid/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: `MANUAL-${paymentId}` }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo marcar el pago"));
    setError("");
    if (me?.portal === "platform_admin") loadPlatformAdminData();
    if (me?.portal === "owner") loadOwnerData();
  }

  async function emitPaymentInvoice(paymentId) {
    const response = await request(`/api/payments/${paymentId}/emit-invoice/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo emitir comprobante"));
    setError("");
    if (me?.portal === "platform_admin") loadPlatformAdminData();
    if (me?.portal === "owner") loadOwnerData();
  }

  async function simulateMercadoPagoWebhook(payment) {
    if (!payment.external_reference) return setError("El pago no tiene referencia externa");
    const response = await request("/api/payments/mercadopago/webhook/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        external_reference: payment.external_reference,
        status: "approved",
        payment_id: `MP-${payment.id}`,
      }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo simular webhook"));
    setError("");
    if (me?.portal === "platform_admin") loadPlatformAdminData();
    if (me?.portal === "owner") loadOwnerData();
    if (me?.portal === "student") loadStudentData();
  }

  async function createStudent(event) {
    event.preventDefault();
    if (!newStudent.organization) return setError("Selecciona organizacion");
    const response = await request("/api/students/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization: Number(newStudent.organization),
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        email: newStudent.email,
        phone: newStudent.phone,
        current_level: newStudent.current_level,
      }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo registrar alumno"));
    setNewStudent({ organization: "", first_name: "", last_name: "", email: "", phone: "", current_level: "" });
    loadOwnerData();
  }

  function startStudentEdition(student) {
    const establishmentIdsCsv = Array.isArray(student.establishments)
      ? student.establishments.map((est) => est.id).join(",")
      : "";
    setStudentEditForm({
      studentId: String(student.id),
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      email: student.email || "",
      phone: student.phone || "",
      current_level: student.current_level || "",
      notes: student.notes || "",
      is_active: !!student.is_active,
      establishmentIdsCsv,
    });
  }

  async function saveStudentEdition(event) {
    event.preventDefault();
    if (!studentEditForm.studentId) return setError("Selecciona alumno para editar");
    const establishmentIds = studentEditForm.establishmentIdsCsv
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const response = await request(`/api/students/${studentEditForm.studentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: studentEditForm.first_name,
        last_name: studentEditForm.last_name,
        email: studentEditForm.email,
        phone: studentEditForm.phone,
        current_level: studentEditForm.current_level,
        notes: studentEditForm.notes,
        is_active: studentEditForm.is_active,
        establishment_ids: establishmentIds,
      }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo editar alumno"));
    setStudentEditForm({
      studentId: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      current_level: "",
      notes: "",
      is_active: true,
      establishmentIdsCsv: "",
    });
    loadOwnerData();
  }

  async function assignStudentToEstablishments(event) {
    event.preventDefault();
    const ids = assignForm.establishmentIdsCsv
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const response = await request(`/api/students/${assignForm.studentId}/assign-establishments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ establishment_ids: ids }),
    });
    if (!response.ok) return setError("No se pudo asignar alumno a sede");
    setAssignForm({ studentId: "", establishmentIdsCsv: "" });
    loadOwnerData();
  }

  async function loadStudentHistory(studentId) {
    setSelectedStudentId(String(studentId));
    const response = await request(`/api/students/${studentId}/history/`);
    if (!response.ok) return setError("No se pudo cargar historial");
    setHistoryEvents(await response.json());
  }

  async function addHistoryNote(event) {
    event.preventDefault();
    const response = await request(`/api/students/${selectedStudentId}/add-history-note/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: historyNote }),
    });
    if (!response.ok) return setError("No se pudo agregar historial");
    setHistoryNote("");
    loadStudentHistory(selectedStudentId);
  }

  async function joinMarketplaceOrganization(event) {
    event.preventDefault();
    if (!joinMarketplaceForm.organization_id) return setError("Selecciona una empresa");

    const response = await request("/api/students/join-organization/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: Number(joinMarketplaceForm.organization_id),
        first_name: joinMarketplaceForm.first_name || undefined,
        last_name: joinMarketplaceForm.last_name || undefined,
        phone: joinMarketplaceForm.phone || undefined,
        current_level: joinMarketplaceForm.current_level || undefined,
      }),
    });
    if (!response.ok) return setError(await extractErrorMessage(response, "No se pudo asociar a la empresa"));
    setJoinMarketplaceForm({
      organization_id: "",
      first_name: "",
      last_name: "",
      phone: "",
      current_level: "",
    });
    setError("");
    loadStudentData();
  }

  function logout() {
    setToken("");
    setMe(null);
    setSummary(null);
    setStudentProfiles([]);
    persistSSOCallbackState(null);
    setError("");
    navigate(PATH_LOGIN, true);
  }

  function backToLoginFromSSOCallback() {
    persistSSOCallbackState(null);
    setLoginModalOpen(true);
    navigate(PATH_LOGIN, true);
  }

  useEffect(() => {
    if (token && me) loadPortalData();
  }, [token, me]);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("nila_discover_geo_cache_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const sanitized = {};
      Object.entries(parsed).forEach(([key, value]) => {
        const lat = Number(value?.lat);
        const lon = Number(value?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        sanitized[key] = { lat, lon };
        discoverCenterGeoTriedRef.current.add(key);
      });
      discoverCenterGeoStorageRef.current = sanitized;
      setDiscoverCenterGeoMap((prev) => ({ ...sanitized, ...prev }));
    } catch (_error) {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!isDiscoverPath(pathname)) return;
    if (discoverLocationStatus !== "idle") return;
    requestDiscoverLocation();
  }, [pathname, discoverLocationStatus]);

  useEffect(() => {
    if (!isDiscoverPath(pathname)) return;
    if (!marketplaceCenters.length) return;

    let cancelled = false;
    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const geocodeCenter = async (center) => {
      const query = [center.address, center.city, center.name, center.organization_name, "Argentina"]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", ");
      if (!query) return null;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "es-AR",
          },
        }
      );
      if (!response.ok) return null;
      const payload = await response.json().catch(() => []);
      if (!Array.isArray(payload) || !payload.length) return null;
      const lat = Number(payload[0]?.lat);
      const lon = Number(payload[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    };

    const run = async () => {
      setDiscoverCenterGeoLoading(true);
      const updates = {};

      for (const center of marketplaceCenters) {
        if (cancelled) break;
        const cacheKey = center.key;
        if (discoverCenterGeoTriedRef.current.has(cacheKey)) continue;
        discoverCenterGeoTriedRef.current.add(cacheKey);

        const cached = discoverCenterGeoStorageRef.current[cacheKey];
        if (cached) {
          updates[cacheKey] = cached;
          continue;
        }

        if (!center.address && !center.city) continue;

        try {
          const geo = await geocodeCenter(center);
          if (geo) {
            updates[cacheKey] = geo;
            discoverCenterGeoStorageRef.current[cacheKey] = geo;
          }
        } catch (_error) {
          // no-op
        }
        await sleep(120);
      }

      if (!cancelled && Object.keys(updates).length) {
        setDiscoverCenterGeoMap((prev) => {
          const merged = { ...prev, ...updates };
          try {
            window.localStorage.setItem("nila_discover_geo_cache_v1", JSON.stringify({ ...discoverCenterGeoStorageRef.current, ...updates }));
          } catch (_error) {
            // no-op
          }
          return merged;
        });
      }
      if (!cancelled) setDiscoverCenterGeoLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [pathname, marketplaceCenters]);

  useEffect(() => {
    if (!isDiscoverPath(pathname)) return;
    if (!discoverCenters.length) {
      if (discoverSelectedCenterKey) setDiscoverSelectedCenterKey("");
      return;
    }

    const hasSelected = discoverCenters.some((center) => String(center.key) === String(discoverSelectedCenterKey));
    if (hasSelected) return;

    const nearestWithGeo = nearestDiscoverCenter?.geo ? nearestDiscoverCenter : null;
    const firstWithGeo = discoverCenters.find((center) => center.geo) || null;
    const fallback = nearestWithGeo || firstWithGeo || discoverCenters[0] || null;
    if (fallback) setDiscoverSelectedCenterKey(String(fallback.key));
  }, [pathname, discoverCenters, discoverSelectedCenterKey, nearestDiscoverCenter]);

  useEffect(() => {
    if (!ownerOrganization) return;
    const allowedKeys = new Set(OWNER_MODULE_CATALOG.map((m) => m.key));
    const normalizedModules = Array.isArray(ownerOrganization.enabled_modules)
      ? ownerOrganization.enabled_modules.filter((key) => allowedKeys.has(key))
      : [];
    setOrganizationEditForm({
      id: ownerOrganization.id,
      name: ownerOrganization.name || "",
      logo: ownerOrganization.logo || "",
      legal_name: ownerOrganization.legal_name || "",
      tax_id: ownerOrganization.tax_id || "",
      address: ownerOrganization.address || "",
      tax_condition: ownerOrganization.tax_condition || "",
      enabled_modules: normalizedModules.length ? normalizedModules : OWNER_MODULE_CATALOG.map((m) => m.key),
      fiscal_document_issued: !!ownerOrganization.fiscal_document_issued,
      mercadolibre_enabled: !!ownerOrganization.mercadolibre_enabled,
      electronic_billing_enabled: !!ownerOrganization.electronic_billing_enabled,
      fiscal_street: ownerOrganization.fiscal_street || "",
      fiscal_street_number: ownerOrganization.fiscal_street_number || "",
      fiscal_floor: ownerOrganization.fiscal_floor || "",
      fiscal_apartment: ownerOrganization.fiscal_apartment || "",
      fiscal_city: ownerOrganization.fiscal_city || "",
      fiscal_province: ownerOrganization.fiscal_province || "",
      fiscal_postal_code: ownerOrganization.fiscal_postal_code || "",
      activity_start_date: ownerOrganization.activity_start_date || "",
      main_activity_code: ownerOrganization.main_activity_code || "",
      fiscal_email: ownerOrganization.fiscal_email || "",
      fiscal_phone: ownerOrganization.fiscal_phone || "",
      iibb_number: ownerOrganization.iibb_number || "",
      iibb_type: ownerOrganization.iibb_type || "",
      iibb_jurisdiction: ownerOrganization.iibb_jurisdiction || "",
      iibb_condition: ownerOrganization.iibb_condition || "",
      afip_pos_number: ownerOrganization.afip_pos_number || "",
      afip_pos_billing_system: ownerOrganization.afip_pos_billing_system || "",
      afip_pos_address: ownerOrganization.afip_pos_address || "",
      wsaa_certificate_alias: ownerOrganization.wsaa_certificate_alias || "",
      afip_environment: ownerOrganization.afip_environment || "",
    });
  }, [ownerOrganization?.id]);

  useEffect(() => {
    if (me?.portal !== "owner") return;
    if (ownerModule === "launcher") return;
    if (enabledOwnerModules.some((module) => module.key === ownerModule)) return;
    setOwnerModule("launcher");
  }, [enabledOwnerModules, ownerModule, me?.portal]);

  useEffect(() => {
    if (me?.portal !== "platform_admin") return;
    if (!organizations.length) return;
    const hasSelected = organizations.some((org) => String(org.id) === String(adminOrgConfig.organizationId));
    if (!hasSelected) {
      selectAdminOrganizationConfig(String(organizations[0].id));
    }
  }, [me?.portal, organizations, adminOrgConfig.organizationId]);

  useEffect(() => {
    const onPopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (normalizePath(pathname) !== PATH_DISCOVER_ALIAS) return;
    navigate(PATH_DISCOVER, true);
  }, [pathname]);

  useEffect(() => {
    setHelpOpen(false);
  }, [pathname, ownerModule]);

  useEffect(() => {
    const onAccessibilityShortcut = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "u") {
        event.preventDefault();
        setHelpOpen(false);
        setAccessibilityOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onAccessibilityShortcut);
    return () => window.removeEventListener("keydown", onAccessibilityShortcut);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-screen-reader", accessibilityState.screenReader);
    root.classList.toggle("a11y-bigger-text", accessibilityState.biggerText);
    root.classList.toggle("a11y-high-contrast", accessibilityState.highContrast);
    root.classList.toggle("a11y-text-spacing", accessibilityState.textSpacing);
    root.classList.toggle("a11y-highlight-links", accessibilityState.highlightLinks);
    root.classList.toggle("a11y-pause-animations", accessibilityState.pauseAnimations);
    root.classList.toggle("a11y-hide-images", accessibilityState.hideImages);
    root.classList.toggle("a11y-dyslexia-font", accessibilityState.dyslexiaFont);
    root.classList.toggle("a11y-bigger-cursor", accessibilityState.biggerCursor);
  }, [accessibilityState]);

  useEffect(() => {
    if (!accessibilityState.screenReader) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setScreenReaderStatus("");
      return;
    }
    if (!window.speechSynthesis) {
      setScreenReaderStatus("Este navegador no soporta lectura por voz.");
      return;
    }

    const synth = window.speechSynthesis;
    const extractReadableText = (target) => {
      if (!(target instanceof HTMLElement)) return "";
      return (
        target.getAttribute("aria-label") ||
        target.getAttribute("title") ||
        target.innerText ||
        target.textContent ||
        target.getAttribute("placeholder") ||
        target.getAttribute("alt") ||
        ""
      );
    };

    const onFocusIn = (event) => {
      speakText(extractReadableText(event.target));
    };
    const onClick = (event) => {
      speakText(extractReadableText(event.target));
    };
    const onVoicesChanged = () => {
      setScreenReaderStatus("Voces cargadas.");
    };

    window.setTimeout(() => speakText("Screen reader activado"), 120);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onClick, true);
    synth.addEventListener("voiceschanged", onVoicesChanged);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onClick, true);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      synth.cancel();
    };
  }, [accessibilityState.screenReader]);

  useEffect(() => {
    if (!token) return;
    if (!me) return;
    if (isDiscoverPath(pathname)) return;

    const expectedPath = getPathByPortal(me.portal);
    if (pathname !== expectedPath) navigate(expectedPath, true);
  }, [token, me, pathname]);

  const helpContextKey = useMemo(() => {
    if (isSSOCallbackPath(pathname)) return "sso";
    if (isDiscoverPath(pathname)) return "discover";
    if (isAboutPath(pathname)) return "about";
    if (isPricingPath(pathname)) return "pricing";

    const portal = getPortalByPath(pathname);
    if (!token || !portal) return "login";
    if (portal === "platform_admin") return "admin";
    if (portal === "student") return "student";
    if (portal === "owner") {
      if (ownerModule === "launcher") return "owner_launcher";
      if (ownerModule === "configuracion") return "owner_configuracion";
      if (ownerModule === "clases") return "owner_clases";
      if (ownerModule === "alumnos") return "owner_alumnos";
      if (ownerModule === "pos") return "owner_pos";
      return "owner_default";
    }
    return "login";
  }, [pathname, token, ownerModule]);

  const helpContent = HELP_MENU_CONTENT[helpContextKey] || HELP_MENU_CONTENT.login;

  function getHelpActions() {
    if (helpContextKey === "discover") {
      return [
        { label: "Usar mi ubicacion", action: requestDiscoverLocation },
        { label: "Login empresas", action: openCompanyLogin },
      ];
    }
    if (helpContextKey === "login" || helpContextKey === "about" || helpContextKey === "pricing") {
      return [
        { label: "Login empresas", action: openCompanyLogin },
        { label: "Descubrir centros", action: openFindCenter },
      ];
    }
    if (helpContextKey === "admin" || helpContextKey.startsWith("owner_") || helpContextKey === "student") {
      return [{ label: "Ir a inicio", action: () => navigate(PATH_LOGIN, true) }];
    }
    return [];
  }

  const renderPublicHeader = (activeKey = "") => (
    <header className="landing-menu-shell">
      <div className="landing-menu-primary">
        <div className="landing-brand">NILA</div>
        <nav className="landing-nav-links" aria-label="Navegacion principal">
          <button
            type="button"
            className={`landing-nav-link ${activeKey === "about" ? "active" : ""}`}
            onClick={openAbout}
          >
            Quienes somos
          </button>
          <button
            type="button"
            className={`landing-nav-link ${activeKey === "pricing" ? "active" : ""}`}
            onClick={openPricing}
          >
            Precios y planes
          </button>
          <button type="button" className="landing-nav-link" onClick={openCompanyLogin}>
            Login empresas
          </button>
          <button type="button" className="landing-nav-link" onClick={openStudentLogin}>
            Login alumnos
          </button>
          <button
            type="button"
            className={`landing-nav-link ${activeKey === "discover" ? "active" : ""}`}
            onClick={openFindCenter}
          >
            Buscar tu centro mas cercano
          </button>
        </nav>
        <button type="button" className="landing-cta-btn" onClick={openCompanyLogin}>
          Ingresar
        </button>
      </div>
    </header>
  );

  const renderDiscoverCenters = (
    <section className="marketing-login discover-page">
      {renderPublicHeader("discover")}

      <main className="discover-shell">
        <section className="discover-hero-card">
          <p className="eyebrow">Marketplace publico</p>
          <h1>Descubri centros cercanos</h1>
          <p>
            Explora estudios y sucursales activas sin iniciar sesion. Ordenamos por cercania usando la geolocalizacion
            de tu dispositivo y tambien puedes filtrar por nombre, direccion o ciudad.
          </p>
          <div className="discover-toolbar">
            <input
              value={discoverSearch}
              onChange={(event) => setDiscoverSearch(event.target.value)}
              placeholder="Buscar por centro, ciudad o direccion..."
            />
            <button
              type="button"
              className="secondary-btn"
              onClick={requestDiscoverLocation}
              disabled={discoverLocationStatus === "loading"}
            >
              {discoverLocationStatus === "loading" ? "Buscando ubicacion..." : "Usar mi ubicacion"}
            </button>
          </div>
          {discoverLocationMessage ? (
            <p className={`discover-location-note ${discoverLocationStatus === "error" ? "error" : "ok"}`}>
              {discoverLocationMessage}
            </p>
          ) : null}
          {nearestDiscoverCenter ? (
            <p className="discover-location-note">
              Centro mas cercano: <strong>{nearestDiscoverCenter.name}</strong> ({nearestDiscoverCenter.organization_name}) a{" "}
              <strong>{formatDistanceLabel(nearestDiscoverCenter.distanceKm)}</strong>.
            </p>
          ) : null}
          {discoverCenterGeoLoading ? <p className="discover-location-note">Calculando coordenadas de sucursales...</p> : null}
        </section>

        <section className="discover-map-layout">
          <article className="discover-map-card">
            <div className="discover-map-head">
              <h3>Mapa de centros</h3>
              <p>Selecciona un punto del mapa para ver detalle y abrir Google Maps.</p>
            </div>
            <DiscoverCentersMap
              centers={discoverCenters}
              userCoords={discoverUserCoords}
              selectedCenterKey={discoverSelectedCenterKey}
              onSelectCenter={setDiscoverSelectedCenterKey}
            />
            {selectedDiscoverCenter ? (
              <div className="discover-map-selected">
                <h4>{selectedDiscoverCenter.name}</h4>
                <p className="discover-org-name">{selectedDiscoverCenter.organization_name}</p>
                <p className="discover-address">{getCenterAddressLabel(selectedDiscoverCenter)}</p>
                <div className="discover-map-actions">
                  <a
                    href={buildGoogleMapsDirectionsUrl(selectedDiscoverCenter, discoverUserCoords)}
                    target="_blank"
                    rel="noreferrer"
                    className="map-link-btn"
                  >
                    Como llegar
                  </a>
                  <a
                    href={buildGoogleMapsPlaceUrl(selectedDiscoverCenter)}
                    target="_blank"
                    rel="noreferrer"
                    className="map-link-btn secondary"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              </div>
            ) : (
              <p className="discover-location-note">Todavia no hay coordenadas para mostrar en el mapa.</p>
            )}
          </article>

          <section className="discover-results-grid">
            {discoverCenters.length === 0 ? (
              <article className="discover-center-card">
                <h3>Sin resultados</h3>
                <p>No encontramos centros con ese criterio. Prueba otra busqueda.</p>
              </article>
            ) : (
              discoverCenters.map((center) => {
                const scheduleSummary = formatWeeklyHoursCompact(center);
                const isSelected = String(discoverSelectedCenterKey) === String(center.key);
                return (
                  <article
                    key={`discover-center-${center.key}`}
                    className={`discover-center-card${isSelected ? " selected" : ""}`}
                  >
                    <div className="discover-center-head">
                      <h3>{center.name}</h3>
                      {Number.isFinite(center.distanceKm) ? (
                        <span className="distance-pill">{formatDistanceLabel(center.distanceKm)}</span>
                      ) : (
                        <span className="distance-pill muted">Sin distancia</span>
                      )}
                    </div>
                    <p className="discover-org-name">{center.organization_name}</p>
                    <p className="discover-address">{getCenterAddressLabel(center)}</p>
                    <p className="discover-schedule">{scheduleSummary.openText}</p>
                    {scheduleSummary.closedText ? <p className="discover-schedule">{scheduleSummary.closedText}</p> : null}
                    <div className="discover-card-actions discover-card-actions--split">
                      <button type="button" className="discover-map-btn" onClick={() => setDiscoverSelectedCenterKey(String(center.key))}>
                        Ver en mapa
                      </button>
                      <button type="button" onClick={() => openMarketplaceSignupForOrganization(center.organization_id)}>
                        Registrarme
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </section>
      </main>
    </section>
  );

  const renderAbout = (
    <section className="marketing-login discover-page">
      {renderPublicHeader("about")}
      <main className="discover-shell">
        <section className="discover-hero-card">
          <p className="eyebrow">NILA</p>
          <h1>Quienes somos</h1>
          <p>
            Somos una plataforma para estudios de pilates que conecta duenos, instructores y alumnos en una experiencia
            digital unificada: gestion operativa, pagos, clases y marketplace.
          </p>
        </section>

        <section className="public-info-grid">
          <article className="public-info-card">
            <h3>Nuestra mision</h3>
            <p>Digitalizar estudios de pilates con una experiencia premium, simple y escalable.</p>
          </article>
          <article className="public-info-card">
            <h3>Que resolvemos</h3>
            <p>Organizacion de sedes, salones, alumnos, clases, cobros y suscripciones desde un solo lugar.</p>
          </article>
          <article className="public-info-card">
            <h3>Para quien es</h3>
            <p>Estudios pequeños y cadenas multi-sede que buscan eficiencia y mejor experiencia para sus alumnos.</p>
          </article>
        </section>
      </main>
    </section>
  );

  const renderPricing = (
    <section className="marketing-login discover-page">
      {renderPublicHeader("pricing")}
      <main className="discover-shell">
        <section className="discover-hero-card">
          <p className="eyebrow">Planes</p>
          <h1>Precios y planes</h1>
          <p>Elige el plan segun el nivel de gestion que necesita tu estudio.</p>
        </section>

        <section className="pricing-grid">
          <article className="pricing-card">
            <p className="pricing-tag">Starter</p>
            <h3>Plan Base</h3>
            <strong>USD 29 / mes</strong>
            <ul className="list-clean">
              <li>1 empresa y hasta 2 sedes</li>
              <li>Gestion de alumnos y clases</li>
              <li>Portal de alumnos</li>
            </ul>
            <button type="button" onClick={openCompanyLogin}>Comenzar</button>
          </article>
          <article className="pricing-card featured">
            <p className="pricing-tag">Growth</p>
            <h3>Plan Profesional</h3>
            <strong>USD 79 / mes</strong>
            <ul className="list-clean">
              <li>Multi-sede y salones ilimitados</li>
              <li>POS, pagos y membresias</li>
              <li>Marketplace y reportes</li>
            </ul>
            <button type="button" onClick={openCompanyLogin}>Comenzar</button>
          </article>
          <article className="pricing-card">
            <p className="pricing-tag">Enterprise</p>
            <h3>Plan Corporativo</h3>
            <strong>A medida</strong>
            <ul className="list-clean">
              <li>Configuracion personalizada</li>
              <li>Integraciones avanzadas</li>
              <li>Soporte prioritario</li>
            </ul>
            <button type="button" onClick={openCompanyLogin}>Hablar con ventas</button>
          </article>
        </section>
      </main>
    </section>
  );

  const renderLogin = (
    <section className="marketing-login">
      {renderPublicHeader()}

      <section
        className="marketing-hero marketing-hero-cover"
        style={{ backgroundImage: `url(${LOGIN_COVER_IMAGE})` }}
      >
        <div className="marketing-overlay" />
        <div className="hero-layout">
          <div className="hero-copy">
            <p className="hero-kicker">Plataforma para estudios de pilates</p>
            <h1>Gestion premium para estudios, dueños y alumnos</h1>
            <p className="hero-description">
              Administra sedes, clases, alumnos y cobros desde una sola plataforma.
            </p>
            <div className="hero-actions">
              <button type="button" className="hero-primary-btn" onClick={openCompanyLogin}>
                Login empresas
              </button>
              <button type="button" className="hero-secondary-btn" onClick={openFindCenter}>
                Buscar centro
              </button>
            </div>
            <div className="hero-trust-row">
              <span>Marketplace activo</span>
              <span>SSO Google/Facebook</span>
              <span>Multi-sede</span>
            </div>
          </div>

          <aside className="hero-side-card">
            <h3>Accesos rapidos</h3>
            <button type="button" className="hero-side-action" onClick={openCompanyLogin}>
              Portal empresa
            </button>
            <button type="button" className="hero-side-action" onClick={openStudentLogin}>
              Portal alumno
            </button>
            <button type="button" className="hero-side-action" onClick={openFindCenter}>
              Descubrir centros
            </button>
            <div className="hero-side-metrics">
              <article>
                <strong>24/7</strong>
                <span>Reservas online</span>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-value-strip">
        <article className="value-tile">
          <h4>Para empresas</h4>
          <p>Configuracion de empresa, sedes, salones, facturacion y suscripciones.</p>
        </article>
        <article className="value-tile">
          <h4>Para alumnos</h4>
          <p>Registro por marketplace, reservas, pagos y acceso por SSO.</p>
        </article>
        <article className="value-tile">
          <h4>Marketplace</h4>
          <p>Busqueda de centros y onboarding guiado en una experiencia unificada.</p>
        </article>
      </section>

      {loginModalOpen ? (
        <div className="login-modal-backdrop" onClick={closeLoginModal}>
          <div className="hero-login-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeLoginModal} aria-label="Cerrar">×</button>
            <p className="eyebrow">Acceso a plataforma</p>
            <h2>Bienvenido a NILA</h2>
            <p className="subline">Accede con tus credenciales o crea tu cuenta en marketplace.</p>
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab-btn ${loginTab === "signin" ? "active" : ""}`}
                onClick={() => switchLoginTab("signin")}
              >
                Ingresar
              </button>
              <button
                type="button"
                className={`login-tab-btn ${loginTab === "signup" ? "active" : ""}`}
                onClick={() => switchLoginTab("signup")}
              >
                Crear cuenta
              </button>
            </div>

            {loginTab === "signin" ? (
              <>
                <div className="login-sso-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => loginWithSSO("google")}
                    disabled={!publicAuthConfig.allow_google_sso || !GOOGLE_CLIENT_ID}
                  >
                    Continuar con Google
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => loginWithSSO("facebook")}
                    disabled={!publicAuthConfig.allow_facebook_sso || !FACEBOOK_APP_ID}
                  >
                    Continuar con Facebook
                  </button>
                </div>
                <small className="login-config-hint">
                  {`Google client id: ${GOOGLE_CLIENT_ID ? "configurado" : "no configurado"} | Facebook app id: ${FACEBOOK_APP_ID ? "configurado" : "no configurado"}`}
                </small>
                <div className="login-separator">
                  <span>o con usuario y password</span>
                </div>
                <form onSubmit={login} className="login-form">
                  <label>
                    Usuario
                    <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
                  </label>
                  <label>
                    Password
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
                  </label>
                  <button type="submit">Ingresar</button>
                  <small>Demo: admin / admin1234 | Portales: /admin, /owner, /student</small>
                </form>
              </>
            ) : (
              <>
                {registerStep === 1 ? (
                  <form
                    className="login-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!registerStudentForm.organization_id) {
                        setError("Selecciona una empresa del marketplace");
                        return;
                      }
                      setError("");
                      setRegisterStep(2);
                    }}
                  >
                    <label>
                      Empresa del marketplace
                      <select
                        value={registerStudentForm.organization_id}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, organization_id: event.target.value }))}
                      >
                        <option value="">Seleccionar empresa</option>
                        {marketplaceOrganizations.map((org) => (
                          <option key={`market-org-${org.id}`} value={org.id}>
                            {org.name} {org.subscription_plan ? `(${org.subscription_plan})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="company-actions">
                      <button type="submit">Continuar</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={registerStudentFromMarketplace} className="login-form">
                    <p className="register-step-title">
                      Empresa seleccionada: <strong>{selectedMarketplaceOrganization?.name || "Sin empresa"}</strong>
                    </p>
                    <label>
                      Usuario
                      <input
                        value={registerStudentForm.username}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, username: event.target.value }))}
                        placeholder="Opcional"
                      />
                    </label>
                    <label>
                      Nombre
                      <input
                        value={registerStudentForm.first_name}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, first_name: event.target.value }))}
                        placeholder="Nombre"
                      />
                    </label>
                    <label>
                      Apellido
                      <input
                        value={registerStudentForm.last_name}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, last_name: event.target.value }))}
                        placeholder="Apellido"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={registerStudentForm.email}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="alumno@email.com"
                      />
                    </label>
                    <label>
                      Telefono
                      <input
                        value={registerStudentForm.phone}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+54..."
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        value={registerStudentForm.password}
                        onChange={(event) => setRegisterStudentForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Minimo 8 caracteres"
                      />
                    </label>
                    <div className="inline-group">
                      <button type="submit">Crear cuenta alumno</button>
                      <button type="button" className="secondary-btn" onClick={() => setRegisterStep(1)}>
                        Cambiar empresa
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderSSOCallback = (
    <main className="sso-callback-shell">
      <section className="sso-callback-card">
        <p className="eyebrow">SSO Callback</p>
        <h2>
          {ssoCallbackState?.status === "success"
            ? "Autenticacion completada"
            : "No pudimos completar el inicio de sesion"}
        </h2>
        <p className="subline">
          {ssoCallbackState?.message || "No hay informacion de callback disponible."}
        </p>
        <div className="sso-meta">
          <span>Proveedor: {ssoCallbackState?.provider || "-"}</span>
          <span>Codigo: {ssoCallbackState?.code || "-"}</span>
        </div>
        <div className="inline-group">
          {ssoCallbackState?.provider === "google" ? (
            <button type="button" onClick={() => loginWithSSO("google")}>
              Reintentar Google
            </button>
          ) : null}
          {ssoCallbackState?.provider === "facebook" ? (
            <button type="button" onClick={() => loginWithSSO("facebook")}>
              Reintentar Facebook
            </button>
          ) : null}
          <button type="button" className="secondary-btn" onClick={backToLoginFromSSOCallback}>
            Volver al login
          </button>
        </div>
      </section>
    </main>
  );

  const renderPlatformAdminPortal = (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <h1>Portal Administrador Global</h1>
          <p>Gestion centralizada de la plataforma completa.</p>
        </div>
        <button onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="portal-grid">
        <div className="panel-card">
          <h3>Configuracion global SSO</h3>
          <label className="stack-label">
            <input
              type="checkbox"
              checked={platformSettings.allow_google_sso}
              onChange={(e) => updatePlatformSetting("allow_google_sso", e.target.checked)}
            />
            Permitir SSO Google
          </label>
          <label className="stack-label">
            <input
              type="checkbox"
              checked={platformSettings.allow_facebook_sso}
              onChange={(e) => updatePlatformSetting("allow_facebook_sso", e.target.checked)}
            />
            Permitir SSO Facebook
          </label>
        </div>

        <div className="panel-card">
          <h3>Organizaciones (habilitar / suscripciones)</h3>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Organizacion</th>
                <th>Activa</th>
                <th>Suscripcion</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={org.is_active}
                      onChange={(e) => patchOrganization(org.id, { is_active: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={org.subscription_enabled}
                      onChange={(e) => patchOrganization(org.id, { subscription_enabled: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-card">
          <h3>Suscripcion y modulos por organizacion</h3>
          <form onSubmit={saveAdminSubscriptionConfig} className="odoo-company-form-grid">
            <div className="odoo-form-columns">
              <label>Organizacion
                <select
                  value={adminOrgConfig.organizationId}
                  onChange={(e) => selectAdminOrganizationConfig(e.target.value)}
                >
                  <option value="">Seleccionar organizacion</option>
                  {organizations.map((org) => (
                    <option key={`subscription-org-${org.id}`} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Plan de suscripcion
                <select
                  value={adminOrgConfig.subscription_plan}
                  onChange={(e) => setAdminOrgConfig((prev) => ({ ...prev, subscription_plan: e.target.value }))}
                  disabled={!adminOrgConfig.organizationId}
                >
                  {SUBSCRIPTION_PLAN_OPTIONS.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="toggle-row">
              <span>Suscripcion activa</span>
              <input
                type="checkbox"
                checked={adminOrgConfig.subscription_enabled}
                onChange={(e) => setAdminOrgConfig((prev) => ({ ...prev, subscription_enabled: e.target.checked }))}
                disabled={!adminOrgConfig.organizationId}
              />
            </label>
            <div className="company-section">
              <h4>Modulos incluidos en la suscripcion</h4>
              <div className="module-selector">
                {OWNER_MODULE_CATALOG.map((module) => {
                  const isEnabled = (adminOrgConfig.enabled_modules || []).includes(module.key);
                  return (
                    <button
                      key={`admin-module-${module.key}`}
                      type="button"
                      className={`module-pill ${isEnabled ? "active" : ""}`}
                      onClick={() => toggleAdminOrgModule(module.key)}
                      disabled={!adminOrgConfig.organizationId}
                    >
                      <span className="module-pill-icon">
                        <ModuleGlyph icon={module.icon} />
                      </span>
                      {module.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="company-section">
              <h4>Integraciones incluidas</h4>
              <label className="toggle-row">
                <span>Integracion Mercado Libre</span>
                <input
                  type="checkbox"
                  checked={adminOrgConfig.mercadolibre_enabled}
                  onChange={(e) => setAdminOrgConfig((prev) => ({ ...prev, mercadolibre_enabled: e.target.checked }))}
                  disabled={!adminOrgConfig.organizationId}
                />
              </label>
              <label className="toggle-row">
                <span>Facturacion electronica</span>
                <input
                  type="checkbox"
                  checked={adminOrgConfig.electronic_billing_enabled}
                  onChange={(e) => setAdminOrgConfig((prev) => ({ ...prev, electronic_billing_enabled: e.target.checked }))}
                  disabled={!adminOrgConfig.organizationId}
                />
              </label>
            </div>
            <div className="company-actions">
              <button type="submit" disabled={!adminOrgConfig.organizationId}>Guardar suscripcion</button>
            </div>
          </form>
        </div>

        <div className="panel-card">
          <h3>Usuarios globales y roles</h3>
          <form onSubmit={createUser} className="inline-form">
            <input value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} placeholder="username" />
            <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="email" />
            <input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="password" />
            <button type="submit">Crear usuario</button>
          </form>
          <table className="table-premium table-fixed">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Asignar</th>
                <th>Reset password</th>
                <th>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{(user.roles || []).join(", ") || "sin rol"}</td>
                  <td className="role-actions">
                    {roles.map((role) => (
                      <button key={`${user.id}-${role}`} type="button" onClick={() => assignRole(user.id, role)}>
                        {role}
                      </button>
                    ))}
                  </td>
                  <td>
                    <div className="inline-group">
                      <input
                        type="password"
                        placeholder="nueva password"
                        value={resetPasswordDrafts[user.id] || ""}
                        onChange={(e) => setResetPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      />
                      <button type="button" onClick={() => resetUserPassword(user.id)}>
                        Reset
                      </button>
                    </div>
                  </td>
                  <td>
                    <button type="button" onClick={() => deleteUser(user.id)} disabled={me?.id === user.id}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-card">
          <h3>Gestion de owners</h3>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Organizaciones</th>
                <th>Asignar organizacion</th>
              </tr>
            </thead>
            <tbody>
              {ownerUsers.map((owner) => (
                <tr key={`owner-${owner.id}`}>
                  <td>{owner.username}</td>
                  <td>
                    {(owner.owner_memberships || []).length === 0 ? (
                      <span>Sin organizaciones</span>
                    ) : (
                      owner.owner_memberships.map((membership) => (
                        <button
                          key={`${owner.id}-${membership.organization_id}`}
                          type="button"
                          className="chip-btn"
                          onClick={() => deactivateOwnerFromOrganization(owner.id, membership.organization_id)}
                        >
                          {membership.organization_name} ({membership.is_active ? "activo" : "inactivo"}) - desactivar
                        </button>
                      ))
                    )}
                  </td>
                  <td>
                    <div className="inline-group">
                      <select
                        value={ownerOrganizationDrafts[owner.id] || ""}
                        onChange={(e) =>
                          setOwnerOrganizationDrafts((prev) => ({ ...prev, [owner.id]: e.target.value }))
                        }
                      >
                        <option value="">Seleccionar organizacion</option>
                        {organizations.map((org) => (
                          <option key={`owner-${owner.id}-org-${org.id}`} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => assignOwnerToOrganization(owner.id)}>
                        Asignar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-card">
          <h3>Historial de pagos (FR-027)</h3>
          <table className="table-premium">
            <thead>
              <tr>
                <th>ID</th>
                <th>Organizacion</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Proveedor</th>
                <th>Factura</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="empty-inline">Sin pagos registrados.</td></tr>
              ) : payments.slice(0, 50).map((payment) => (
                <tr key={`admin-payment-${payment.id}`}>
                  <td>{payment.id}</td>
                  <td>{payment.organization_name || payment.organization}</td>
                  <td>{payment.payment_type === "class_single" ? "Clase" : "Membresia"}</td>
                  <td>{formatMoney(payment.amount, payment.currency)}</td>
                  <td>{getPaymentStatusLabel(payment.status)}</td>
                  <td>{payment.provider}</td>
                  <td>{payment.invoice_status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {summary ? <p>Resumen: {summary.organizations} organizaciones | {summary.users} usuarios</p> : null}
      </section>
    </main>
  );

  const renderOwnerPortal = (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <h1>Portal Dueño de Local</h1>
          <p>Gestion de organizacion, sedes y alumnos.</p>
        </div>
        <button onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="portal-grid">
        {ownerModule !== "launcher" ? (
          <div className="panel-card">
            <button type="button" onClick={() => selectOwnerModule("launcher")}>Volver a aplicaciones</button>
          </div>
        ) : null}

        {ownerModule === "launcher" ? (
          <div className="panel-card">
            <h3>Aplicaciones habilitadas</h3>
            <div className="app-launcher-grid">
              {enabledOwnerModules.map((module) => (
                <button
                  key={`app-${module.key}`}
                  type="button"
                  className="app-launcher-card"
                  onClick={() => selectOwnerModule(module.key)}
                >
                  <span className="app-launcher-icon">
                    <ModuleGlyph icon={module.icon} />
                  </span>
                  <span>{module.label}</span>
                </button>
              ))}
            </div>
            {enabledOwnerModules.length === 0 ? <p>No hay modulos habilitados para esta empresa.</p> : null}
          </div>
        ) : null}

        {ownerModule === "configuracion" ? (
        <div className="panel-card odoo-company-panel">
          <div className="odoo-company-title">Empresas</div>
          <div className="odoo-settings-grid">
            <div className="odoo-settings-tile">
              <h4>{ownerOrganization?.name || "Sin empresa"}</h4>
              <p>{ownerOrganization?.address || "Argentina"}</p>
              <button type="button" className="link-btn" onClick={() => setCompanyConfigTab("general")}>Actualizar informacion</button>
            </div>
            <div className="odoo-settings-tile">
              <h4>{organizations.length} Empresa{organizations.length === 1 ? "" : "s"}</h4>
              <button type="button" className="link-btn" onClick={() => setCompanyConfigTab("general")}>Administrar empresas</button>
            </div>
            <div className="odoo-settings-tile">
              <h4>Diseno del documento</h4>
              <p>Elija el diseno de sus documentos</p>
              <button type="button" className="link-btn">Configurar diseno del documento</button>
            </div>
            <div className="odoo-settings-tile">
              <h4>Plantillas de correo electronico</h4>
              <p>Personalice el aspecto de correos automatizados</p>
              <button type="button" className="link-btn">Revisar todas las plantillas</button>
            </div>
          </div>

          {!ownerHasOrganization ? (
            <div className="odoo-company-card">
              <div className="company-create-head">
                <h4>Crear empresa</h4>
                <p>Completá los datos fiscales y comerciales para habilitar la operación.</p>
              </div>
              <form onSubmit={createOrganization} className="odoo-company-form-grid">
                <div className="odoo-form-columns">
                  <label>Nombre empresa
                    <input value={organizationForm.name} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre comercial" />
                  </label>
                  <label>Logo empresa (URL o base64)
                    <input value={organizationForm.logo} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, logo: e.target.value }))} placeholder="https://... o data:image/..." />
                  </label>
                  <label>Subir logo
                    <input type="file" accept="image/*" onChange={(e) => uploadOrganizationLogo(e.target.files?.[0], "create")} />
                  </label>
                  <label>Razon social
                    <input value={organizationForm.legal_name} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, legal_name: e.target.value }))} placeholder="Razon social" />
                  </label>
                  <label>CUIT
                    <input value={organizationForm.tax_id} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, tax_id: e.target.value }))} placeholder="CUIT (11 digitos)" />
                  </label>
                  <label>Direccion fiscal
                    <input value={organizationForm.address} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Direccion fiscal" />
                  </label>
                  <label>Condicion fiscal
                    <select value={organizationForm.tax_condition} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, tax_condition: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {TAX_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Calle fiscal
                    <input value={organizationForm.fiscal_street} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_street: e.target.value }))} placeholder="Calle" />
                  </label>
                  <label>Numero fiscal
                    <input value={organizationForm.fiscal_street_number} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_street_number: e.target.value }))} placeholder="Numero" />
                  </label>
                  <label>Piso
                    <input value={organizationForm.fiscal_floor} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_floor: e.target.value }))} placeholder="Piso" />
                  </label>
                  <label>Dpto
                    <input value={organizationForm.fiscal_apartment} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_apartment: e.target.value }))} placeholder="Departamento" />
                  </label>
                  <label>Localidad
                    <input value={organizationForm.fiscal_city} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_city: e.target.value }))} placeholder="Localidad" />
                  </label>
                  <label>Provincia
                    <input value={organizationForm.fiscal_province} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_province: e.target.value }))} placeholder="Provincia" />
                  </label>
                  <label>Codigo postal
                    <input value={organizationForm.fiscal_postal_code} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_postal_code: e.target.value }))} placeholder="CP" />
                  </label>
                  <label>Inicio de actividades
                    <input type="date" value={organizationForm.activity_start_date} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, activity_start_date: e.target.value }))} />
                  </label>
                  <label>Actividad principal (CLAE)
                    <input value={organizationForm.main_activity_code} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, main_activity_code: e.target.value }))} placeholder="Codigo CLAE/NAES" />
                  </label>
                  <label>Email fiscal
                    <input value={organizationForm.fiscal_email} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_email: e.target.value }))} placeholder="fiscal@empresa.com" />
                  </label>
                  <label>Telefono fiscal
                    <input value={organizationForm.fiscal_phone} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, fiscal_phone: e.target.value }))} placeholder="+54..." />
                  </label>
                  <label>Ingresos Brutos numero
                    <input value={organizationForm.iibb_number} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, iibb_number: e.target.value }))} placeholder="Nro IIBB" />
                  </label>
                  <label>Tipo IIBB
                    <select value={organizationForm.iibb_type} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, iibb_type: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {IIBB_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Jurisdiccion IIBB
                    <input value={organizationForm.iibb_jurisdiction} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, iibb_jurisdiction: e.target.value }))} placeholder="ARBA / AGIP / etc." />
                  </label>
                  <label>Condicion IIBB
                    <input value={organizationForm.iibb_condition} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, iibb_condition: e.target.value }))} placeholder="Contribuyente / Exento" />
                  </label>
                  <label>Punto de venta AFIP
                    <input type="number" min="1" value={organizationForm.afip_pos_number} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, afip_pos_number: e.target.value }))} placeholder="1" />
                  </label>
                  <label>Sistema facturacion PDV
                    <select value={organizationForm.afip_pos_billing_system} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, afip_pos_billing_system: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {AFIP_BILLING_SYSTEM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Domicilio asociado PDV
                    <input value={organizationForm.afip_pos_address} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, afip_pos_address: e.target.value }))} placeholder="Domicilio PDV" />
                  </label>
                  <label>Alias certificado WSAA
                    <input value={organizationForm.wsaa_certificate_alias} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, wsaa_certificate_alias: e.target.value }))} placeholder="alias-certificado" />
                  </label>
                  <label>Entorno AFIP
                    <select value={organizationForm.afip_environment} onChange={(e) => setOrganizationForm((prev) => ({ ...prev, afip_environment: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {AFIP_ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="company-actions">
                  <button type="submit">Crear empresa</button>
                </div>
              </form>
            </div>
          ) : null}

          {ownerOrganization ? (
            <div className="odoo-company-card">
              <div className="odoo-company-headline">
                <label className="odoo-company-logo odoo-company-logo-upload" title="Subir o cambiar logo">
                  {organizationEditForm.logo ? <img src={organizationEditForm.logo} alt="Logo empresa" /> : "NILA"}
                  <input
                    className="logo-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadOrganizationLogo(e.target.files?.[0], "edit")}
                  />
                  <span className="logo-upload-hint">Cambiar logo</span>
                </label>
                <div>
                  <small>Nombre de la empresa</small>
                  <h2>{organizationEditForm.name || "-"}</h2>
                  <small className="muted-line">Hace click en el logo para actualizarlo</small>
                </div>
              </div>
              <div className="odoo-company-tabs">
                <button type="button" className={companyConfigTab === "general" ? "active" : ""} onClick={() => setCompanyConfigTab("general")}>
                  Informacion general
                </button>
                <button type="button" className={companyConfigTab === "sucursales" ? "active" : ""} onClick={() => setCompanyConfigTab("sucursales")}>
                  Sucursales
                </button>
              </div>

              {companyConfigTab === "general" ? (
                <form onSubmit={updateOrganization} className="odoo-company-form-grid">
                  <div className="company-section">
                    <h4>Informacion general</h4>
                    <div className="odoo-form-columns">
                      <label>Nombre empresa
                        <input value={organizationEditForm.name} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, name: e.target.value }))} />
                      </label>
                      <label>Razon social
                        <input value={organizationEditForm.legal_name} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, legal_name: e.target.value }))} disabled={organizationEditForm.fiscal_document_issued} />
                      </label>
                      <label>CUIT
                        <input value={organizationEditForm.tax_id} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, tax_id: e.target.value }))} />
                      </label>
                      <label>Direccion
                        <input value={organizationEditForm.address} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, address: e.target.value }))} />
                      </label>
                      <label>ARCA Responsibility Type
                        <select value={organizationEditForm.tax_condition} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, tax_condition: e.target.value }))}>
                          <option value="">Condicion fiscal</option>
                          {TAX_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>Calle fiscal
                        <input value={organizationEditForm.fiscal_street} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_street: e.target.value }))} />
                      </label>
                      <label>Numero fiscal
                        <input value={organizationEditForm.fiscal_street_number} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_street_number: e.target.value }))} />
                      </label>
                      <label>Piso
                        <input value={organizationEditForm.fiscal_floor} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_floor: e.target.value }))} />
                      </label>
                      <label>Dpto
                        <input value={organizationEditForm.fiscal_apartment} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_apartment: e.target.value }))} />
                      </label>
                      <label>Localidad
                        <input value={organizationEditForm.fiscal_city} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_city: e.target.value }))} />
                      </label>
                      <label>Provincia
                        <input value={organizationEditForm.fiscal_province} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_province: e.target.value }))} />
                      </label>
                      <label>Codigo postal
                        <input value={organizationEditForm.fiscal_postal_code} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_postal_code: e.target.value }))} />
                      </label>
                      <label>Inicio de actividades
                        <input type="date" value={organizationEditForm.activity_start_date} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, activity_start_date: e.target.value }))} />
                      </label>
                      <label>Actividad principal (CLAE)
                        <input value={organizationEditForm.main_activity_code} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, main_activity_code: e.target.value }))} />
                      </label>
                      <label>Email fiscal
                        <input value={organizationEditForm.fiscal_email} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_email: e.target.value }))} />
                      </label>
                      <label>Telefono fiscal
                        <input value={organizationEditForm.fiscal_phone} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, fiscal_phone: e.target.value }))} />
                      </label>
                      <label>Ingresos Brutos numero
                        <input value={organizationEditForm.iibb_number} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, iibb_number: e.target.value }))} />
                      </label>
                      <label>Tipo IIBB
                        <select value={organizationEditForm.iibb_type} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, iibb_type: e.target.value }))}>
                          <option value="">Seleccionar</option>
                          {IIBB_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>Jurisdiccion IIBB
                        <input value={organizationEditForm.iibb_jurisdiction} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, iibb_jurisdiction: e.target.value }))} />
                      </label>
                      <label>Condicion IIBB
                        <input value={organizationEditForm.iibb_condition} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, iibb_condition: e.target.value }))} />
                      </label>
                      <label>Punto de venta AFIP
                        <input type="number" min="1" value={organizationEditForm.afip_pos_number} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, afip_pos_number: e.target.value }))} />
                      </label>
                      <label>Sistema facturacion PDV
                        <select value={organizationEditForm.afip_pos_billing_system} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, afip_pos_billing_system: e.target.value }))}>
                          <option value="">Seleccionar</option>
                          {AFIP_BILLING_SYSTEM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>Domicilio asociado PDV
                        <input value={organizationEditForm.afip_pos_address} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, afip_pos_address: e.target.value }))} />
                      </label>
                      <label>Alias certificado WSAA
                        <input value={organizationEditForm.wsaa_certificate_alias} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, wsaa_certificate_alias: e.target.value }))} />
                      </label>
                      <label>Entorno AFIP
                        <select value={organizationEditForm.afip_environment} onChange={(e) => setOrganizationEditForm((prev) => ({ ...prev, afip_environment: e.target.value }))}>
                          <option value="">Seleccionar</option>
                          {AFIP_ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    {organizationEditForm.fiscal_document_issued ? (
                      <p className="info-note">Razon social bloqueada por emision fiscal.</p>
                    ) : null}
                  </div>
                  <div className="company-actions">
                    <button type="submit">Guardar empresa</button>
                    <button type="button" className="secondary-btn" onClick={markOrganizationFiscalIssued} disabled={organizationEditForm.fiscal_document_issued}>
                      {organizationEditForm.fiscal_document_issued ? "Documento fiscal emitido" : "Marcar doc fiscal emitido"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="branch-toolbar">
                    <h4>Sucursales</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEstablishmentEditorMode("create");
                        setEstablishmentEditId("");
                        setEstablishmentForm({
                          name: "",
                          organization: ownerOrganization ? String(ownerOrganization.id) : "",
                          address: "",
                          city: "",
                          open_time: "",
                          close_time: "",
                          weekly_hours: createEmptyWeeklyHours(),
                        });
                        setEstablishmentEditorOpen(true);
                      }}
                    >
                      Nueva sucursal
                    </button>
                  </div>

                  {establishmentEditorOpen ? (
                    <form
                      onSubmit={
                        establishmentEditorMode === "create"
                          ? createEstablishment
                          : (event) => {
                              event.preventDefault();
                              if (!establishmentEditId) return;
                              saveEstablishment(Number(establishmentEditId));
                            }
                      }
                      className="odoo-company-form-grid branch-editor-card"
                    >
                      <h4>{establishmentEditorMode === "create" ? "Crear sucursal" : "Editar sucursal"}</h4>
                      <div className="odoo-form-columns">
                        <label>Nombre sede
                          <input
                            value={establishmentEditorMode === "create" ? establishmentForm.name : establishmentEditForm.name}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, name: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Nombre sede"
                          />
                        </label>
                        <label>Empresa
                          <select
                            value={establishmentEditorMode === "create" ? establishmentForm.organization : establishmentEditForm.organization}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, organization: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, organization: e.target.value }))
                            }
                          >
                            <option value="">Organizacion</option>
                            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                          </select>
                        </label>
                        <label>Direccion
                          <input
                            value={establishmentEditorMode === "create" ? establishmentForm.address : establishmentEditForm.address}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, address: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, address: e.target.value }))
                            }
                            placeholder="Direccion"
                          />
                        </label>
                        <label>Ciudad
                          <input
                            value={establishmentEditorMode === "create" ? establishmentForm.city : establishmentEditForm.city}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, city: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, city: e.target.value }))
                            }
                            placeholder="Ciudad"
                          />
                        </label>
                        <label>Apertura base
                          <input
                            type="time"
                            value={establishmentEditorMode === "create" ? establishmentForm.open_time : establishmentEditForm.open_time}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, open_time: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, open_time: e.target.value }))
                            }
                          />
                        </label>
                        <label>Cierre base
                          <input
                            type="time"
                            value={establishmentEditorMode === "create" ? establishmentForm.close_time : establishmentEditForm.close_time}
                            onChange={(e) =>
                              establishmentEditorMode === "create"
                                ? setEstablishmentForm((p) => ({ ...p, close_time: e.target.value }))
                                : setEstablishmentEditForm((p) => ({ ...p, close_time: e.target.value }))
                            }
                          />
                        </label>
                      </div>
                      <div className="company-section">
                        <h4>Agenda semanal</h4>
                        <div className="weekly-hours-editor">
                          <div className="weekly-hours-head">
                            <span>Dia</span>
                            <span>Abierto</span>
                            <span>Turno manana</span>
                            <span>Turno tarde</span>
                          </div>
                          {WEEK_DAY_OPTIONS.map((day) => {
                            const row =
                              (establishmentEditorMode === "create" ? establishmentForm.weekly_hours : establishmentEditForm.weekly_hours)?.[day.key] || {};
                            return (
                              <div key={`${establishmentEditorMode}-${day.key}`} className="weekly-hours-row">
                                <span>{day.label}</span>
                                <label className="stack-label">
                                  <input
                                    type="checkbox"
                                    checked={!!row.enabled}
                                    onChange={(e) => updateWeeklyHoursField(establishmentEditorMode, day.key, "enabled", e.target.checked)}
                                  />
                                </label>
                                <div className="inline-group">
                                  <input
                                    type="time"
                                    value={row.morning_start || ""}
                                    onChange={(e) => updateWeeklyHoursField(establishmentEditorMode, day.key, "morning_start", e.target.value)}
                                    disabled={!row.enabled}
                                  />
                                  <input
                                    type="time"
                                    value={row.morning_end || ""}
                                    onChange={(e) => updateWeeklyHoursField(establishmentEditorMode, day.key, "morning_end", e.target.value)}
                                    disabled={!row.enabled}
                                  />
                                </div>
                                <div className="inline-group">
                                  <input
                                    type="time"
                                    value={row.afternoon_start || ""}
                                    onChange={(e) => updateWeeklyHoursField(establishmentEditorMode, day.key, "afternoon_start", e.target.value)}
                                    disabled={!row.enabled}
                                  />
                                  <input
                                    type="time"
                                    value={row.afternoon_end || ""}
                                    onChange={(e) => updateWeeklyHoursField(establishmentEditorMode, day.key, "afternoon_end", e.target.value)}
                                    disabled={!row.enabled}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="company-actions">
                        <button type="submit">{establishmentEditorMode === "create" ? "Crear sucursal" : "Guardar cambios"}</button>
                        <button type="button" className="secondary-btn" onClick={cancelEditEstablishment}>Cancelar</button>
                      </div>
                    </form>
                  ) : null}

                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Sucursal</th>
                        <th>Ciudad</th>
                        <th>Salones y capacidad</th>
                        <th>Horario semanal</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {establishments.map((establishment) => {
                        const organization = organizations.find((org) => org.id === establishment.organization);
                        const establishmentStats =
                          branchStatsByEstablishment[String(establishment.id)] || {
                            rooms: 0,
                            activeRooms: 0,
                            blockedRooms: 0,
                            totalCapacity: 0,
                            availableCapacity: 0,
                          };
                        const scheduleSummary = formatWeeklyHoursCompact(establishment);
                        return (
                          <tr key={establishment.id}>
                            <td>{organization?.name || "-"}</td>
                            <td>{establishment.name}</td>
                            <td>{establishment.city || "-"}</td>
                            <td>
                              <div className="branch-metric-stack">
                                <span className="metric-pill">{establishmentStats.rooms} salones</span>
                                <span className="metric-pill muted">Capacidad total: {establishmentStats.totalCapacity}</span>
                                <span className="metric-pill muted">Capacidad disponible: {establishmentStats.availableCapacity}</span>
                              </div>
                            </td>
                            <td>
                              <div className="schedule-summary">
                                <span>{scheduleSummary.openText}</span>
                                {scheduleSummary.closedText ? (
                                  <small>{scheduleSummary.closedText}</small>
                                ) : null}
                              </div>
                            </td>
                            <td>{establishment.is_active ? "Activa" : "Inactiva"}</td>
                            <td>
                              <div className="inline-group">
                                <button type="button" onClick={() => startEditEstablishment(establishment)}>Editar</button>
                                <button type="button" className="secondary-btn" onClick={() => openBranchRooms(establishment)}>Salones</button>
                                <button type="button" onClick={() => deleteEstablishment(establishment.id)}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {selectedBranchForRooms ? (
                    <div className="panel-card branch-editor-card">
                      <div className="rooms-panel-header">
                        <div>
                          <h4>Salones de {selectedBranchForRooms.name}</h4>
                          <p>Cada salon suma capacidad operativa a la sucursal.</p>
                        </div>
                        <button type="button" className="secondary-btn" onClick={() => setSelectedEstablishmentForRooms("")}>Cerrar</button>
                      </div>

                      <div className="branch-metrics">
                        <div className="branch-metric-card">
                          <small>Salones totales</small>
                          <strong>{selectedBranchStats.rooms}</strong>
                        </div>
                        <div className="branch-metric-card">
                          <small>Capacidad total</small>
                          <strong>{selectedBranchStats.totalCapacity}</strong>
                        </div>
                        <div className="branch-metric-card">
                          <small>Capacidad disponible</small>
                          <strong>{selectedBranchStats.availableCapacity}</strong>
                        </div>
                        <div className="branch-metric-card">
                          <small>Salones bloqueados</small>
                          <strong>{selectedBranchStats.blockedRooms}</strong>
                        </div>
                      </div>

                      <form onSubmit={createRoom} className="rooms-create-grid">
                        <label>Nombre salon
                          <input value={roomForm.name} onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Reformer Norte" />
                        </label>
                        <label>Tipo
                          <input value={roomForm.room_type} onChange={(e) => setRoomForm((p) => ({ ...p, room_type: e.target.value }))} placeholder="Ej. Reformer / Mat / Funcional" />
                        </label>
                        <label>Capacidad
                          <input type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacidad" />
                        </label>
                        <label className="rooms-active-toggle">Activo
                          <input type="checkbox" checked={roomForm.is_active} onChange={(e) => setRoomForm((p) => ({ ...p, is_active: e.target.checked }))} />
                        </label>
                        <div className="rooms-create-actions">
                          <button type="submit">Crear salon</button>
                        </div>
                      </form>

                      <table className="table-premium">
                        <thead>
                          <tr>
                            <th>Salon</th>
                            <th>Tipo</th>
                            <th>Capacidad</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomsForSelectedBranch.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="empty-inline">No hay salones cargados para esta sucursal.</td>
                            </tr>
                          ) : roomsForSelectedBranch.map((room) => {
                            const isEditing = roomEditId === String(room.id);
                            return (
                              <tr key={`branch-room-${room.id}`}>
                                <td>
                                  {isEditing ? (
                                    <input value={roomEditForm.name} onChange={(e) => setRoomEditForm((p) => ({ ...p, name: e.target.value }))} />
                                  ) : room.name}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input value={roomEditForm.room_type} onChange={(e) => setRoomEditForm((p) => ({ ...p, room_type: e.target.value }))} />
                                  ) : (room.room_type || "-")}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input type="number" min="1" value={roomEditForm.capacity} onChange={(e) => setRoomEditForm((p) => ({ ...p, capacity: e.target.value }))} />
                                  ) : room.capacity}
                                </td>
                                <td>
                                  <span className={`status-pill ${!room.is_active ? "neutral" : room.is_blocked ? "warning" : "success"}`}>
                                    {getRoomStatus(room)}
                                  </span>
                                </td>
                                <td>
                                  {isEditing ? (
                                    <div className="detail-card">
                                      <label className="toggle-row">
                                        <span>Salon activo</span>
                                        <input type="checkbox" checked={roomEditForm.is_active} onChange={(e) => setRoomEditForm((p) => ({ ...p, is_active: e.target.checked }))} />
                                      </label>
                                      <label className="toggle-row">
                                        <span>Bloquear salon</span>
                                        <input type="checkbox" checked={roomEditForm.is_blocked} onChange={(e) => setRoomEditForm((p) => ({ ...p, is_blocked: e.target.checked }))} />
                                      </label>
                                      {roomEditForm.is_blocked ? (
                                        <div className="odoo-form-columns">
                                          <label>Motivo bloqueo
                                            <input value={roomEditForm.blocked_reason} onChange={(e) => setRoomEditForm((p) => ({ ...p, blocked_reason: e.target.value }))} />
                                          </label>
                                          <label>Desde
                                            <input type="datetime-local" value={roomEditForm.blocked_from} onChange={(e) => setRoomEditForm((p) => ({ ...p, blocked_from: e.target.value }))} />
                                          </label>
                                          <label>Hasta
                                            <input type="datetime-local" value={roomEditForm.blocked_to} onChange={(e) => setRoomEditForm((p) => ({ ...p, blocked_to: e.target.value }))} />
                                          </label>
                                        </div>
                                      ) : null}
                                      <div className="inline-group">
                                        <button type="button" onClick={() => saveRoom(room.id)}>Guardar</button>
                                        <button type="button" onClick={cancelEditRoom}>Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="inline-group">
                                      <button type="button" onClick={() => startEditRoom(room)}>Editar</button>
                                      {!room.is_blocked ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const reason = window.prompt("Motivo de bloqueo (mantenimiento/evento):", "Mantenimiento");
                                            if (!reason) return;
                                            blockRoom(room.id, reason);
                                          }}
                                        >
                                          Bloquear
                                        </button>
                                      ) : (
                                        <button type="button" onClick={() => unblockRoom(room.id)}>Desbloquear</button>
                                      )}
                                      <button type="button" onClick={() => deleteRoom(room.id)}>Eliminar</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        ) : null}

        {ownerModule === "clases" ? (
        <div className="panel-card">
          <div className="class-section-header">
            <div>
              <h3>Clases</h3>
              <p>Gestiona agenda, salones e instructores con una vista operativa premium.</p>
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setClassFilters({ organization: "", establishment: "", instructor: "", status: "all" })}
            >
              Limpiar filtros
            </button>
          </div>

          <div className="class-kpi-grid">
            <article className="class-kpi-card">
              <span>Programadas</span>
              <strong>{classSummary.scheduled}</strong>
            </article>
            <article className="class-kpi-card">
              <span>Canceladas</span>
              <strong>{classSummary.canceled}</strong>
            </article>
            <article className="class-kpi-card">
              <span>Completadas</span>
              <strong>{classSummary.completed}</strong>
            </article>
            <article className="class-kpi-card">
              <span>Capacidad total</span>
              <strong>{classSummary.totalCapacity}</strong>
            </article>
          </div>

          <div className="classes-layout">
            <form onSubmit={createClass} className="odoo-company-form-grid class-editor-card">
              <h4>Nueva clase</h4>
              <div className="odoo-form-columns">
                <label>Nombre clase
                  <input required value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Mat Intermedio" />
                </label>
                <label>Empresa
                  <select
                    required
                    value={classForm.organization}
                    onChange={(e) => setClassForm((p) => ({ ...p, organization: e.target.value, establishment: "", room: "", capacity: "1" }))}
                  >
                    <option value="">Seleccionar</option>
                    {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </label>
                <label>Sede
                  <select
                    required
                    value={classForm.establishment}
                    onChange={(e) => setClassForm((p) => ({ ...p, establishment: e.target.value, room: "", capacity: "1" }))}
                    disabled={!classForm.organization}
                  >
                    <option value="">Seleccionar</option>
                    {classFormEstablishments.map((est) => <option key={est.id} value={est.id}>{est.name}</option>)}
                  </select>
                </label>
                <label>Salon
                  <select
                    value={classForm.room}
                    onChange={(e) => applyClassFormRoom(e.target.value)}
                    disabled={!classForm.establishment}
                  >
                    <option value="">Sin salon</option>
                    {classFormRooms.map((room) => <option key={room.id} value={room.id}>{room.name} (cap. {room.capacity})</option>)}
                  </select>
                </label>
                {isOwnerRole ? (
                  <label>Instructor
                    <select value={classForm.instructor} onChange={(e) => setClassForm((p) => ({ ...p, instructor: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {instructors.map((inst) => <option key={inst.id} value={inst.id}>{inst.username}</option>)}
                    </select>
                  </label>
                ) : (
                  <label>Instructor
                    <input value={me?.username || ""} disabled />
                  </label>
                )}
                <label>Inicio
                  <input required type="datetime-local" step="60" value={classForm.start_at} onChange={(e) => setClassForm((p) => ({ ...p, start_at: e.target.value }))} />
                </label>
                <label>Fin
                  <input required type="datetime-local" step="60" value={classForm.end_at} onChange={(e) => setClassForm((p) => ({ ...p, end_at: e.target.value }))} />
                </label>
                <label>Capacidad
                  <input
                    type="number"
                    min="1"
                    max={selectedClassRoom ? String(selectedClassRoom.capacity || 1) : undefined}
                    value={classForm.capacity}
                    onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))}
                    placeholder="Capacidad"
                  />
                </label>
              </div>
              <div className="company-actions">
                <button type="submit">Crear clase</button>
              </div>
              {selectedClassRoom ? (
                <small className="helper-text">
                  Salon seleccionado: <strong>{selectedClassRoom.name}</strong> | Capacidad maxima: {selectedClassRoom.capacity}
                </small>
              ) : null}
            </form>

            {classEditId ? (
              <form
                className="odoo-company-form-grid class-editor-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveClass(Number(classEditId));
                }}
              >
                <h4>Editar clase</h4>
                <div className="odoo-form-columns">
                  <label>Nombre clase
                    <input required value={classEditForm.name} onChange={(e) => setClassEditForm((p) => ({ ...p, name: e.target.value }))} />
                  </label>
                  <label>Empresa
                    <select
                      required
                      value={classEditForm.organization}
                      onChange={(e) => setClassEditForm((p) => ({ ...p, organization: e.target.value, establishment: "", room: "", capacity: "1" }))}
                    >
                      <option value="">Seleccionar</option>
                      {organizations.map((org) => <option key={`edit-org-${org.id}`} value={org.id}>{org.name}</option>)}
                    </select>
                  </label>
                  <label>Sede
                    <select
                      required
                      value={classEditForm.establishment}
                      onChange={(e) => setClassEditForm((p) => ({ ...p, establishment: e.target.value, room: "", capacity: "1" }))}
                      disabled={!classEditForm.organization}
                    >
                      <option value="">Seleccionar</option>
                      {classEditEstablishments.map((est) => <option key={`edit-est-${est.id}`} value={est.id}>{est.name}</option>)}
                    </select>
                  </label>
                  <label>Salon
                    <select
                      value={classEditForm.room}
                      onChange={(e) => applyClassEditRoom(e.target.value)}
                      disabled={!classEditForm.establishment}
                    >
                      <option value="">Sin salon</option>
                      {classEditRooms.map((room) => <option key={`edit-room-${room.id}`} value={room.id}>{room.name} (cap. {room.capacity})</option>)}
                    </select>
                  </label>
                  {isOwnerRole ? (
                    <label>Instructor
                      <select value={classEditForm.instructor} onChange={(e) => setClassEditForm((p) => ({ ...p, instructor: e.target.value }))}>
                        <option value="">Sin asignar</option>
                        {instructors.map((inst) => <option key={`edit-inst-${inst.id}`} value={inst.id}>{inst.username}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label>Instructor
                      <input value={me?.username || ""} disabled />
                    </label>
                  )}
                  <label>Inicio
                    <input required type="datetime-local" step="60" value={classEditForm.start_at} onChange={(e) => setClassEditForm((p) => ({ ...p, start_at: e.target.value }))} />
                  </label>
                  <label>Fin
                    <input required type="datetime-local" step="60" value={classEditForm.end_at} onChange={(e) => setClassEditForm((p) => ({ ...p, end_at: e.target.value }))} />
                  </label>
                  <label>Capacidad
                    <input
                      type="number"
                      min="1"
                      max={selectedClassEditRoom ? String(selectedClassEditRoom.capacity || 1) : undefined}
                      value={classEditForm.capacity}
                      onChange={(e) => setClassEditForm((p) => ({ ...p, capacity: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="company-actions">
                  <button type="submit">Guardar cambios</button>
                  <button type="button" className="secondary-btn" onClick={cancelEditClass}>Cancelar</button>
                </div>
                {selectedClassEditRoom ? (
                  <small className="helper-text">
                    Salon seleccionado: <strong>{selectedClassEditRoom.name}</strong> | Capacidad maxima: {selectedClassEditRoom.capacity}
                  </small>
                ) : null}
              </form>
            ) : null}

            <div className="class-filters">
              <h4>Filtro de calendario</h4>
              <div className="odoo-form-columns">
                <label>Empresa
                  <select
                    value={classFilters.organization}
                    onChange={(e) => setClassFilters((p) => ({ ...p, organization: e.target.value, establishment: "" }))}
                  >
                    <option value="">Todas</option>
                    {organizations.map((org) => <option key={`filter-org-${org.id}`} value={org.id}>{org.name}</option>)}
                  </select>
                </label>
                <label>Sede
                  <select
                    value={classFilters.establishment}
                    onChange={(e) => setClassFilters((p) => ({ ...p, establishment: e.target.value }))}
                  >
                    <option value="">Todas</option>
                    {establishments
                      .filter((est) => !classFilters.organization || String(est.organization) === String(classFilters.organization))
                      .map((est) => <option key={`filter-est-${est.id}`} value={est.id}>{est.name}</option>)}
                  </select>
                </label>
                <label>Instructor
                  <select value={classFilters.instructor} onChange={(e) => setClassFilters((p) => ({ ...p, instructor: e.target.value }))}>
                    <option value="">Todos</option>
                    {instructors.map((inst) => <option key={`filter-inst-${inst.id}`} value={inst.id}>{inst.username}</option>)}
                  </select>
                </label>
                <label>Estado
                  <select value={classFilters.status} onChange={(e) => setClassFilters((p) => ({ ...p, status: e.target.value }))}>
                    <option value="all">Todos</option>
                    <option value="scheduled">Programada</option>
                    <option value="canceled">Cancelada</option>
                    <option value="completed">Completada</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <table className="table-premium">
            <thead>
              <tr>
                <th>Clase</th>
                <th>Sede</th>
                <th>Salon</th>
                <th>Instructor</th>
                <th>Horario</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-inline">No hay clases para los filtros seleccionados.</td>
                </tr>
              ) : filteredClasses.map((cls) => {
                const establishment = establishments.find((est) => est.id === cls.establishment);
                const room = rooms.find((r) => r.id === cls.room);
                const canEdit = canEditStudioClass(cls);
                const canCancel = canCancelStudioClass(cls);
                const canAssignRoom = canEdit && cls.status !== "canceled";
                return (
                  <tr key={cls.id}>
                    <td>{cls.name}</td>
                    <td>{establishment?.name || cls.establishment}</td>
                    <td>{room?.name || "-"}</td>
                    <td>{cls.instructor_username || "-"}</td>
                    <td>{formatDateTimeLabel(cls.start_at)} - {formatDateTimeLabel(cls.end_at)}</td>
                    <td>{cls.capacity}</td>
                    <td>
                      <span className={`status-pill ${cls.status === "canceled" ? "neutral" : cls.status === "completed" ? "success" : "warning"}`}>
                        {cls.status === "scheduled" ? "Programada" : cls.status === "canceled" ? "Cancelada" : "Completada"}
                      </span>
                    </td>
                    <td>
                      <div className="inline-group">
                        <button type="button" className="secondary-btn" onClick={() => startEditClass(cls)} disabled={!canEdit}>
                          Editar
                        </button>
                        {isOwnerRole ? (
                          <select
                            onChange={(e) => e.target.value && assignClassInstructor(cls.id, e.target.value)}
                            defaultValue=""
                            disabled={cls.status === "canceled"}
                          >
                            <option value="">Asignar instructor</option>
                            {instructors.map((inst) => <option key={`${cls.id}-inst-${inst.id}`} value={inst.id}>{inst.username}</option>)}
                          </select>
                        ) : null}
                        <select
                          onChange={(e) => e.target.value && assignClassRoom(cls.id, e.target.value)}
                          defaultValue=""
                          disabled={!canAssignRoom}
                        >
                          <option value="">Asignar salon</option>
                          {rooms.filter((r) => String(r.establishment) === String(cls.establishment) && r.is_active && !r.is_blocked).map((r) => (
                            <option key={`${cls.id}-room-${r.id}`} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => cancelClass(cls.id)} disabled={!canCancel}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : null}

        {ownerModule === "alumnos" ? (
        <div className="panel-card">
          <h3>Alumnos</h3>
          <form onSubmit={createStudent} className="inline-form">
            <select value={newStudent.organization} onChange={(e) => setNewStudent((p) => ({ ...p, organization: e.target.value }))}>
              <option value="">Organizacion</option>
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
            <input value={newStudent.first_name} onChange={(e) => setNewStudent((p) => ({ ...p, first_name: e.target.value }))} placeholder="Nombre" />
            <input value={newStudent.last_name} onChange={(e) => setNewStudent((p) => ({ ...p, last_name: e.target.value }))} placeholder="Apellido" />
            <input value={newStudent.email} onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
            <input value={newStudent.phone} onChange={(e) => setNewStudent((p) => ({ ...p, phone: e.target.value }))} placeholder="Telefono" />
            <input value={newStudent.current_level} onChange={(e) => setNewStudent((p) => ({ ...p, current_level: e.target.value }))} placeholder="Nivel" />
            <button type="submit">Crear alumno</button>
          </form>

          <form onSubmit={saveStudentEdition} className="inline-form">
            <select value={studentEditForm.studentId} onChange={(e) => {
              const student = students.find((item) => String(item.id) === String(e.target.value));
              if (student) startStudentEdition(student);
            }}>
              <option value="">Seleccionar alumno para editar</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
            </select>
            <input value={studentEditForm.first_name} onChange={(e) => setStudentEditForm((p) => ({ ...p, first_name: e.target.value }))} placeholder="Nombre" />
            <input value={studentEditForm.last_name} onChange={(e) => setStudentEditForm((p) => ({ ...p, last_name: e.target.value }))} placeholder="Apellido" />
            <input value={studentEditForm.email} onChange={(e) => setStudentEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
            <input value={studentEditForm.phone} onChange={(e) => setStudentEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Telefono" />
            <input value={studentEditForm.current_level} onChange={(e) => setStudentEditForm((p) => ({ ...p, current_level: e.target.value }))} placeholder="Nivel" />
            <input value={studentEditForm.establishmentIdsCsv} onChange={(e) => setStudentEditForm((p) => ({ ...p, establishmentIdsCsv: e.target.value }))} placeholder="IDs sedes: 1,2" />
            <label className="stack-label">
              <input
                type="checkbox"
                checked={studentEditForm.is_active}
                onChange={(e) => setStudentEditForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Activo
            </label>
            <button type="submit">Guardar alumno</button>
          </form>

          <form onSubmit={assignStudentToEstablishments} className="inline-form">
            <select value={assignForm.studentId} onChange={(e) => setAssignForm((p) => ({ ...p, studentId: e.target.value }))}>
              <option value="">Alumno</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
            </select>
            <input value={assignForm.establishmentIdsCsv} onChange={(e) => setAssignForm((p) => ({ ...p, establishmentIdsCsv: e.target.value }))} placeholder="IDs sedes: 1,2" />
            <button type="submit">Asignar sedes</button>
          </form>

          <table className="table-premium">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Usuario sistema</th>
                <th>Email sistema</th>
                <th>Empresa</th>
                <th>Sedes</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={8} className="empty-inline">No hay alumnos.</td></tr>
              ) : students.map((student) => (
                <tr key={`owner-student-${student.id}`}>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>{student.user_username || "-"}</td>
                  <td>{student.user_email || "-"}</td>
                  <td>{student.organization_name || student.organization}</td>
                  <td>{Array.isArray(student.establishments) && student.establishments.length ? student.establishments.map((est) => est.name).join(", ") : "-"}</td>
                  <td>{student.current_level || "-"}</td>
                  <td>{student.is_active ? "Activo" : "Inactivo"}</td>
                  <td>
                    <button type="button" className="secondary-btn" onClick={() => startStudentEdition(student)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="chip-row">
            {students.map((student) => (
              <button key={student.id} type="button" className="chip-btn" onClick={() => loadStudentHistory(student.id)}>
                {student.first_name} {student.last_name}
              </button>
            ))}
          </div>

          {selectedStudent ? (
            <div className="detail-card">
              <p><strong>Ficha:</strong> {selectedStudent.first_name} {selectedStudent.last_name}</p>
              <p>Nivel: {selectedStudent.current_level || "-"}</p>
              <p>Sedes: {selectedStudent.establishments?.map((est) => est.name).join(", ") || "Sin asignar"}</p>

              <form onSubmit={addHistoryNote} className="inline-form">
                <input value={historyNote} onChange={(e) => setHistoryNote(e.target.value)} placeholder="Nota de historial" />
                <button type="submit">Agregar evento</button>
              </form>

              <ul className="list-clean">
                {historyEvents.map((event) => (
                  <li key={event.id}>[{event.event_type}] {event.description}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        ) : null}

        {ownerModule === "pos" ? (
          <div className="panel-card">
            <h3>POS</h3>
            <div className="classes-layout">
              <form onSubmit={createMembershipPlan} className="odoo-company-form-grid class-editor-card">
                <h4>Planes de membresia (FR-025)</h4>
                <div className="odoo-form-columns">
                  <label>Organizacion
                    <select value={membershipPlanForm.organization} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, organization: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {organizations.map((org) => <option key={`plan-org-${org.id}`} value={org.id}>{org.name}</option>)}
                    </select>
                  </label>
                  <label>Nombre plan
                    <input value={membershipPlanForm.name} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, name: e.target.value }))} placeholder="Plan mensual" />
                  </label>
                  <label>Precio
                    <input type="number" min="1" value={membershipPlanForm.price} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, price: e.target.value }))} />
                  </label>
                  <label>Moneda
                    <input value={membershipPlanForm.currency} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} />
                  </label>
                  <label>Duracion (dias)
                    <input type="number" min="1" value={membershipPlanForm.duration_days} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, duration_days: e.target.value }))} />
                  </label>
                  <label>Clases por semana
                    <input type="number" min="1" value={membershipPlanForm.classes_per_week} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, classes_per_week: e.target.value }))} />
                  </label>
                  <label>Descripcion
                    <input value={membershipPlanForm.description} onChange={(e) => setMembershipPlanForm((p) => ({ ...p, description: e.target.value }))} />
                  </label>
                </div>
                <div className="company-actions">
                  <button type="submit">Crear plan</button>
                </div>
              </form>

              <form onSubmit={createOwnerPayment} className="odoo-company-form-grid class-editor-card">
                <h4>Registrar pago (FR-023, FR-024, FR-026)</h4>
                <div className="odoo-form-columns">
                  <label>Organizacion
                    <select
                      value={paymentForm.organization}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          organization: e.target.value,
                          student: "",
                          studio_class: "",
                          membership_plan: "",
                        }))
                      }
                    >
                      <option value="">Seleccionar</option>
                      {organizations.map((org) => <option key={`payment-org-${org.id}`} value={org.id}>{org.name}</option>)}
                    </select>
                  </label>
                  <label>Alumno
                    <select value={paymentForm.student} onChange={(e) => setPaymentForm((p) => ({ ...p, student: e.target.value }))}>
                      <option value="">Sin alumno</option>
                      {paymentFormStudents.map((student) => (
                        <option key={`pay-student-${student.id}`} value={student.id}>
                          {student.first_name} {student.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>Tipo pago
                    <select
                      value={paymentForm.payment_type}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          payment_type: e.target.value,
                          studio_class: "",
                          membership_plan: "",
                        }))
                      }
                    >
                      <option value="class_single">Pago de clase</option>
                      <option value="membership">Pago de membresia</option>
                    </select>
                  </label>
                  {paymentForm.payment_type === "class_single" ? (
                    <label>Clase
                      <select
                        value={paymentForm.studio_class}
                        onChange={(e) => setPaymentForm((p) => ({ ...p, studio_class: e.target.value }))}
                      >
                        <option value="">Seleccionar clase</option>
                        {paymentFormClasses.map((cls) => (
                          <option key={`pay-class-${cls.id}`} value={cls.id}>
                            {cls.name} ({formatDateTimeLabel(cls.start_at)})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>Plan membresia
                      <select
                        value={paymentForm.membership_plan}
                        onChange={(e) => {
                          const planId = e.target.value;
                          const selectedPlan = paymentFormPlans.find((plan) => String(plan.id) === String(planId));
                          setPaymentForm((p) => ({
                            ...p,
                            membership_plan: planId,
                            amount: selectedPlan ? String(selectedPlan.price || "") : p.amount,
                          }));
                        }}
                      >
                        <option value="">Seleccionar plan</option>
                        {paymentFormPlans.map((plan) => (
                          <option key={`pay-plan-${plan.id}`} value={plan.id}>
                            {plan.name} ({formatMoney(plan.price, plan.currency)})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>Monto
                    <input type="number" min="1" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
                  </label>
                  <label>Proveedor
                    <select value={paymentForm.provider} onChange={(e) => setPaymentForm((p) => ({ ...p, provider: e.target.value }))}>
                      <option value="mercadopago">MercadoPago</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label>Email pagador
                    <input value={paymentForm.payer_email} onChange={(e) => setPaymentForm((p) => ({ ...p, payer_email: e.target.value }))} />
                  </label>
                  <label>Nombre pagador
                    <input value={paymentForm.payer_name} onChange={(e) => setPaymentForm((p) => ({ ...p, payer_name: e.target.value }))} />
                  </label>
                  <label>Descripcion
                    <input value={paymentForm.description} onChange={(e) => setPaymentForm((p) => ({ ...p, description: e.target.value }))} />
                  </label>
                </div>
                <div className="company-actions">
                  <button type="submit">Registrar pago</button>
                </div>
              </form>
            </div>

            <h4>Pagos</h4>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Factura</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="empty-inline">Sin pagos.</td></tr>
                ) : payments.map((payment) => (
                  <tr key={`owner-payment-${payment.id}`}>
                    <td>{payment.id}</td>
                    <td>{payment.payment_type === "class_single" ? "Clase" : "Membresia"}</td>
                    <td>{payment.external_reference || "-"}</td>
                    <td>{formatMoney(payment.amount, payment.currency)}</td>
                    <td>{getPaymentStatusLabel(payment.status)}</td>
                    <td>{payment.invoice_status || "-"}</td>
                    <td>
                      <div className="inline-group">
                        {payment.provider === "mercadopago" ? (
                          <button type="button" className="secondary-btn" onClick={() => simulateMercadoPagoWebhook(payment)}>
                            Simular webhook MP
                          </button>
                        ) : null}
                        {payment.status !== "approved" ? (
                          <button type="button" onClick={() => markPaymentAsPaid(payment.id)}>Marcar pagado</button>
                        ) : null}
                        <button type="button" className="secondary-btn" onClick={() => emitPaymentInvoice(payment.id)}>
                          Emitir ARCA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4>Comprobantes ARCA</h4>
            <table className="table-premium">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Comprobante</th>
                  <th>CAE</th>
                  <th>Vencimiento CAE</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="empty-inline">Sin comprobantes.</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={`owner-invoice-${invoice.id}`}>
                    <td>{invoice.id}</td>
                    <td>{invoice.payment}</td>
                    <td>{invoice.status}</td>
                    <td>{invoice.invoice_number || "-"}</td>
                    <td>{invoice.cae || "-"}</td>
                    <td>{invoice.cae_expires_on || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {ownerModule === "tutoriales" ? (
          <div className="panel-card">
            <h3>Tutoriales | Videos</h3>
            <p>Espacio para cargar, organizar y reproducir tutoriales y videos de clases.</p>
          </div>
        ) : null}

        {ownerModule === "tableros" ? (
          <div className="panel-card">
            <h3>Tableros</h3>
            <p>Indicadores operativos y comerciales: ocupacion, asistencia, ingresos y retencion.</p>
          </div>
        ) : null}

        {ownerModule === "contactos" ? (
          <div className="panel-card">
            <h3>Contactos</h3>
            <p>Gestion unificada de alumnos, leads y proveedores con historial de interacciones.</p>
          </div>
        ) : null}

        {ownerModule === "redes_sociales" ? (
          <div className="panel-card">
            <h3>Redes sociales</h3>
            <p>Conectar cuentas, analizar feed de publicaciones y publicar desde un unico espacio.</p>
          </div>
        ) : null}

        {summary ? <p>Resumen: {summary.organizations} orgs | {summary.students} alumnos</p> : null}
      </section>
    </main>
  );

  const renderStudentPortal = (
    <main className="portal-shell portal-shell-sm">
      <header className="portal-header">
        <div>
          <h1>Portal Alumno</h1>
          <p>Bienvenido, {me?.username}. Puedes operar en multiples empresas desde marketplace.</p>
        </div>
        <button onClick={logout}>Cerrar sesion</button>
      </header>
      <section className="portal-grid">
        <div className="panel-card">
          <h3>Mis perfiles por empresa</h3>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Alumno</th>
                <th>Nivel</th>
                <th>Sedes</th>
                <th>Via de acceso</th>
              </tr>
            </thead>
            <tbody>
              {studentProfiles.length === 0 ? (
                <tr><td colSpan={5} className="empty-inline">Todavia no estas asociado a empresas.</td></tr>
              ) : studentProfiles.map((profile) => (
                <tr key={`student-profile-${profile.id}`}>
                  <td>{profile.organization_name || `Org ${profile.organization}`}</td>
                  <td>{profile.first_name} {profile.last_name}</td>
                  <td>{profile.current_level || "-"}</td>
                  <td>{Array.isArray(profile.establishments) && profile.establishments.length ? profile.establishments.map((est) => est.name).join(", ") : "-"}</td>
                  <td>{profile.auth_provider || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-card">
          <h3>Marketplace de estudios</h3>
          <form onSubmit={joinMarketplaceOrganization} className="odoo-company-form-grid">
            <div className="odoo-form-columns">
              <label>Empresa
                <select
                  value={joinMarketplaceForm.organization_id}
                  onChange={(e) => setJoinMarketplaceForm((p) => ({ ...p, organization_id: e.target.value }))}
                >
                  <option value="">Seleccionar empresa</option>
                  {marketplaceOrganizations.map((org) => (
                    <option key={`join-org-${org.id}`} value={org.id}>
                      {org.name} {org.subscription_plan ? `(${org.subscription_plan})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>Nombre
                <input value={joinMarketplaceForm.first_name} onChange={(e) => setJoinMarketplaceForm((p) => ({ ...p, first_name: e.target.value }))} />
              </label>
              <label>Apellido
                <input value={joinMarketplaceForm.last_name} onChange={(e) => setJoinMarketplaceForm((p) => ({ ...p, last_name: e.target.value }))} />
              </label>
              <label>Telefono
                <input value={joinMarketplaceForm.phone} onChange={(e) => setJoinMarketplaceForm((p) => ({ ...p, phone: e.target.value }))} />
              </label>
              <label>Nivel
                <input value={joinMarketplaceForm.current_level} onChange={(e) => setJoinMarketplaceForm((p) => ({ ...p, current_level: e.target.value }))} />
              </label>
            </div>
            <div className="company-actions">
              <button type="submit">Asociarme a empresa</button>
            </div>
          </form>
        </div>

        <div className="panel-card">
          <h3>Pagar clase o membresia</h3>
          <form onSubmit={createStudentPayment} className="odoo-company-form-grid">
            <div className="odoo-form-columns">
              <label>Organizacion
                <select
                  value={studentPaymentForm.organization}
                  onChange={(e) =>
                    setStudentPaymentForm((p) => ({
                      ...p,
                      organization: e.target.value,
                      studio_class: "",
                      membership_plan: "",
                    }))
                  }
                >
                  <option value="">Seleccionar</option>
                  {[
                    ...new Map(
                      [
                        ...studentAvailablePlans.map((plan) => [
                          String(plan.organization),
                          { id: plan.organization, name: plan.organization_name || `Org ${plan.organization}` },
                        ]),
                        ...studentAvailableClasses.map((studioClass) => [
                          String(studioClass.organization),
                          { id: studioClass.organization, name: `Org ${studioClass.organization}` },
                        ]),
                      ]
                    ).values(),
                  ].map((org) => (
                    <option key={`student-org-${org.id}`} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </label>
              <label>Tipo pago
                <select
                  value={studentPaymentForm.payment_type}
                  onChange={(e) =>
                    setStudentPaymentForm((p) => ({
                      ...p,
                      payment_type: e.target.value,
                      studio_class: "",
                      membership_plan: "",
                    }))
                  }
                >
                  <option value="class_single">Clase individual</option>
                  <option value="membership">Membresia</option>
                </select>
              </label>
              {studentPaymentForm.payment_type === "class_single" ? (
                <label>Clase
                  <select
                    value={studentPaymentForm.studio_class}
                    onChange={(e) => setStudentPaymentForm((p) => ({ ...p, studio_class: e.target.value }))}
                  >
                    <option value="">Seleccionar clase</option>
                    {studentAvailableClasses
                      .filter((cls) => !studentPaymentForm.organization || String(cls.organization) === String(studentPaymentForm.organization))
                      .map((cls) => (
                        <option key={`student-class-${cls.id}`} value={cls.id}>
                          {cls.name} ({formatDateTimeLabel(cls.start_at)})
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <label>Plan membresia
                  <select
                    value={studentPaymentForm.membership_plan}
                    onChange={(e) => {
                      const planId = e.target.value;
                      const selectedPlan = studentAvailablePlans.find((plan) => String(plan.id) === String(planId));
                      setStudentPaymentForm((p) => ({
                        ...p,
                        membership_plan: planId,
                        amount: selectedPlan ? String(selectedPlan.price || "") : p.amount,
                      }));
                    }}
                  >
                    <option value="">Seleccionar plan</option>
                    {studentAvailablePlans
                      .filter((plan) => !studentPaymentForm.organization || String(plan.organization) === String(studentPaymentForm.organization))
                      .map((plan) => (
                        <option key={`student-plan-${plan.id}`} value={plan.id}>
                          {plan.name} ({formatMoney(plan.price, plan.currency)})
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>Monto
                <input type="number" min="1" value={studentPaymentForm.amount} onChange={(e) => setStudentPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
              </label>
              <label>Email
                <input value={studentPaymentForm.payer_email} onChange={(e) => setStudentPaymentForm((p) => ({ ...p, payer_email: e.target.value }))} placeholder={me?.email || "email@alumno.com"} />
              </label>
              <label>Nombre
                <input value={studentPaymentForm.payer_name} onChange={(e) => setStudentPaymentForm((p) => ({ ...p, payer_name: e.target.value }))} placeholder={me?.username || "Alumno"} />
              </label>
              <label>Descripcion
                <input value={studentPaymentForm.description} onChange={(e) => setStudentPaymentForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
            </div>
            <div className="company-actions">
              <button type="submit">Pagar con MercadoPago</button>
            </div>
          </form>
        </div>

        <div className="panel-card">
          <h3>Mis pagos</h3>
          <table className="table-premium">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Checkout</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={5} className="empty-inline">Sin pagos registrados.</td></tr>
              ) : payments.map((payment) => (
                <tr key={`student-payment-${payment.id}`}>
                  <td>{payment.id}</td>
                  <td>{payment.payment_type === "class_single" ? "Clase" : "Membresia"}</td>
                  <td>{formatMoney(payment.amount, payment.currency)}</td>
                  <td>{getPaymentStatusLabel(payment.status)}</td>
                  <td>
                    {payment.checkout_url ? (
                      <a href={payment.checkout_url} target="_blank" rel="noreferrer">Ir a pagar</a>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      {isSSOCallbackPath(pathname)
        ? renderSSOCallback
        : isDiscoverPath(pathname)
          ? renderDiscoverCenters
        : isAboutPath(pathname)
          ? renderAbout
        : isPricingPath(pathname)
          ? renderPricing
        : !token || !getPortalByPath(pathname)
          ? renderLogin
        : getPortalByPath(pathname) === "platform_admin"
            ? renderPlatformAdminPortal
            : getPortalByPath(pathname) === "owner"
            ? renderOwnerPortal
              : renderStudentPortal}

      <button
        type="button"
        className="help-fab"
        onClick={() => {
          setAccessibilityOpen(false);
          setHelpOpen((prev) => !prev);
        }}
        aria-label="Abrir menu de ayuda"
        title="Ayuda contextual"
      >
        ?
      </button>

      {helpOpen ? (
        <aside className="help-panel" role="dialog" aria-label="Menu de ayuda">
          <header className="help-panel-header">
            <div>
              <strong>{helpContent.title}</strong>
              <p>{helpContent.subtitle}</p>
            </div>
            <button type="button" onClick={() => setHelpOpen(false)} aria-label="Cerrar ayuda">×</button>
          </header>
          <div className="help-panel-body">
            <ul className="help-list">
              {helpContent.items.map((item, index) => (
                <li key={`help-item-${helpContextKey}-${index}`}>{item}</li>
              ))}
            </ul>
            <div className="help-actions">
              {getHelpActions().map((item) => (
                <button
                  key={`help-action-${item.label}`}
                  type="button"
                  className="secondary-btn"
                  onClick={item.action}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      ) : null}

      <button
        type="button"
        className="a11y-fab"
        onClick={() => {
          setHelpOpen(false);
          setAccessibilityOpen((prev) => !prev);
        }}
        aria-label="Abrir menu de accesibilidad"
        title="Accessibility Menu (CTRL+U)"
      >
        <span>?</span>
      </button>

      {accessibilityOpen ? (
        <aside className="a11y-panel" role="dialog" aria-label="Accessibility Menu">
          <header className="a11y-panel-header">
            <strong>Accessibility Menu (CTRL+U)</strong>
            <button type="button" onClick={() => setAccessibilityOpen(false)} aria-label="Cerrar menu">×</button>
          </header>
          <div className="a11y-grid">
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`a11y-tile ${accessibilityState[option.key] ? "active" : ""}`}
                onClick={() => toggleAccessibilityOption(option.key)}
              >
                <span className="a11y-icon">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          {accessibilityState.screenReader ? (
            <div className="a11y-screenreader-tools">
              <button type="button" onClick={() => speakText("Prueba de lectura activada.")}>
                Probar lector
              </button>
              <span>{screenReaderStatus || "Listo para leer elementos con foco o click."}</span>
            </div>
          ) : null}
        </aside>
      ) : null}

      {token && error ? <p className="global-error">{error}</p> : null}
    </div>
  );
}

export default App;




