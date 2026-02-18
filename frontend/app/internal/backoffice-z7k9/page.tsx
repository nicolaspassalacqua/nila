"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getSession } from "@/lib/session";
import { INTERNAL_ADMIN_HIDDEN_PATH } from "@/lib/internal-admin";

type PlatformSetting = {
  id: number;
  key: string;
  value_type: "string" | "number" | "boolean" | "json";
  value: any;
  description: string;
  is_active: boolean;
};

type SystemOverview = {
  totals: Record<string, number>;
  active_flags: string[];
};

type UserProfile = {
  is_staff: boolean;
};

type InternalProfessional = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  tenant_count: number;
  last_login: string | null;
  date_joined: string;
};

function parseValue(type: PlatformSetting["value_type"], raw: string): any {
  if (type === "string") return raw;
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true";
  return JSON.parse(raw || "{}");
}

function formatDateTime(value: string | null): string {
  if (!value) return "Nunca";
  try {
    return new Date(value).toLocaleString("es-AR");
  } catch {
    return value;
  }
}

export default function InternalAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [professionals, setProfessionals] = useState<InternalProfessional[]>([]);
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [log, setLog] = useState("Listo");
  const [editingProfessionalId, setEditingProfessionalId] = useState<number | null>(null);
  const [editingProfessional, setEditingProfessional] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  const [key, setKey] = useState("feature-new-booking-flow");
  const [valueType, setValueType] = useState<PlatformSetting["value_type"]>("boolean");
  const [valueRaw, setValueRaw] = useState("true");
  const [description, setDescription] = useState("Activa la nueva experiencia de reservas.");
  const [googleClientIdRaw, setGoogleClientIdRaw] = useState("");
  const [facebookAppIdRaw, setFacebookAppIdRaw] = useState("");
  const [facebookAppSecretRaw, setFacebookAppSecretRaw] = useState("");
  const [afipUrlRaw, setAfipUrlRaw] = useState("");
  const [afipTokenRaw, setAfipTokenRaw] = useState("");
  const [afipTimeoutRaw, setAfipTimeoutRaw] = useState("5");
  const [afipWsaaUrlRaw, setAfipWsaaUrlRaw] = useState("https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL");
  const [afipConstanciaUrlRaw, setAfipConstanciaUrlRaw] = useState("https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13?WSDL");
  const [afipServiceNameRaw, setAfipServiceNameRaw] = useState("ws_sr_constancia_inscripcion");
  const [afipCuitRepresentedRaw, setAfipCuitRepresentedRaw] = useState("");
  const [afipEnvRaw, setAfipEnvRaw] = useState("homo");
  const [arcaExternalUrlRaw, setArcaExternalUrlRaw] = useState("");
  const [arcaExternalTokenRaw, setArcaExternalTokenRaw] = useState("");
  const [arcaExternalTimeoutRaw, setArcaExternalTimeoutRaw] = useState("6");
  const [afipTestCuit, setAfipTestCuit] = useState("");
  const [afipTestLoading, setAfipTestLoading] = useState(false);
  const [afipTestResult, setAfipTestResult] = useState<string>("");
  const googleSetting = settings.find((s) => s.key === "google-client-id");
  const facebookAppIdSetting = settings.find((s) => s.key === "facebook-app-id");
  const facebookAppSecretSetting = settings.find((s) => s.key === "facebook-app-secret");
  const afipUrlSetting = settings.find((s) => s.key === "afip-cuit-lookup-url");
  const afipTokenSetting = settings.find((s) => s.key === "afip-cuit-lookup-token");
  const afipTimeoutSetting = settings.find((s) => s.key === "afip-cuit-lookup-timeout");
  const afipWsaaUrlSetting = settings.find((s) => s.key === "afip-wsaa-url");
  const afipConstanciaUrlSetting = settings.find((s) => s.key === "afip-constancia-url");
  const afipServiceNameSetting = settings.find((s) => s.key === "afip-service-name");
  const afipCuitRepresentedSetting = settings.find((s) => s.key === "afip-cuit-represented");
  const afipEnvSetting = settings.find((s) => s.key === "afip-environment");
  const arcaExternalUrlSetting = settings.find((s) => s.key === "arca-external-url");
  const arcaExternalTokenSetting = settings.find((s) => s.key === "arca-external-token");
  const arcaExternalTimeoutSetting = settings.find((s) => s.key === "arca-external-timeout");

  useEffect(() => {
    const session = getSession();
    if (!session.token || session.authMethod !== "password") {
      router.replace(`/login?admin=1&next=${encodeURIComponent(INTERNAL_ADMIN_HIDDEN_PATH)}`);
      return;
    }

    setToken(session.token);
    void bootstrap(session.token);
  }, [router]);

  async function bootstrap(activeToken: string) {
    try {
      const me = await apiRequest<UserProfile>("/auth/me", { token: activeToken });
      if (!me.is_staff) {
        router.replace("/professional/dashboard");
        return;
      }
      setReady(true);
      await refresh(activeToken);
    } catch (error: any) {
      setLog(`Error validando permisos: ${error.message}`);
      router.replace("/professional/dashboard");
    }
  }

  async function refresh(activeToken = token) {
    try {
      const [s, o, p] = await Promise.all([
        apiRequest<PlatformSetting[]>("/platform-settings", { token: activeToken }),
        apiRequest<SystemOverview>("/platform-settings/system-overview", { token: activeToken }),
        apiRequest<InternalProfessional[]>("/internal-professionals", { token: activeToken }),
      ]);
      setSettings(s);
      setOverview(o);
      setProfessionals(p);
      setLog("Panel interno actualizado");
    } catch (error: any) {
      setLog(`Error cargando panel: ${error.message}`);
    }
  }

  async function createSetting() {
    try {
      await apiRequest("/platform-settings", {
        method: "POST",
        token,
        body: {
          key,
          value_type: valueType,
          value: parseValue(valueType, valueRaw),
          description,
          is_active: true,
        },
      });
      setLog(`Setting ${key} creado`);
      await refresh();
    } catch (error: any) {
      setLog(`Error creando setting: ${error.message}`);
    }
  }

  async function upsertSetting(
    existing: PlatformSetting | undefined,
    payload: {
      key: string;
      value_type: PlatformSetting["value_type"];
      value: any;
      description: string;
      is_active?: boolean;
    }
  ) {
    if (existing) {
      await apiRequest(`/platform-settings/${existing.id}`, {
        method: "PATCH",
        token,
        body: {
          value_type: payload.value_type,
          value: payload.value,
          description: payload.description,
          is_active: payload.is_active ?? true,
        },
      });
      return;
    }
    await apiRequest("/platform-settings", {
      method: "POST",
      token,
      body: {
        key: payload.key,
        value_type: payload.value_type,
        value: payload.value,
        description: payload.description,
        is_active: payload.is_active ?? true,
      },
    });
  }

  async function saveGoogleClientId() {
    const normalizedClientId = googleClientIdRaw.trim();
    if (!normalizedClientId) {
      setLog("Ingresa un Google Client ID valido.");
      return;
    }

    const existing = googleSetting;

    try {
      if (existing) {
        await apiRequest(`/platform-settings/${existing.id}`, {
          method: "PATCH",
          token,
          body: {
            value_type: "string",
            value: normalizedClientId,
            description: "Client ID de Google Sign-In para login social",
            is_active: true,
          },
        });
      } else {
        await apiRequest("/platform-settings", {
          method: "POST",
          token,
          body: {
            key: "google-client-id",
            value_type: "string",
            value: normalizedClientId,
            description: "Client ID de Google Sign-In para login social",
            is_active: true,
          },
        });
      }

      setLog("Google Sign-In configurado.");
      await refresh();
    } catch (error: any) {
      setLog(`Error guardando Google Sign-In: ${error.message}`);
    }
  }

  async function toggleGoogleSignIn() {
    if (!googleSetting) {
      setLog("Primero guarda un Google Client ID.");
      return;
    }

    try {
      await apiRequest(`/platform-settings/${googleSetting.id}`, {
        method: "PATCH",
        token,
        body: { is_active: !googleSetting.is_active },
      });
      setLog(`Google Sign-In ${googleSetting.is_active ? "desactivado" : "activado"}.`);
      await refresh();
    } catch (error: any) {
      setLog(`Error cambiando estado de Google Sign-In: ${error.message}`);
    }
  }

  async function saveFacebookConfig() {
    const appId = facebookAppIdRaw.trim();
    const appSecret = facebookAppSecretRaw.trim();
    if (!appId || !appSecret) {
      setLog("Ingresa Facebook App ID y App Secret.");
      return;
    }

    try {
      if (facebookAppIdSetting) {
        await apiRequest(`/platform-settings/${facebookAppIdSetting.id}`, {
          method: "PATCH",
          token,
          body: {
            value_type: "string",
            value: appId,
            description: "Facebook App ID para login social",
            is_active: true,
          },
        });
      } else {
        await apiRequest("/platform-settings", {
          method: "POST",
          token,
          body: {
            key: "facebook-app-id",
            value_type: "string",
            value: appId,
            description: "Facebook App ID para login social",
            is_active: true,
          },
        });
      }

      if (facebookAppSecretSetting) {
        await apiRequest(`/platform-settings/${facebookAppSecretSetting.id}`, {
          method: "PATCH",
          token,
          body: {
            value_type: "string",
            value: appSecret,
            description: "Facebook App Secret para login social",
            is_active: true,
          },
        });
      } else {
        await apiRequest("/platform-settings", {
          method: "POST",
          token,
          body: {
            key: "facebook-app-secret",
            value_type: "string",
            value: appSecret,
            description: "Facebook App Secret para login social",
            is_active: true,
          },
        });
      }

      setLog("Facebook Sign-In configurado.");
      await refresh();
    } catch (error: any) {
      setLog(`Error guardando Facebook Sign-In: ${error.message}`);
    }
  }

  async function toggleFacebookSignIn() {
    if (!facebookAppIdSetting || !facebookAppSecretSetting) {
      setLog("Primero guarda Facebook App ID y App Secret.");
      return;
    }

    const shouldActivate = !(facebookAppIdSetting.is_active && facebookAppSecretSetting.is_active);
    try {
      await Promise.all([
        apiRequest(`/platform-settings/${facebookAppIdSetting.id}`, {
          method: "PATCH",
          token,
          body: { is_active: shouldActivate },
        }),
        apiRequest(`/platform-settings/${facebookAppSecretSetting.id}`, {
          method: "PATCH",
          token,
          body: { is_active: shouldActivate },
        }),
      ]);
      setLog(`Facebook Sign-In ${shouldActivate ? "activado" : "desactivado"}.`);
      await refresh();
    } catch (error: any) {
      setLog(`Error cambiando estado de Facebook Sign-In: ${error.message}`);
    }
  }

  async function saveAfipConfig() {
    const url = afipUrlRaw.trim();
    const tokenValue = afipTokenRaw.trim();
    const timeoutNumber = Number(afipTimeoutRaw);
    const wsaaUrl = afipWsaaUrlRaw.trim();
    const constanciaUrl = afipConstanciaUrlRaw.trim();
    const serviceName = afipServiceNameRaw.trim();
    const cuitRepresented = afipCuitRepresentedRaw.trim();
    const env = afipEnvRaw.trim();
    const externalUrl = arcaExternalUrlRaw.trim();
    const externalToken = arcaExternalTokenRaw.trim();
    const externalTimeout = Number(arcaExternalTimeoutRaw);

    if (!url) {
      setLog("Ingresa AFIP_CUIT_LOOKUP_URL.");
      return;
    }
    if (!Number.isFinite(timeoutNumber) || timeoutNumber <= 0 || timeoutNumber > 60) {
      setLog("AFIP_CUIT_LOOKUP_TIMEOUT debe estar entre 1 y 60 segundos.");
      return;
    }
    if (!wsaaUrl || !constanciaUrl || !serviceName) {
      setLog("Completa WSAA URL, Constancia URL y Service Name.");
      return;
    }
    if (cuitRepresented && cuitRepresented.replace(/\D/g, "").length !== 11) {
      setLog("CUIT representado debe tener 11 digitos.");
      return;
    }
    if (!Number.isFinite(externalTimeout) || externalTimeout <= 0 || externalTimeout > 60) {
      setLog("Timeout proxy ARCA debe estar entre 1 y 60 segundos.");
      return;
    }

    try {
      await upsertSetting(afipUrlSetting, {
        key: "afip-cuit-lookup-url",
        value_type: "string",
        value: url,
        description: "URL de consulta CUIT usada por onboarding empresa",
      });
      await upsertSetting(afipTokenSetting, {
        key: "afip-cuit-lookup-token",
        value_type: "string",
        value: tokenValue,
        description: "Token Bearer para consulta CUIT AFIP (opcional)",
      });
      await upsertSetting(afipTimeoutSetting, {
        key: "afip-cuit-lookup-timeout",
        value_type: "number",
        value: timeoutNumber,
        description: "Timeout (segundos) para consulta CUIT AFIP",
      });
      await upsertSetting(afipWsaaUrlSetting, {
        key: "afip-wsaa-url",
        value_type: "string",
        value: wsaaUrl,
        description: "WSDL WSAA (LoginCms)",
      });
      await upsertSetting(afipConstanciaUrlSetting, {
        key: "afip-constancia-url",
        value_type: "string",
        value: constanciaUrl,
        description: "WSDL WS Constancia Inscripcion",
      });
      await upsertSetting(afipServiceNameSetting, {
        key: "afip-service-name",
        value_type: "string",
        value: serviceName,
        description: "Service AFIP a firmar en TRA",
      });
      await upsertSetting(afipCuitRepresentedSetting, {
        key: "afip-cuit-represented",
        value_type: "string",
        value: cuitRepresented,
        description: "CUIT representado para invocacion AFIP",
      });
      await upsertSetting(afipEnvSetting, {
        key: "afip-environment",
        value_type: "string",
        value: env || "homo",
        description: "Ambiente AFIP (homo/prod)",
      });
      await upsertSetting(arcaExternalUrlSetting, {
        key: "arca-external-url",
        value_type: "string",
        value: externalUrl,
        description: "URL de proxy backend que invoca WSAA + WS Constancia",
      });
      await upsertSetting(arcaExternalTokenSetting, {
        key: "arca-external-token",
        value_type: "string",
        value: externalToken,
        description: "Token del proxy ARCA (opcional)",
      });
      await upsertSetting(arcaExternalTimeoutSetting, {
        key: "arca-external-timeout",
        value_type: "number",
        value: externalTimeout,
        description: "Timeout del proxy ARCA (segundos)",
      });

      setLog("Configuracion AFIP guardada.");
      await refresh();
    } catch (error: any) {
      setLog(`Error guardando configuracion AFIP: ${error.message}`);
    }
  }

  async function toggleAfipLookup() {
    if (!afipUrlSetting) {
      setLog("Primero guarda AFIP_CUIT_LOOKUP_URL.");
      return;
    }
    const shouldActivate = !afipUrlSetting.is_active;
    try {
      const toToggle = [
        afipUrlSetting,
        afipTokenSetting,
        afipTimeoutSetting,
        afipWsaaUrlSetting,
        afipConstanciaUrlSetting,
        afipServiceNameSetting,
        afipCuitRepresentedSetting,
        afipEnvSetting,
        arcaExternalUrlSetting,
        arcaExternalTokenSetting,
        arcaExternalTimeoutSetting,
      ].filter(Boolean) as PlatformSetting[];
      await Promise.all(
        toToggle.map((item) =>
          apiRequest(`/platform-settings/${item.id}`, {
            method: "PATCH",
            token,
            body: { is_active: shouldActivate },
          })
        )
      );
      setLog(`Consulta CUIT AFIP ${shouldActivate ? "activada" : "desactivada"}.`);
      await refresh();
    } catch (error: any) {
      setLog(`Error cambiando estado AFIP: ${error.message}`);
    }
  }

  async function testAfipLookup() {
    const cuit = afipTestCuit.replace(/\D/g, "");
    if (cuit.length !== 11) {
      setAfipTestResult("Ingresa un CUIT valido de 11 digitos.");
      return;
    }

    setAfipTestLoading(true);
    setAfipTestResult("");
    try {
      const data = await apiRequest<any>(`/company-profile/cuit-lookup?cuit=${cuit}`, { token });
      if (!data?.found) {
        setAfipTestResult(`Sin resultado: ${String(data?.detail || "No se encontro CUIT.")}`);
      } else {
        const company = data.company || {};
        const summary = [
          `Fuente: ${data.source || "arca"}`,
          `Razon social: ${company.legal_name || "-"}`,
          `Nombre comercial: ${company.trade_name || "-"}`,
          `Condicion fiscal: ${company.tax_condition || "-"}`,
          `Domicilio: ${company.billing_address || "-"}`,
          `Zona: ${company.primary_zone || "-"}`,
        ].join(" | ");
        setAfipTestResult(summary);
      }
    } catch (error: any) {
      setAfipTestResult(`Error en prueba AFIP/ARCA: ${error.message}`);
    } finally {
      setAfipTestLoading(false);
    }
  }

  async function toggleSetting(setting: PlatformSetting) {
    try {
      await apiRequest(`/platform-settings/${setting.id}`, {
        method: "PATCH",
        token,
        body: { is_active: !setting.is_active },
      });
      setLog(`Setting ${setting.key} actualizado`);
      await refresh();
    } catch (error: any) {
      setLog(`Error actualizando setting: ${error.message}`);
    }
  }

  async function deleteSetting(id: number) {
    try {
      await apiRequest(`/platform-settings/${id}`, { method: "DELETE", token });
      setLog(`Setting ${id} eliminado`);
      await refresh();
    } catch (error: any) {
      setLog(`Error eliminando setting: ${error.message}`);
    }
  }

  function startEditProfessional(professional: InternalProfessional) {
    setEditingProfessionalId(professional.id);
    setEditingProfessional({
      full_name: professional.full_name || "",
      email: professional.email || "",
      phone: professional.phone || "",
    });
  }

  function cancelEditProfessional() {
    setEditingProfessionalId(null);
    setEditingProfessional({ full_name: "", email: "", phone: "" });
  }

  async function saveProfessionalChanges(id: number) {
    try {
      await apiRequest(`/internal-professionals/${id}`, {
        method: "PATCH",
        token,
        body: {
          full_name: editingProfessional.full_name,
          email: editingProfessional.email,
          phone: editingProfessional.phone,
        },
      });
      setLog(`Profesional ${id} actualizado.`);
      cancelEditProfessional();
      await refresh();
    } catch (error: any) {
      setLog(`Error actualizando profesional: ${error.message}`);
    }
  }

  async function toggleProfessionalStatus(professional: InternalProfessional) {
    try {
      await apiRequest(`/internal-professionals/${professional.id}`, {
        method: "PATCH",
        token,
        body: { is_active: !professional.is_active },
      });
      setLog(
        `Profesional ${professional.username} ${professional.is_active ? "desactivado" : "activado"}.`
      );
      await refresh();
    } catch (error: any) {
      setLog(`Error cambiando estado de profesional: ${error.message}`);
    }
  }

  async function deleteProfessional(professional: InternalProfessional) {
    const confirmed = window.confirm(
      `Eliminar profesional "${professional.username}"? Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/internal-professionals/${professional.id}`, { method: "DELETE", token });
      setLog(`Profesional ${professional.username} eliminado.`);
      await refresh();
    } catch (error: any) {
      setLog(`Error eliminando profesional: ${error.message}`);
    }
  }

  useEffect(() => {
    if (googleSetting && typeof googleSetting.value === "string") {
      setGoogleClientIdRaw(googleSetting.value);
    }
    if (facebookAppIdSetting && typeof facebookAppIdSetting.value === "string") {
      setFacebookAppIdRaw(facebookAppIdSetting.value);
    }
    if (facebookAppSecretSetting && typeof facebookAppSecretSetting.value === "string") {
      setFacebookAppSecretRaw(facebookAppSecretSetting.value);
    }
    if (afipUrlSetting && typeof afipUrlSetting.value === "string") {
      setAfipUrlRaw(afipUrlSetting.value);
    }
    if (afipTokenSetting && typeof afipTokenSetting.value === "string") {
      setAfipTokenRaw(afipTokenSetting.value);
    }
    if (afipTimeoutSetting && typeof afipTimeoutSetting.value === "number") {
      setAfipTimeoutRaw(String(afipTimeoutSetting.value));
    }
    if (afipWsaaUrlSetting && typeof afipWsaaUrlSetting.value === "string") {
      setAfipWsaaUrlRaw(afipWsaaUrlSetting.value);
    }
    if (afipConstanciaUrlSetting && typeof afipConstanciaUrlSetting.value === "string") {
      setAfipConstanciaUrlRaw(afipConstanciaUrlSetting.value);
    }
    if (afipServiceNameSetting && typeof afipServiceNameSetting.value === "string") {
      setAfipServiceNameRaw(afipServiceNameSetting.value);
    }
    if (afipCuitRepresentedSetting && typeof afipCuitRepresentedSetting.value === "string") {
      setAfipCuitRepresentedRaw(afipCuitRepresentedSetting.value);
    }
    if (afipEnvSetting && typeof afipEnvSetting.value === "string") {
      setAfipEnvRaw(afipEnvSetting.value);
    }
    if (arcaExternalUrlSetting && typeof arcaExternalUrlSetting.value === "string") {
      setArcaExternalUrlRaw(arcaExternalUrlSetting.value);
    }
    if (arcaExternalTokenSetting && typeof arcaExternalTokenSetting.value === "string") {
      setArcaExternalTokenRaw(arcaExternalTokenSetting.value);
    }
    if (arcaExternalTimeoutSetting && typeof arcaExternalTimeoutSetting.value === "number") {
      setArcaExternalTimeoutRaw(String(arcaExternalTimeoutSetting.value));
    }
  }, [settings]);

  if (!ready) {
    return null;
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Administracion Interna</h1>
      <p className="small">Panel tecnico para equipo NILA (no visible para cliente/profesional final).</p>

      <div className="grid">
        <section className="card">
          <h2>Estado de plataforma</h2>
          {overview ? (
            <ul className="list">
              {Object.entries(overview.totals).map(([name, count]) => (
                <li key={name}>
                  <strong>{name}</strong>: {count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">Sin datos.</p>
          )}
        </section>

        <section className="card">
          <h2>Flags activos</h2>
          {overview && overview.active_flags.length > 0 ? (
            <ul className="list">
              {overview.active_flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="small">No hay flags activos.</p>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Profesionales</h2>
        <p className="small">Gestion centralizada: editar datos, activar/desactivar y eliminar.</p>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Sucursales</th>
                <th>Ultimo acceso</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((professional) => {
                const isEditing = editingProfessionalId === professional.id;
                return (
                  <tr key={professional.id}>
                    <td>{professional.username}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={editingProfessional.full_name}
                          onChange={(e) =>
                            setEditingProfessional((current) => ({ ...current, full_name: e.target.value }))
                          }
                        />
                      ) : (
                        professional.full_name || "-"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={editingProfessional.email}
                          onChange={(e) =>
                            setEditingProfessional((current) => ({ ...current, email: e.target.value }))
                          }
                        />
                      ) : (
                        professional.email || "-"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input"
                          value={editingProfessional.phone}
                          onChange={(e) =>
                            setEditingProfessional((current) => ({ ...current, phone: e.target.value }))
                          }
                        />
                      ) : (
                        professional.phone || "-"
                      )}
                    </td>
                    <td>{professional.tenant_count}</td>
                    <td>{formatDateTime(professional.last_login)}</td>
                    <td>
                      <span className="badge">{professional.is_active ? "activo" : "inactivo"}</span>
                    </td>
                    <td>
                      <div className="tableActions">
                        {isEditing ? (
                          <>
                            <button className="linkBtn" onClick={() => void saveProfessionalChanges(professional.id)}>Guardar</button>
                            <button className="mutedBtn" onClick={cancelEditProfessional}>Cancelar</button>
                          </>
                        ) : (
                          <button className="mutedBtn" onClick={() => startEditProfessional(professional)}>Editar</button>
                        )}
                        <button className="mutedBtn" onClick={() => void toggleProfessionalStatus(professional)}>
                          {professional.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button className="mutedBtn" onClick={() => void deleteProfessional(professional)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Google Sign-In</h2>
        <p className="small">
          Configura el Client ID para habilitar login con Google en la pantalla de acceso.
        </p>
        <p className="small">
          Estado actual:{" "}
          <strong>{googleSetting ? (googleSetting.is_active ? "Activo" : "Inactivo") : "Sin configurar"}</strong>
        </p>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={googleClientIdRaw}
            onChange={(e) => setGoogleClientIdRaw(e.target.value)}
            placeholder="xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
          />
          <button className="linkBtn" onClick={saveGoogleClientId}>Guardar Google</button>
          <button className="mutedBtn" onClick={toggleGoogleSignIn} disabled={!googleSetting}>
            {googleSetting?.is_active ? "Desactivar Google" : "Activar Google"}
          </button>
        </div>
        <div className="linkRow">
          <button className="mutedBtn" onClick={() => refresh()}>Refrescar</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Facebook Sign-In</h2>
        <p className="small">
          Configura App ID y App Secret para habilitar login con Facebook.
        </p>
        <p className="small">
          Estado actual:{" "}
          <strong>
            {facebookAppIdSetting && facebookAppSecretSetting
              ? (facebookAppIdSetting.is_active && facebookAppSecretSetting.is_active ? "Activo" : "Inactivo")
              : "Sin configurar"}
          </strong>
        </p>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={facebookAppIdRaw}
            onChange={(e) => setFacebookAppIdRaw(e.target.value)}
            placeholder="Facebook App ID"
          />
          <input
            className="input"
            value={facebookAppSecretRaw}
            onChange={(e) => setFacebookAppSecretRaw(e.target.value)}
            placeholder="Facebook App Secret"
          />
          <button className="linkBtn" onClick={saveFacebookConfig}>Guardar Facebook</button>
        </div>
        <div className="linkRow">
          <button
            className="mutedBtn"
            onClick={toggleFacebookSignIn}
            disabled={!facebookAppIdSetting || !facebookAppSecretSetting}
          >
            {facebookAppIdSetting?.is_active && facebookAppSecretSetting?.is_active
              ? "Desactivar Facebook"
              : "Activar Facebook"}
          </button>
          <button className="mutedBtn" onClick={() => refresh()}>Refrescar</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Integracion AFIP/ARCA - Padron por CUIT</h2>
        <p className="small">
          Configura aqui la invocacion segun manual WSAA + WS Constancia de Inscripcion.
          La consulta del onboarding usa <code>/api/company-profile/cuit-lookup</code>.
        </p>
        <p className="small">
          Bridge interno sugerido (lookup): <code>http://backend:8000/api/integrations/arca/cuit?cuit={"{cuit}"}</code>
        </p>
        <p className="small">
          Estado actual:{" "}
          <strong>{afipUrlSetting ? (afipUrlSetting.is_active ? "Activo" : "Inactivo") : "Sin configurar"}</strong>
        </p>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={afipUrlRaw}
            onChange={(e) => setAfipUrlRaw(e.target.value)}
            placeholder="AFIP_CUIT_LOOKUP_URL (usa {cuit} opcional)"
          />
          <input
            className="input"
            value={afipTokenRaw}
            onChange={(e) => setAfipTokenRaw(e.target.value)}
            placeholder="AFIP_CUIT_LOOKUP_TOKEN (opcional)"
          />
          <input
            className="input"
            value={afipTimeoutRaw}
            onChange={(e) => setAfipTimeoutRaw(e.target.value)}
            placeholder="AFIP_CUIT_LOOKUP_TIMEOUT (segundos)"
          />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <select className="input" value={afipEnvRaw} onChange={(e) => setAfipEnvRaw(e.target.value)}>
            <option value="homo">Homologacion</option>
            <option value="prod">Produccion</option>
          </select>
          <input
            className="input"
            value={afipWsaaUrlRaw}
            onChange={(e) => setAfipWsaaUrlRaw(e.target.value)}
            placeholder="AFIP WSAA URL"
          />
          <input
            className="input"
            value={afipConstanciaUrlRaw}
            onChange={(e) => setAfipConstanciaUrlRaw(e.target.value)}
            placeholder="AFIP Constancia URL"
          />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={afipServiceNameRaw}
            onChange={(e) => setAfipServiceNameRaw(e.target.value)}
            placeholder="Service name (ej: ws_sr_constancia_inscripcion)"
          />
          <input
            className="input"
            value={afipCuitRepresentedRaw}
            onChange={(e) => setAfipCuitRepresentedRaw(e.target.value)}
            placeholder="CUIT representado"
          />
          <div />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={arcaExternalUrlRaw}
            onChange={(e) => setArcaExternalUrlRaw(e.target.value)}
            placeholder="Proxy ARCA URL (invoca WSAA + Constancia)"
          />
          <input
            className="input"
            value={arcaExternalTokenRaw}
            onChange={(e) => setArcaExternalTokenRaw(e.target.value)}
            placeholder="Proxy ARCA token (opcional)"
          />
          <input
            className="input"
            value={arcaExternalTimeoutRaw}
            onChange={(e) => setArcaExternalTimeoutRaw(e.target.value)}
            placeholder="Proxy ARCA timeout (segundos)"
          />
        </div>
        <div className="linkRow">
          <button className="linkBtn" onClick={saveAfipConfig}>Guardar AFIP</button>
          <button className="mutedBtn" onClick={toggleAfipLookup} disabled={!afipUrlSetting}>
            {afipUrlSetting?.is_active ? "Desactivar AFIP" : "Activar AFIP"}
          </button>
          <button className="mutedBtn" onClick={() => refresh()}>Refrescar</button>
        </div>
        <p className="small">
          Claves usadas: <code>afip-cuit-lookup-url</code>, <code>afip-cuit-lookup-token</code>, <code>afip-cuit-lookup-timeout</code>,
          <code> afip-wsaa-url</code>, <code>afip-constancia-url</code>, <code>afip-service-name</code>, <code>afip-cuit-represented</code>,
          <code> afip-environment</code>, <code>arca-external-url</code>, <code>arca-external-token</code>, <code>arca-external-timeout</code>.
        </p>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input
            className="input"
            value={afipTestCuit}
            onChange={(e) => setAfipTestCuit(e.target.value)}
            placeholder="CUIT de prueba (11 digitos)"
          />
          <button className="mutedBtn" onClick={testAfipLookup} disabled={afipTestLoading}>
            {afipTestLoading ? "Probando..." : "Probar CUIT"}
          </button>
          <div />
        </div>
        {afipTestResult ? <p className="small">{afipTestResult}</p> : null}
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Nuevo ajuste tecnico</h2>
        <div className="formGrid">
          <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" />
          <select className="select" value={valueType} onChange={(e) => setValueType(e.target.value as PlatformSetting["value_type"])}>
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
          <input className="input" value={valueRaw} onChange={(e) => setValueRaw(e.target.value)} placeholder="valor" />
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="descripcion" />
          <button className="linkBtn" onClick={createSetting}>Crear ajuste</button>
          <button className="mutedBtn" onClick={() => refresh()}>Refrescar</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Ajustes existentes</h2>
        <ul className="list">
          {settings.map((setting) => (
            <li key={setting.id}>
              <strong>{setting.key}</strong> [{setting.value_type}] = {JSON.stringify(setting.value)}{" "}
              <span className="badge">{setting.is_active ? "activo" : "inactivo"}</span>
              <div className="cardActions">
                <button className="mutedBtn" onClick={() => toggleSetting(setting)}>
                  {setting.is_active ? "Desactivar" : "Activar"}
                </button>
                <button className="mutedBtn" onClick={() => deleteSetting(setting.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="linkRow">
        <Link className="mutedBtn" href="/professional/dashboard">Volver panel profesional</Link>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}
