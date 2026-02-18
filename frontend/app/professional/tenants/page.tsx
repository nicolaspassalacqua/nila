"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession, setActiveTenant } from "@/lib/session";

type Company = {
  id: number;
  trade_name: string;
  primary_zone: string;
  currency: string;
  tax_rate_percent: string;
  legal_name: string;
  tax_condition: string;
  cuit: string;
  billing_address: string;
  email: string;
  phone: string;
  description: string;
  is_active: boolean;
};

type CompanyProfileResponse = {
  configured: boolean;
  company: Company | null;
  tax_condition_locked?: boolean;
};

type Tenant = {
  id: number;
  name: string;
  company_name?: string;
  photo_url?: string;
  address?: string;
  description?: string;
  revenue_model: string;
  establishment_type: string;
  court_config: CourtConfig[];
  capacity: number;
  opening_hours: string;
  cancellation_policy: string;
  tolerance_minutes: number;
  allow_online_payments: boolean;
  allow_local_payments: boolean;
  prepay_required: boolean;
  cancellation_penalty_percent: string;
  slug: string;
  plan: string;
  is_active: boolean;
};

type CourtSport = "futbol" | "padel" | "tenis" | "otro";

type CourtConfig = {
  name: string;
  sport: CourtSport;
  capacity: number;
};

type SetupStatus = {
  tenant_id: number;
  services_count: number;
  subscription_plans_count: number;
  payments_enabled: boolean;
  prepay_required: boolean;
  cancellation_penalty_percent: string;
};

type CuitLookupResponse = {
  found: boolean;
  detail?: string;
  source?: string;
  company?: {
    trade_name?: string;
    legal_name?: string;
    tax_condition?: string;
    billing_address?: string;
    primary_zone?: string;
  };
};

