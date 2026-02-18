"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession, UserProfile } from "@/lib/session";

type Appointment = { id: number; service: number; client: number; start_dt: string; status: string };
type Service = { id: number; name: string; discipline: string; price: string };
type Waitlist = { id: number; service: number; desired_date: string; status: string };
type MessageQueueItem = {
  id: number;
  status: string;
  channel: string;
  to_address: string;
  payload: {
    type?: string;
    message?: string;
    start_dt?: string;
    [key: string]: any;
  };
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [messages, setMessages] = useState<MessageQueueItem[]>([]);
  const [inboxOpen, setInboxOpen] = useState(true);
  const [log, setLog] = useState("Listo");

  const nextAppointment = useMemo(() => {
    return [...appointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => new Date(a.start_dt).getTime() - new Date(b.start_dt).getTime())[0];
  }, [appointments]);

  const servicesById = useMemo(() => {
    const map: Record<number, Service> = {};
    for (const service of services) {
      map[service.id] = service;
    }
    return map;
  }, [services]);

  const nextAppointmentDate = useMemo(() => {
    if (!nextAppointment) return "";
    return new Date(nextAppointment.start_dt).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [nextAppointment]);

  const nextAppointmentTime = useMemo(() => {
    if (!nextAppointment) return "";
    return new Date(nextAppointment.start_dt).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [nextAppointment]);

  const queuedMessages = useMemo(
    () => messages.filter((item) => item.status === "queued"),
    [messages]
  );

  const previewMessageTypes = useMemo(() => {
    const found = new Set<string>();
    for (const item of queuedMessages) {
      if (item.payload?.type) found.add(item.payload.type);
      if (found.size >= 3) break;
    }
    return Array.from(found);
  }, [queuedMessages]);

  useEffect(() => {
    const session = getSession();
    if (!session.token || !session.tenantId) {
      router.replace("/login");
      return;
    }
    setUser(session.user || null);
    setToken(session.token);
    setTenantId(session.tenantId);
    void refresh(session.token, session.tenantId);
  }, [router]);

  const displayName = useMemo(() => {
    if (!user) return "Cliente";
    return user.full_name?.trim() || user.username || "Cliente";
  }, [user]);

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return "CL";
    const parts = source.split(/\s+/).filter(Boolean);
    const joined = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return joined.toUpperCase() || source.slice(0, 2).toUpperCase();
  }, [displayName]);

  async function refresh(activeToken = token, activeTenant = tenantId) {
    try {
      const [s, a, w, mq] = await Promise.all([
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Appointment[]>("/appointments", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Waitlist[]>("/waitlists", { token: activeToken, tenantId: activeTenant }),
        apiRequest<MessageQueueItem[]>("/message-queue", { token: activeToken, tenantId: activeTenant }),
      ]);
      setServices(s);
      setAppointments(a);
      setWaitlists(w);
      setMessages(mq);
      setLog("Datos actualizados");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  async function cancelNextAppointment() {
    if (!nextAppointment) {
      setLog("No hay turnos para cancelar.");
      return;
    }

    try {
      await apiRequest(`/appointments/${nextAppointment.id}/cancel`, {
        method: "POST",
        token,
        tenantId,
      });
      setLog(`Turno ${nextAppointment.id} cancelado`);
      await refresh();
    } catch (error: any) {
      setLog(`Error cancelando: ${error.message}`);
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  async function markMessageSent(id: number) {
    try {
      await apiRequest(`/message-queue/${id}/mark-sent`, { method: "POST", token, tenantId });
      await refresh();
    } catch (error: any) {
      setLog(`Error inbox: ${error.message}`);
    }
  }

  function messageUi(type?: string): { icon: string; label: string; tone: "ok" | "danger" | "info" } {
    if (type === "reservation_confirmed_client") return { icon: "OK", label: "Aceptada", tone: "ok" };
    if (type === "reservation_cancelled_client") return { icon: "X", label: "Rechazada", tone: "danger" };
    if (type === "reservation_requested_professional") return { icon: "N", label: "Nueva", tone: "info" };
    return { icon: "i", label: "Info", tone: "info" };
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <div className="profileHeader">
        {user?.avatar_url ? (
          <img className="profileAvatar" src={user.avatar_url} alt={displayName} referrerPolicy="no-referrer" />
        ) : (
          <div className="profileAvatarFallback" aria-hidden="true">{initials}</div>
        )}
        <div>
          <p className="small" style={{ margin: 0 }}>Hola</p>
          <strong>{displayName}</strong>
        </div>
      </div>
      <div className="dashboardHeaderRow">
        <h1 className="sectionTitle">Dashboard Cliente</h1>
        <div className="inboxBellWrap">
          <button className="inboxBellBtn" onClick={() => setInboxOpen((v) => !v)} aria-label="Abrir inbox cliente">
            Inbox
            {queuedMessages.length > 0 ? <span className="inboxBellCount">{queuedMessages.length}</span> : null}
          </button>
          {previewMessageTypes.length > 0 ? (
            <div className="inboxPreviewRow">
              {previewMessageTypes.map((type) => (
                <span key={type} className={`messageTypeBadge ${messageUi(type).tone}`}>
                  {messageUi(type).icon} {messageUi(type).label}
                </span>
              ))}
            </div>
          ) : null}
          {inboxOpen ? (
            <div className="inboxPopover">
              <h3>Notificaciones</h3>
              {queuedMessages.length === 0 ? (
                <p className="small">No hay mensajes nuevos.</p>
              ) : (
                <ul className="list">
                  {queuedMessages.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <span className={`messageTypeBadge ${messageUi(item.payload?.type).tone}`}>
                        {messageUi(item.payload?.type).icon} {messageUi(item.payload?.type).label}
                      </span>
                      <strong>{item.payload?.message || item.payload?.type || "Mensaje"}</strong>
                      <div className="small">
                        {item.payload?.start_dt ? new Date(item.payload.start_dt).toLocaleString("es-AR") : ""}
                      </div>
                      <button className="mutedBtn" style={{ marginTop: 6 }} onClick={() => void markMessageSent(item.id)}>
                        Marcar leido
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Notificaciones</h2>
        <p className="small">{queuedMessages.length} pendiente(s)</p>
        {queuedMessages.length === 0 ? (
          <p className="small">Sin novedades.</p>
        ) : (
          <div>
            {queuedMessages.slice(0, 3).map((item) => (
              <div key={`preview-${item.id}`} style={{ marginBottom: 8 }}>
                <span className={`messageTypeBadge ${messageUi(item.payload?.type).tone}`}>
                  {messageUi(item.payload?.type).icon} {messageUi(item.payload?.type).label}
                </span>
                <span style={{ marginLeft: 8 }}>{item.payload?.message || item.payload?.type || "Mensaje"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid">
        <section className="card upcomingCard">
          <h2>Proximo turno</h2>
          {nextAppointment ? (
            <>
              <p className="small">Servicio asignado</p>
              <p className="kpiValue" style={{ marginBottom: 10 }}>
                {servicesById[nextAppointment.service]?.name || `Turno #${nextAppointment.id}`}
              </p>
              <div className="upcomingMeta">
                <div className="upcomingMetaItem">
                  <span className="small">Fecha</span>
                  <strong>{nextAppointmentDate}</strong>
                </div>
                <div className="upcomingMetaItem">
                  <span className="small">Hora</span>
                  <strong>{nextAppointmentTime}</strong>
                </div>
                <div className="upcomingMetaItem">
                  <span className="small">Estado</span>
                  <span className="badge">{nextAppointment.status}</span>
                </div>
              </div>
              <div className="cardActions">
                <Link className="mutedBtn" href="/client/appointments">Ver detalle</Link>
                <button className="mutedBtn" onClick={cancelNextAppointment}>Cancelar</button>
              </div>
            </>
          ) : (
            <p>Sin turnos activos.</p>
          )}
        </section>
        <Link className="card cardInteractive" href="/client/services">
          <h2>Servicios disponibles</h2>
          <p>{services.length} servicios activos para tu cuenta.</p>
          <div className="cardActions">
            <span className="linkBtn">Ver servicios</span>
          </div>
        </Link>
        <Link className="card cardInteractive" href="/client/appointments">
          <h2>Mis turnos</h2>
          <p>Total: {appointments.length}</p>
          <div className="cardActions">
            <span className="linkBtn">Ver turnos</span>
          </div>
        </Link>
        <Link className="card cardInteractive" href="/client/waitlist">
          <h2>Lista de espera</h2>
          <p>Registros activos: {waitlists.filter((w) => w.status === "active").length}</p>
          <div className="cardActions">
            <span className="linkBtn">Gestionar</span>
          </div>
        </Link>
      </div>

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refresh()}>Refrescar</button>
        <Link className="linkBtn" href="/client/marketplace">Ir a marketplace</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}