export default function ProfessionalTenantsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [activeTenantId, setActiveTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [companyConfigured, setCompanyConfigured] = useState(false);
  const [taxConditionLocked, setTaxConditionLocked] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  const [tradeName, setTradeName] = useState("Mi Empresa");
  const [primaryZone, setPrimaryZone] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxCondition, setTaxCondition] = useState("monotributo");
  const [cuit, setCuit] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const [name, setName] = useState("Sucursal Centro");
  const [photoUrl, setPhotoUrl] = useState("");
  const [address, setAddress] = useState("Av. Principal 123, Ciudad");
  const [description, setDescription] = useState("Establecimiento orientado a servicios profesionales.");
  const [revenueModel, setRevenueModel] = useState("mixto");
  const [establishmentType, setEstablishmentType] = useState("sala");
  const [capacity, setCapacity] = useState("1");
  const [courtCount, setCourtCount] = useState("1");
  const [courts, setCourts] = useState<CourtConfig[]>([{ name: "Cancha 1", sport: "futbol", capacity: 10 }]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["lun", "mar", "mie", "jue", "vie"]);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [splitShift, setSplitShift] = useState(false);
  const [openTime2, setOpenTime2] = useState("16:00");
  const [closeTime2, setCloseTime2] = useState("20:00");
  const [openingHours, setOpeningHours] = useState("Lun a Vie 08:00-20:00");
  const [cancellationPolicy, setCancellationPolicy] = useState("Cancelacion sin cargo hasta 24h antes.");
  const [toleranceMinutes, setToleranceMinutes] = useState("10");
  const [allowOnlinePayments, setAllowOnlinePayments] = useState(false);
  const [allowLocalPayments, setAllowLocalPayments] = useState(true);
  const [prepayRequired, setPrepayRequired] = useState(false);
  const [cancellationPenaltyPercent, setCancellationPenaltyPercent] = useState("0");
  const [branchFormVisible, setBranchFormVisible] = useState(false);
  const [drawerPhase, setDrawerPhase] = useState<"open" | "closing">("open");
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [drawerFeedback, setDrawerFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [cuitLookupState, setCuitLookupState] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [cuitLookupLoading, setCuitLookupLoading] = useState(false);
  const [log, setLog] = useState("Listo");

  const activeTenant = useMemo(
    () => tenants.find((tenant) => String(tenant.id) === activeTenantId),
    [tenants, activeTenantId]
  );

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    setActiveTenantId(session.tenantId || "");
    void refresh(session.token, session.tenantId || "");
  }, [router]);

  useEffect(() => {
    if (!activeTenant) return;
    setName(activeTenant.name || "");
    setPhotoUrl(activeTenant.photo_url || "");
    setAddress(activeTenant.address || "");
    setDescription(activeTenant.description || "");
    setRevenueModel(activeTenant.revenue_model || "mixto");
    setEstablishmentType(activeTenant.establishment_type || "sala");
    setCapacity(String(activeTenant.capacity || 1));
    const loadedCourts = normalizeCourtConfig(activeTenant.court_config);
    if (loadedCourts.length > 0) {
      setCourts(loadedCourts);
      setCourtCount(String(loadedCourts.length));
    } else {
      setCourts([defaultCourt(0)]);
      setCourtCount("1");
    }
    const loadedOpeningHours = activeTenant.opening_hours || "";
    setOpeningHours(loadedOpeningHours);
    const parsedSchedule = parseSchedule(loadedOpeningHours);
    if (parsedSchedule) {
      setSelectedDays(parsedSchedule.days);
      setOpenTime(parsedSchedule.open);
      setCloseTime(parsedSchedule.close);
      if (parsedSchedule.open2 && parsedSchedule.close2) {
        setSplitShift(true);
        setOpenTime2(parsedSchedule.open2);
        setCloseTime2(parsedSchedule.close2);
      } else {
        setSplitShift(false);
      }
    }
    setCancellationPolicy(activeTenant.cancellation_policy || "");
    setToleranceMinutes(String(activeTenant.tolerance_minutes ?? 10));
    setAllowOnlinePayments(Boolean(activeTenant.allow_online_payments));
    setAllowLocalPayments(Boolean(activeTenant.allow_local_payments));
    setPrepayRequired(Boolean(activeTenant.prepay_required));
    setCancellationPenaltyPercent(activeTenant.cancellation_penalty_percent || "0");
  }, [activeTenant]);

  useEffect(() => {
    if (establishmentType !== "cancha") return;
    const total = totalCourtCapacity(courts);
    setCapacity(String(total > 0 ? total : 1));
  }, [establishmentType, courts]);

  async function refresh(activeToken = token, selectedTenantId = activeTenantId) {
    try {
      const [companyData, tenantData] = await Promise.all([
        apiRequest<CompanyProfileResponse>("/company-profile", { token: activeToken }),
        apiRequest<Tenant[]>("/tenants", { token: activeToken }),
      ]);

      setCompanyConfigured(companyData.configured);
      setTaxConditionLocked(Boolean(companyData.tax_condition_locked));
      if (companyData.company) {
        setTradeName(companyData.company.trade_name || "");
        setPrimaryZone(companyData.company.primary_zone || "");
        setCurrency(companyData.company.currency || "ARS");
        setTaxRatePercent(String(companyData.company.tax_rate_percent || "0"));
        setLegalName(companyData.company.legal_name || "");
        setTaxCondition(companyData.company.tax_condition || "monotributo");
        setCuit(companyData.company.cuit || "");
        setBillingAddress(companyData.company.billing_address || "");
        setCompanyEmail(companyData.company.email || "");
        setCompanyPhone(companyData.company.phone || "");
        setCompanyDescription(companyData.company.description || "");
      }

      setTenants(tenantData);

      const effectiveTenantId = selectedTenantId || (tenantData[0] ? String(tenantData[0].id) : "");
      if (effectiveTenantId) {
        if (!selectedTenantId) {
          setActiveTenantId(effectiveTenantId);
          setActiveTenant(effectiveTenantId);
        }
        const status = await apiRequest<SetupStatus>(`/tenants/${effectiveTenantId}/setup-status`, {
          token: activeToken,
        });
        setSetupStatus(status);
      } else {
        setSetupStatus(null);
      }

      setLog("Onboarding actualizado");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  async function saveCompany() {
    try {
      const body = {
        trade_name: tradeName,
        primary_zone: primaryZone,
        currency,
        tax_rate_percent: resolveTaxRate(),
        legal_name: legalName,
        tax_condition: taxCondition,
        cuit,
        billing_address: billingAddress,
        email: companyEmail,
        phone: companyPhone,
        description: companyDescription,
      };
      const method = companyConfigured ? "PATCH" : "POST";
      await apiRequest<CompanyProfileResponse>("/company-profile", { method, token, body });
      await refresh();
      setLog(companyConfigured ? "Empresa actualizada" : "Empresa creada");
    } catch (error: any) {
      setLog(`Error guardando empresa: ${error.message}`);
    }
  }

  async function createTenant() {
    if (!companyConfigured) {
      setLog("Primero debes crear la empresa.");
      return;
    }
    try {
      const internalSlug = buildInternalSlug(name);
      const created = await apiRequest<Tenant>("/tenants", {
        method: "POST",
        token,
        body: {
          name,
          photo_url: photoUrl,
          address,
          description,
          revenue_model: revenueModel,
          establishment_type: establishmentType,
          court_config: establishmentType === "cancha" ? normalizeCourtConfig(courts) : [],
          capacity: establishmentType === "cancha" ? totalCourtCapacity(courts) || 1 : Number(capacity || 1),
          opening_hours: composeSchedule(),
          cancellation_policy: cancellationPolicy,
          tolerance_minutes: Number(toleranceMinutes || 10),
          allow_online_payments: allowOnlinePayments,
          allow_local_payments: allowLocalPayments,
          prepay_required: prepayRequired,
          cancellation_penalty_percent: cancellationPenaltyPercent,
          slug: internalSlug,
          plan: "starter",
          is_active: true,
        },
      });
      const idAsString = String(created.id);
      setActiveTenantId(idAsString);
      setActiveTenant(idAsString);
      await refresh(token, idAsString);
      setLog(`Sucursal creada: ${created.name}`);
      setFeedback({ type: "ok", text: `Sucursal creada correctamente: ${created.name}.` });
      setDrawerFeedback(null);
      closeBranchDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      const reason = parseApiReason(error);
      setLog(`No se pudo crear la sucursal. Motivo: ${reason}`);
      setDrawerFeedback({ type: "error", text: `No se pudo crear la sucursal. Motivo: ${reason}` });
    }
  }

  async function saveActiveTenant() {
    if (!activeTenant) {
      setLog("Selecciona un establecimiento.");
      return;
    }
    try {
      const internalSlug = buildInternalSlug(name);
      await apiRequest<Tenant>(`/tenants/${activeTenant.id}`, {
        method: "PATCH",
        token,
        body: {
          name,
          photo_url: photoUrl,
          address,
          description,
          revenue_model: revenueModel,
          establishment_type: establishmentType,
          court_config: establishmentType === "cancha" ? normalizeCourtConfig(courts) : [],
          capacity: establishmentType === "cancha" ? totalCourtCapacity(courts) || 1 : Number(capacity || 1),
          opening_hours: composeSchedule(),
          cancellation_policy: cancellationPolicy,
          tolerance_minutes: Number(toleranceMinutes || 10),
          allow_online_payments: allowOnlinePayments,
          allow_local_payments: allowLocalPayments,
          prepay_required: prepayRequired,
          cancellation_penalty_percent: cancellationPenaltyPercent,
          slug: internalSlug,
        },
      });
      await refresh(token, String(activeTenant.id));
      setLog(`Establecimiento actualizado: ${name}`);
      setFeedback({ type: "ok", text: `Cambios guardados correctamente en ${name}.` });
      setDrawerFeedback(null);
      closeBranchDrawer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      setLog(`Error actualizando establecimiento: ${error.message}`);
      const reason = parseApiReason(error);
      setDrawerFeedback({ type: "error", text: `No se pudieron guardar los cambios. Motivo: ${reason}` });
    }
  }

  function resetBranchForm() {
    setName("Sucursal Centro");
    setPhotoUrl("");
    setAddress("Av. Principal 123, Ciudad");
    setDescription("Establecimiento orientado a servicios profesionales.");
    setRevenueModel("mixto");
    setEstablishmentType("sala");
    setCapacity("1");
    setCourtCount("1");
    setCourts([defaultCourt(0)]);
    setSelectedDays(["lun", "mar", "mie", "jue", "vie"]);
    setOpenTime("08:00");
    setCloseTime("20:00");
    setSplitShift(false);
    setOpenTime2("16:00");
    setCloseTime2("20:00");
    setOpeningHours("Lun a Vie 08:00-20:00");
    setCancellationPolicy("Cancelacion sin cargo hasta 24h antes.");
    setToleranceMinutes("10");
    setAllowOnlinePayments(false);
    setAllowLocalPayments(true);
    setPrepayRequired(false);
    setCancellationPenaltyPercent("0");
  }

  function startCreateBranch() {
    setEditingTenantId(null);
    setFeedback(null);
    setDrawerFeedback(null);
    resetBranchForm();
    setDrawerPhase("open");
    setBranchFormVisible(true);
  }

  function startEditBranch(tenant: Tenant) {
    setEditingTenantId(tenant.id);
    setFeedback(null);
    setDrawerFeedback(null);
    setDrawerPhase("open");
    setBranchFormVisible(true);
    setActiveTenantId(String(tenant.id));
    setActiveTenant(String(tenant.id));
    setName(tenant.name || "");
    setPhotoUrl(tenant.photo_url || "");
    setAddress(tenant.address || "");
    setDescription(tenant.description || "");
    setRevenueModel(tenant.revenue_model || "mixto");
    setEstablishmentType(tenant.establishment_type || "sala");
    setCapacity(String(tenant.capacity || 1));
    const loadedCourts = normalizeCourtConfig(tenant.court_config);
    if (loadedCourts.length > 0) {
      setCourts(loadedCourts);
      setCourtCount(String(loadedCourts.length));
    } else {
      setCourts([defaultCourt(0)]);
      setCourtCount("1");
    }
    const loadedOpeningHours = tenant.opening_hours || "";
    setOpeningHours(loadedOpeningHours);
    const parsedSchedule = parseSchedule(loadedOpeningHours);
    if (parsedSchedule) {
      setSelectedDays(parsedSchedule.days);
      setOpenTime(parsedSchedule.open);
      setCloseTime(parsedSchedule.close);
      if (parsedSchedule.open2 && parsedSchedule.close2) {
        setSplitShift(true);
        setOpenTime2(parsedSchedule.open2);
        setCloseTime2(parsedSchedule.close2);
      } else {
        setSplitShift(false);
      }
    }
    setCancellationPolicy(tenant.cancellation_policy || "");
    setToleranceMinutes(String(tenant.tolerance_minutes ?? 10));
    setAllowOnlinePayments(Boolean(tenant.allow_online_payments));
    setAllowLocalPayments(Boolean(tenant.allow_local_payments));
    setPrepayRequired(Boolean(tenant.prepay_required));
    setCancellationPenaltyPercent(tenant.cancellation_penalty_percent || "0");
  }

  async function saveBranch() {
    if (editingTenantId) {
      await saveActiveTenant();
      return;
    }
    await createTenant();
  }

  function closeBranchDrawer() {
    setDrawerPhase("closing");
    setTimeout(() => {
      setBranchFormVisible(false);
      setEditingTenantId(null);
      setDrawerFeedback(null);
      setDrawerPhase("open");
    }, 180);
  }

  async function deleteTenant(id: number) {
    const target = tenants.find((item) => item.id === id);
    const confirmation = window.confirm(`Eliminar establecimiento "${target?.name || id}"?`);
    if (!confirmation) return;

    try {
      await apiRequest(`/tenants/${id}`, { method: "DELETE", token });
      if (String(id) === activeTenantId) {
        setActiveTenantId("");
        setActiveTenant("");
      }
      await refresh();
      setLog(`Establecimiento eliminado: ${target?.name || id}`);
    } catch (error: any) {
      setLog(`Error eliminando establecimiento: ${error.message}`);
    }
  }

  function goToServicesWithTenant(id: number) {
    const idAsString = String(id);
    setActiveTenantId(idAsString);
    setActiveTenant(idAsString);
    router.push("/professional/services");
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  function resolveTaxRate(): string {
    if (taxRatePercent.trim() !== "") return taxRatePercent;
    if (taxCondition === "responsable_inscripto") return "21";
    return "0";
  }

  async function lookupCuitAfip() {
    const digits = cuit.replace(/\D/g, "");
    if (digits.length !== 11) return;

    setCuitLookupLoading(true);
    setCuitLookupState(null);
    try {
      const data = await apiRequest<CuitLookupResponse>(`/company-profile/cuit-lookup?cuit=${digits}`, { token });
      if (!data.found) {
        setCuitLookupState({
          type: "error",
          text: data.detail || "No se encontraron datos para ese CUIT. Completa manualmente.",
        });
        return;
      }

      const payload = data.company || {};
      if (payload.trade_name) setTradeName(payload.trade_name);
      if (payload.legal_name) setLegalName(payload.legal_name);
      if (payload.tax_condition && !taxConditionLocked) setTaxCondition(payload.tax_condition);
      if (payload.billing_address) setBillingAddress(payload.billing_address);
      if (payload.primary_zone) setPrimaryZone(payload.primary_zone);
      setCuitLookupState({ type: "ok", text: "CUIT validado. Datos autocompletados desde AFIP." });
    } catch (error: any) {
      const reason = parseApiReason(error);
      setCuitLookupState({
        type: "error",
        text: `No se pudo validar CUIT con AFIP. Completa manualmente. (${reason})`,
      });
    } finally {
      setCuitLookupLoading(false);
    }
  }

  function parseApiReason(error: any): string {
    const raw = String(error?.message || "Error inesperado");
    const marker = " :: ";
    if (!raw.includes(marker)) return raw;
    const payload = raw.split(marker)[1] || "";
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === "string") return parsed;
      if (parsed?.detail) return String(parsed.detail);
      const firstKey = Object.keys(parsed || {})[0];
      if (!firstKey) return raw;
      const value = parsed[firstKey];
      if (Array.isArray(value)) return `${firstKey}: ${value.join(", ")}`;
      return `${firstKey}: ${String(value)}`;
    } catch {
      return payload || raw;
    }
  }

  function buildInternalSlug(rawName: string): string {
    const normalized = rawName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || "sucursal";
  }

  function defaultCapacityBySport(sport: CourtSport): number {
    if (sport === "futbol") return 14;
    if (sport === "padel") return 4;
    if (sport === "tenis") return 4;
    return 6;
  }

  function formatCourtSport(sport: CourtSport): string {
    if (sport === "futbol") return "Futbol";
    if (sport === "padel") return "Padel";
    if (sport === "tenis") return "Tenis";
    return "Otro";
  }

  function defaultCourt(index: number, sport: CourtSport = "futbol"): CourtConfig {
    return {
      name: `Cancha ${index + 1}`,
      sport,
      capacity: defaultCapacityBySport(sport),
    };
  }

  function normalizeCourtConfig(raw: unknown): CourtConfig[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const source = item as Record<string, unknown>;
        const rawSport = String(source.sport || "otro").toLowerCase();
        const sport: CourtSport =
          rawSport === "futbol" || rawSport === "padel" || rawSport === "tenis" ? rawSport : "otro";
        const parsedCapacity = Number(source.capacity || 1);
        const resolvedCapacity = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : 1;
        const name = String(source.name || "").trim() || `Cancha ${index + 1}`;
        return { name, sport, capacity: resolvedCapacity };
      })
      .filter((item): item is CourtConfig => Boolean(item));
  }

  function totalCourtCapacity(items: CourtConfig[]): number {
    return items.reduce((sum, court) => sum + Number(court.capacity || 0), 0);
  }

  function syncCourtsFromCount(nextCountRaw: string) {
    const parsed = Number(nextCountRaw);
    const nextCount = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    setCourtCount(String(nextCount));
    setCourts((current) => {
      const draft = [...current];
      if (draft.length < nextCount) {
        for (let index = draft.length; index < nextCount; index += 1) {
          draft.push(defaultCourt(index));
        }
      } else if (draft.length > nextCount) {
        draft.length = nextCount;
      }
      return draft.map((court, index) => ({
        ...court,
        name: court.name?.trim() ? court.name : `Cancha ${index + 1}`,
      }));
    });
  }

  function updateCourt(index: number, patch: Partial<CourtConfig>) {
    setCourts((current) =>
      current.map((court, idx) => {
        if (idx !== index) return court;
        return { ...court, ...patch };
      })
    );
  }

  function addCourt() {
    setCourts((current) => {
      const next = [...current, defaultCourt(current.length)];
      setCourtCount(String(next.length));
      return next;
    });
  }

  function addCourtBySport(sport: CourtSport) {
    setCourts((current) => {
      const next = [...current, defaultCourt(current.length, sport)];
      setCourtCount(String(next.length));
      return next;
    });
  }

  function removeCourt(index: number) {
    setCourts((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, idx) => idx !== index);
      setCourtCount(String(next.length));
      return next;
    });
  }

  function formatRevenueModel(value: string): string {
    if (value === "turnos") return "Turnos";
    if (value === "suscripciones") return "Suscripciones";
    if (value === "mixto") return "Mixto";
    return value || "-";
  }

  function formatEstablishmentType(value: string): string {
    if (value === "sala") return "Sala";
    if (value === "cabina") return "Cabina";
    if (value === "puesto") return "Puesto";
    if (value === "cancha") return "Cancha";
    return value || "-";
  }

  function composeSchedule(): string {
    const daysLabel = formatDays(selectedDays);
    if (!daysLabel || !openTime || !closeTime) return openingHours;
    const firstShift = `${openTime}-${closeTime}`;
    if (splitShift && openTime2 && closeTime2) {
      return `${daysLabel} ${firstShift} | ${openTime2}-${closeTime2}`;
    }
    return `${daysLabel} ${firstShift}`;
  }

  function formatDays(days: string[]): string {
    const order = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
    const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const labels: Record<string, string> = {
      lun: "Lun",
      mar: "Mar",
      mie: "Mie",
      jue: "Jue",
      vie: "Vie",
      sab: "Sab",
      dom: "Dom",
    };
    return sorted.map((d) => labels[d]).join(", ");
  }

  function parseSchedule(
    raw: string
  ): { days: string[]; open: string; close: string; open2?: string; close2?: string } | null {
    const parts = raw.split(" ");
    if (parts.length < 2) return null;

    const rangeParts = raw.match(/(\d{2}:\d{2})-(\d{2}:\d{2})(?:\s\|\s(\d{2}:\d{2})-(\d{2}:\d{2}))?/);
    if (!rangeParts) return null;

    const dayLabel = raw.slice(0, raw.indexOf(rangeParts[0])).trim();
    const labelsToCode: Record<string, string> = {
      Lun: "lun",
      Mar: "mar",
      Mie: "mie",
      Jue: "jue",
      Vie: "vie",
      Sab: "sab",
      Dom: "dom",
    };
    const days = dayLabel
      .split(",")
      .map((item) => item.trim())
      .map((item) => labelsToCode[item])
      .filter(Boolean);

    if (!days.length) return null;
    return {
      days,
      open: rangeParts[1],
      close: rangeParts[2],
      open2: rangeParts[3],
      close2: rangeParts[4],
    };
  }

  function toggleDay(day: string) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  }

  const checklist = [
    { label: "Empresa creada", done: companyConfigured },
    { label: "Sucursal creada", done: tenants.length > 0 },
    { label: "Servicios configurados", done: (setupStatus?.services_count || 0) > 0 },
    { label: "Cobros activados", done: Boolean(setupStatus?.payments_enabled) },
    { label: "Suscripciones creadas", done: (setupStatus?.subscription_plans_count || 0) > 0 },
  ];
  const completedSteps = checklist.filter((item) => item.done).length;
  const progressPercent = Math.round((completedSteps / checklist.length) * 100);
  const nextStepLabel = !companyConfigured
    ? "Completa la empresa"
    : tenants.length === 0
      ? "Crea tu primera sucursal"
      : (setupStatus?.services_count || 0) === 0
        ? "Configura tus servicios"
        : !setupStatus?.payments_enabled
          ? "Activa cobros"
          : (setupStatus?.subscription_plans_count || 0) === 0
            ? "Crea tu primera suscripcion"
            : "Onboarding completado";
  const courtsBySport = courts.reduce(
    (acc, court) => {
      acc[court.sport] += 1;
      return acc;
    },
    { futbol: 0, padel: 0, tenis: 0, otro: 0 } as Record<CourtSport, number>
  );

  return (
    <main className="onboardingPage">
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Onboarding de negocio</h1>
      <p className="small">Configura tu operacion paso a paso. Menos friccion, mas claridad.</p>
      {feedback && feedback.type === "ok" ? (
        <div className={`feedbackBanner ${feedback.type === "ok" ? "ok" : "error"}`} role="status">
          {feedback.text}
        </div>
      ) : null}

      <section className="card onboardingOverview">
        <h2>Checklist de activacion</h2>
        <div className="onboardingProgressRow">
          <div className="onboardingProgressMeta">
            <strong>{completedSteps}/{checklist.length} pasos</strong>
            <span className="small">Proximo paso: {nextStepLabel}</span>
          </div>
          <div className="onboardingProgressBar" aria-label="Progreso onboarding">
            <div className="onboardingProgressBarFill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="badge">{progressPercent}%</span>
        </div>

        <ul className="onboardingChecklist">
          {checklist.map((item) => (
            <li key={item.label} className={item.done ? "done" : "pending"}>
              <span className="statusDot" aria-hidden="true" />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="linkRow onboardingActions">
          <button className="mutedBtn" onClick={saveActiveTenant} disabled={!companyConfigured || !activeTenant}>Activar cobros</button>
          <Link className="mutedBtn" href="/professional/workspace">Crear suscripcion</Link>
        </div>
        <p className="small">Sugeridos deportes: alquiler de cancha, clase de tenis/padel, escuela de futbol, entrenamiento personalizado.</p>
      </section>

      <section className="card onboardingStep">
        <h2>Paso 1: Alta de empresa</h2>
        <p className="small">Define identidad fiscal y comercial. Es requisito para habilitar sucursales.</p>
        <div className="formGrid">
          <input className="input" value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Nombre comercial" />
          <input className="input" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Razon social" />
          <input className="input" value={primaryZone} onChange={(e) => setPrimaryZone(e.target.value)} placeholder="Ciudad / zona principal" />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            onBlur={() => void lookupCuitAfip()}
            placeholder="CUIT"
          />
          <button className="mutedBtn" type="button" onClick={() => void lookupCuitAfip()} disabled={cuitLookupLoading}>
            {cuitLookupLoading ? "Validando CUIT..." : "Validar CUIT AFIP"}
          </button>
          <div />
        </div>
        {cuitLookupState ? (
          <p className={`small ${cuitLookupState.type === "error" ? "cuitLookupError" : "cuitLookupOk"}`}>{cuitLookupState.text}</p>
        ) : (
          <p className="small">Al completar CUIT se intenta autocompletar desde AFIP. Si no hay respuesta, puedes cargar manualmente.</p>
        )}
        <div className="formGrid" style={{ marginTop: 8 }}>
          <select
            className="input"
            value={taxCondition}
            onChange={(e) => setTaxCondition(e.target.value)}
            disabled={taxConditionLocked}
          >
            <option value="monotributo">Monotributista</option>
            <option value="responsable_inscripto">Responsable inscripto</option>
            <option value="exento">Exento</option>
            <option value="consumidor_final">Consumidor final</option>
          </select>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="ARS">Peso argentino (ARS)</option>
          </select>
          <select className="input" value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)}>
            <option value="">Alicuota IVA (segun condicion fiscal)</option>
            <option value="21">IVA general 21%</option>
            <option value="10.5">IVA reducido 10.5%</option>
            <option value="27">IVA incrementado 27%</option>
            <option value="0">Exento / No aplica (0%)</option>
          </select>
        </div>
        <p className="small">Estandar AR: Responsable inscripto sugiere 21%. Monotributo/Exento/Consumidor final sugiere 0%.</p>
        {taxConditionLocked ? (
          <p className="small">Condicion fiscal bloqueada: ya existe al menos una factura emitida.</p>
        ) : null}
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input className="input" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Direccion fiscal" />
          <input className="input" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="Email empresa" />
          <input className="input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="Telefono empresa" />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input className="input" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Descripcion de la empresa" />
          <div />
          <button className="linkBtn" onClick={saveCompany}>
            {companyConfigured ? "Actualizar empresa" : "Crear empresa"}
          </button>
        </div>
      </section>

      {companyConfigured ? (
        <>
          <section className="card onboardingStep">
            <h2>Paso 2: Alta de sucursal</h2>
            <p className="small">Agrega una sucursal nueva o edita una existente.</p>
            <div className="linkRow" style={{ marginTop: 8 }}>
              <button className="linkBtn" onClick={startCreateBranch}>Agregar sucursal</button>
              {branchFormVisible ? <button className="mutedBtn" onClick={closeBranchDrawer}>Cerrar panel</button> : null}
            </div>
            <p className="small" style={{ marginTop: 8 }}>Haz clic en "Agregar sucursal" o en "Editar" desde la lista.</p>
          </section>

          <section className="card">
            <h2>Sucursales disponibles</h2>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th>Horario</th>
                    <th>Modalidad</th>
                    <th>Tipo</th>
                    <th>Capacidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td>{tenant.name}</td>
                      <td>{tenant.opening_hours || "Sin definir"}</td>
                      <td>{formatRevenueModel(tenant.revenue_model)}</td>
                      <td>{formatEstablishmentType(tenant.establishment_type)}</td>
                      <td>{tenant.capacity}</td>
                      <td>
                        <div className="tableActions">
                          <button className="linkBtn" onClick={() => goToServicesWithTenant(tenant.id)}>Configurar servicios</button>
                          <button className="mutedBtn" onClick={() => startEditBranch(tenant)}>Editar</button>
                          <button className="mutedBtn" onClick={() => void deleteTenant(tenant.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="card">
          <h2>Paso 2 bloqueado</h2>
          <p>Primero debes crear la empresa para habilitar sucursales y operacion.</p>
        </section>
      )}

      {branchFormVisible ? (
        <div className={`drawerBackdrop ${drawerPhase === "closing" ? "isClosing" : "isOpen"}`} onClick={closeBranchDrawer}>
          <aside className={`drawerPanel ${drawerPhase === "closing" ? "isClosing" : "isOpen"}`} onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <h2>{editingTenantId ? "Editar sucursal" : "Agregar sucursal"}</h2>
              <button className="mutedBtn" onClick={closeBranchDrawer}>Cerrar</button>
            </div>
            {drawerFeedback ? (
              <div className={`feedbackBanner ${drawerFeedback.type === "ok" ? "ok" : "error"}`} role="status">
                {drawerFeedback.text}
              </div>
            ) : null}
            <div className="drawerBody">
              <div className="formGrid">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del establecimiento" />
                <select className="input" value={revenueModel} onChange={(e) => setRevenueModel(e.target.value)}>
                  <option value="turnos">Turnos</option>
                  <option value="suscripciones">Suscripciones</option>
                  <option value="mixto">Mixto</option>
                </select>
                <select className="input" value={establishmentType} onChange={(e) => setEstablishmentType(e.target.value)}>
                  <option value="sala">Sala</option>
                  <option value="cabina">Cabina</option>
                  <option value="puesto">Puesto</option>
                  <option value="cancha">Cancha</option>
                </select>
              </div>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="URL foto establecimiento (opcional)"
                />
                <div />
                <div />
              </div>
              {establishmentType === "cancha" ? (
                <>
                  <section className="courtBuilder">
                    <div className="courtBuilderHeader">
                      <div>
                        <h3>Configuracion de canchas</h3>
                        <p className="small">Define canchas individuales y su capacidad.</p>
                      </div>
                      <div className="courtSummaryChips">
                        <span className="badge">{courts.length} canchas</span>
                        <span className="badge">{totalCourtCapacity(courts)} capacidad total</span>
                        {courtsBySport.futbol > 0 ? <span className="badge">{courtsBySport.futbol} Futbol</span> : null}
                        {courtsBySport.padel > 0 ? <span className="badge">{courtsBySport.padel} Padel</span> : null}
                        {courtsBySport.tenis > 0 ? <span className="badge">{courtsBySport.tenis} Tenis</span> : null}
                      </div>
                    </div>

                    <div className="courtTopControls">
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={courtCount}
                        onChange={(e) => setCourtCount(e.target.value)}
                        placeholder="Cantidad de canchas"
                      />
                      <button className="mutedBtn" type="button" onClick={() => syncCourtsFromCount(courtCount)}>
                        Ajustar cantidad
                      </button>
                      <button className="mutedBtn" type="button" onClick={() => addCourtBySport("futbol")}>
                        + Futbol
                      </button>
                      <button className="mutedBtn" type="button" onClick={() => addCourtBySport("padel")}>
                        + Padel
                      </button>
                      <button className="mutedBtn" type="button" onClick={() => addCourtBySport("tenis")}>
                        + Tenis
                      </button>
                      <button className="mutedBtn" type="button" onClick={addCourt}>
                        + Otra cancha
                      </button>
                    </div>

                    <div className="courtCards">
                    {courts.map((court, index) => (
                      <article className="courtCard" key={`${court.name}-${index}`}>
                        <div className="courtCardMeta">
                          <strong>Cancha {index + 1}</strong>
                          <span className="small">{formatCourtSport(court.sport)}</span>
                        </div>
                        <div className="formGrid">
                        <input
                          className="input"
                          value={court.name}
                          onChange={(e) => updateCourt(index, { name: e.target.value })}
                          placeholder={`Cancha ${index + 1}`}
                        />
                        <select
                          className="input"
                          value={court.sport}
                          onChange={(e) => updateCourt(index, { sport: e.target.value as CourtSport })}
                        >
                          <option value="futbol">Futbol</option>
                          <option value="padel">Padel</option>
                          <option value="tenis">Tenis</option>
                          <option value="otro">Otro</option>
                        </select>
                        <div className="linkRow" style={{ marginTop: 0 }}>
                          <input
                            className="input"
                            type="number"
                            min={1}
                            value={court.capacity}
                            onChange={(e) => updateCourt(index, { capacity: Number(e.target.value || 1) })}
                            placeholder="Capacidad cancha"
                          />
                          <button className="mutedBtn courtRemoveBtn" type="button" onClick={() => removeCourt(index)}>
                            Quitar
                          </button>
                        </div>
                        </div>
                      </article>
                    ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="formGrid" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Capacidad (personas/recursos)"
                  />
                  <div />
                  <div />
                </div>
              )}
              <div className="formGrid" style={{ marginTop: 8 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <p className="small" style={{ marginBottom: 6 }}>Dias de atencion</p>
                  <div className="chipRow" style={{ marginTop: 0 }}>
                    <button type="button" className={`chip ${selectedDays.includes("lun") ? "active" : ""}`} onClick={() => toggleDay("lun")}>Lun</button>
                    <button type="button" className={`chip ${selectedDays.includes("mar") ? "active" : ""}`} onClick={() => toggleDay("mar")}>Mar</button>
                    <button type="button" className={`chip ${selectedDays.includes("mie") ? "active" : ""}`} onClick={() => toggleDay("mie")}>Mie</button>
                    <button type="button" className={`chip ${selectedDays.includes("jue") ? "active" : ""}`} onClick={() => toggleDay("jue")}>Jue</button>
                    <button type="button" className={`chip ${selectedDays.includes("vie") ? "active" : ""}`} onClick={() => toggleDay("vie")}>Vie</button>
                    <button type="button" className={`chip ${selectedDays.includes("sab") ? "active" : ""}`} onClick={() => toggleDay("sab")}>Sab</button>
                    <button type="button" className={`chip ${selectedDays.includes("dom") ? "active" : ""}`} onClick={() => toggleDay("dom")}>Dom</button>
                  </div>
                </div>
                <input className="input" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                <input className="input" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                <label className="onboardingCheck"><input type="checkbox" checked={splitShift} onChange={(e) => setSplitShift(e.target.checked)} /> Turno cortado</label>
              </div>
              {splitShift ? (
                <div className="formGrid" style={{ marginTop: 8 }}>
                  <input className="input" type="time" value={openTime2} onChange={(e) => setOpenTime2(e.target.value)} />
                  <input className="input" type="time" value={closeTime2} onChange={(e) => setCloseTime2(e.target.value)} />
                  <div />
                </div>
              ) : null}
              <div className="formGrid" style={{ marginTop: 8 }}>
                <input className="input" value={composeSchedule()} readOnly placeholder="Horario de atencion" />
                <input className="input" value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} placeholder="Politica de cancelacion" />
                <input className="input" type="number" min={0} value={toleranceMinutes} onChange={(e) => setToleranceMinutes(e.target.value)} placeholder="Tolerancia de llegada (minutos)" />
              </div>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Direccion del establecimiento" />
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion del establecimiento" />
                <div />
              </div>
              <p className="small">El identificador interno se genera automaticamente a partir del nombre de la sucursal.</p>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <label className="onboardingCheck"><input type="checkbox" checked={allowOnlinePayments} onChange={(e) => setAllowOnlinePayments(e.target.checked)} /> Pago online</label>
                <label className="onboardingCheck"><input type="checkbox" checked={allowLocalPayments} onChange={(e) => setAllowLocalPayments(e.target.checked)} /> Pago en local</label>
                <label className="onboardingCheck"><input type="checkbox" checked={prepayRequired} onChange={(e) => setPrepayRequired(e.target.checked)} /> Prepago obligatorio</label>
              </div>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <input className="input" value={cancellationPenaltyPercent} onChange={(e) => setCancellationPenaltyPercent(e.target.value)} placeholder="Penalizacion cancelacion (%)" />
                <button className="linkBtn" onClick={saveBranch} disabled={!companyConfigured}>{editingTenantId ? "Guardar cambios" : "Crear sucursal"}</button>
                <div />
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refresh()}>Refrescar</button>
        <Link className="mutedBtn" href="/professional/dashboard">Volver dashboard</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}


