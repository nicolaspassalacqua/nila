"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession, setActiveTenant } from "@/lib/session";

type CourtSport = "futbol" | "padel" | "tenis" | "otro";

type CourtConfig = {
  name: string;
  sport: CourtSport;
  capacity: number;
};

type Tenant = {
  id: number;
  name: string;
  establishment_type: string;
  court_config: CourtConfig[];
};

type Appointment = {
  id: number;
  status: string;
  service_name: string;
  client_name: string;
  court_name: string;
  start_dt: string;
  end_dt: string;
};

type BlockedSlot = {
  id: number;
  court_name: string;
  start_dt: string;
  end_dt: string;
  reason: string;
};

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
  scheduled_at: string;
};

type Client = { id: number };
type Service = { id: number };
type Order = { id: number; total_amount: string; status: string };
type CashMovement = { id: number; amount: string; type: string };
type Invoice = { id: number; total: string; status: string };
type FinancialSummary = {
  orders_count: number;
  orders_paid_count: number;
  orders_total: string;
  payments_total: string;
  invoices_count: number;
  invoices_total: string;
  pending_amount: string;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProfessionalDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cash, setCash] = useState<CashMovement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [messages, setMessages] = useState<MessageQueueItem[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [blockCourtName, setBlockCourtName] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("08:00");
  const [blockEndTime, setBlockEndTime] = useState("09:00");
  const [blockReason, setBlockReason] = useState("");
  const [inboxOpen, setInboxOpen] = useState(true);
  const [log, setLog] = useState("Listo");

  const activeTenant = useMemo(
    () => tenants.find((item) => String(item.id) === tenantId) || null,
    [tenants, tenantId]
  );
  const tenantIsCourt = activeTenant?.establishment_type === "cancha";
  const tenantCourts = Array.isArray(activeTenant?.court_config) ? activeTenant.court_config : [];

  const todayIncome = useMemo(() => {
    return cash.filter((m) => m.type === "in").reduce((sum, m) => sum + Number(m.amount), 0);
  }, [cash]);

  const scheduledAppointments = useMemo(
    () => appointments.filter((item) => item.status === "requested" || item.status === "confirmed"),
    [appointments]
  );

  const reservationsForDate = useMemo(() => {
    return scheduledAppointments.filter((item) => item.start_dt.slice(0, 10) === selectedDate);
  }, [scheduledAppointments, selectedDate]);

  const reservationsByCourt = useMemo(() => {
    const byCourt: Record<string, Appointment[]> = {};
    reservationsForDate.forEach((item) => {
      const key = item.court_name?.trim() || "Sin cancha";
      if (!byCourt[key]) byCourt[key] = [];
      byCourt[key].push(item);
    });
    Object.keys(byCourt).forEach((key) => {
      byCourt[key].sort((a, b) => a.start_dt.localeCompare(b.start_dt));
    });
    return byCourt;
  }, [reservationsForDate]);

  const blockedByCourt = useMemo(() => {
    const byCourt: Record<string, BlockedSlot[]> = {};
    blockedSlots.forEach((item) => {
      const key = item.court_name?.trim() || "General";
      if (!byCourt[key]) byCourt[key] = [];
      byCourt[key].push(item);
    });
    Object.keys(byCourt).forEach((key) => {
      byCourt[key].sort((a, b) => a.start_dt.localeCompare(b.start_dt));
    });
    return byCourt;
  }, [blockedSlots]);

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
    setToken(session.token);
    setTenantId(session.tenantId);
    void refresh(session.token, session.tenantId);
  }, [router]);

  useEffect(() => {
    if (!token || !tenantId) return;
    void refreshBlockedSlots(token, tenantId, selectedDate);
  }, [selectedDate, token, tenantId]);

  async function refresh(activeToken = token, activeTenant = tenantId) {
    try {
      const [a, c, s, o, cm, inv, fin, t, mq, bs] = await Promise.all([
        apiRequest<Appointment[]>("/appointments", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Client[]>("/clients", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Order[]>("/orders", { token: activeToken, tenantId: activeTenant }),
        apiRequest<CashMovement[]>("/cash-movements", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Invoice[]>("/invoices", { token: activeToken, tenantId: activeTenant }),
        apiRequest<FinancialSummary>("/orders/financial-summary", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Tenant[]>("/tenants", { token: activeToken }),
        apiRequest<MessageQueueItem[]>("/message-queue", { token: activeToken, tenantId: activeTenant }),
        apiRequest<BlockedSlot[]>(`/appointments/blocked-slots?date=${selectedDate}`, { token: activeToken, tenantId: activeTenant }),
      ]);
      setAppointments(a);
      setClients(c);
      setServices(s);
      setOrders(o);
      setCash(cm);
      setInvoices(inv);
      setSummary(fin);
      setTenants(t);
      setMessages(mq);
      setBlockedSlots(bs);
      setLog("Panel actualizado");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  function changeTenant(nextTenantId: string) {
    setTenantId(nextTenantId);
    setActiveTenant(nextTenantId);
    void refresh(token, nextTenantId);
  }

  async function refreshBlockedSlots(activeToken = token, activeTenant = tenantId, date = selectedDate) {
    try {
      const rows = await apiRequest<BlockedSlot[]>(`/appointments/blocked-slots?date=${date}`, {
        token: activeToken,
        tenantId: activeTenant,
      });
      setBlockedSlots(rows);
    } catch {
      // Keep dashboard responsive even if this optional panel fails.
    }
  }

  function toIsoFromDateAndTime(date: string, time: string): string {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  async function cancelAppointment(id: number) {
    try {
      await apiRequest(`/appointments/${id}/cancel`, { method: "POST", token, tenantId });
      setLog(`Reserva cancelada: ${id}`);
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error cancelando reserva: ${error.message}`);
    }
  }

  async function confirmAppointment(id: number) {
    try {
      await apiRequest(`/appointments/${id}/confirm`, { method: "POST", token, tenantId });
      setLog(`Reserva confirmada: ${id}`);
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error confirmando reserva: ${error.message}`);
    }
  }

  async function blockSlot() {
    try {
      const startIso = toIsoFromDateAndTime(selectedDate, blockStartTime);
      const endIso = toIsoFromDateAndTime(selectedDate, blockEndTime);
      await apiRequest("/appointments/block-slot", {
        method: "POST",
        token,
        tenantId,
        body: {
          court_name: blockCourtName,
          start_iso: startIso,
          end_iso: endIso,
          reason: blockReason,
        },
      });
      setLog("Horario bloqueado");
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error bloqueando horario: ${error.message}`);
    }
  }

  async function unblockSlot(id: number) {
    try {
      await apiRequest("/appointments/unblock-slot", {
        method: "POST",
        token,
        tenantId,
        body: { blocked_slot_id: id },
      });
      setLog("Bloqueo eliminado");
      await refresh(token, tenantId);
    } catch (error: any) {
      setLog(`Error eliminando bloqueo: ${error.message}`);
    }
  }

  async function markMessageSent(id: number) {
    try {
      await apiRequest(`/message-queue/${id}/mark-sent`, { method: "POST", token, tenantId });
      await refresh(token, tenantId);
      setInboxOpen(false);
      setLog("Mensaje marcado como leido");
    } catch (error: any) {
      setLog(`Error actualizando inbox: ${error.message}`);
    }
  }

  function messageUi(type?: string): { icon: string; label: string; tone: "ok" | "danger" | "info" } {
    if (type === "reservation_requested_professional") return { icon: "N", label: "Nueva reserva", tone: "info" };
    if (type === "reservation_confirmed_client") return { icon: "OK", label: "Aceptada", tone: "ok" };
    if (type === "reservation_cancelled_client") return { icon: "X", label: "Rechazada", tone: "danger" };
    return { icon: "i", label: "Info", tone: "info" };
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  function formatTimeRange(startIso: string, endIso: string): string {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const startLabel = start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    const endLabel = end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return `${startLabel} - ${endLabel}`;
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <div className="dashboardHeaderRow">
        <h1 className="sectionTitle">Panel Profesional</h1>
        <div className="inboxBellWrap">
          <button className="inboxBellBtn" onClick={() => setInboxOpen((v) => !v)} aria-label="Abrir inbox">
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
              <h3>Inbox profesional</h3>
              {queuedMessages.length === 0 ? (
                <p className="small">No hay alertas pendientes.</p>
              ) : (
                <ul className="list">
                  {queuedMessages.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <span className={`messageTypeBadge ${messageUi(item.payload?.type).tone}`}>
                        {messageUi(item.payload?.type).icon} {messageUi(item.payload?.type).label}
                      </span>
                      <strong>{item.payload?.message || item.payload?.type || "Mensaje"}</strong>
                      <div className="small">
                        {item.payload?.start_dt ? new Date(item.payload.start_dt).toLocaleString("es-AR") : ""} | {item.channel}
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
        <section className="card"><h2>Agenda</h2><p>{appointments.length} turnos totales</p></section>
        <section className="card"><h2>Clientes</h2><p>{clients.length} clientes activos</p></section>
        <section className="card"><h2>Servicios</h2><p>{services.length} servicios publicados</p></section>
        <section className="card"><h2>POS</h2><p>Ingresos registrados: ARS {todayIncome.toLocaleString("es-AR")}</p></section>
        <section className="card"><h2>Ordenes</h2><p>{orders.length} ordenes | pagadas: {orders.filter((o) => o.status === "paid").length}</p></section>
        <section className="card"><h2>Facturas</h2><p>{invoices.length} emitidas</p></section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Sucursal activa</h2>
        <div className="formGrid">
          <div className="fieldStack">
            <label className="fieldLabel">Sucursal</label>
            <select className="input" value={tenantId} onChange={(e) => changeTenant(e.target.value)}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
          <div className="fieldStack">
            <label className="fieldLabel">Tipo</label>
            <input className="input" readOnly value={activeTenant?.establishment_type || "-"} />
          </div>
          <div className="fieldStack">
            <label className="fieldLabel">Canchas configuradas</label>
            <input className="input" readOnly value={String(tenantCourts.length)} />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
          <h2>Disponibilidad de canchas</h2>
          {!tenantIsCourt || tenantCourts.length === 0 ? (
            <p className="small">
              Esta sucursal no esta configurada como cancha o no tiene canchas cargadas. Selecciona una sucursal tipo cancha para ver disponibilidad y reservas.
            </p>
          ) : (
            <>
              <div className="formGrid">
                <div className="fieldStack">
                  <label className="fieldLabel">Fecha</label>
                  <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Sucursal</label>
                  <input className="input" readOnly value={activeTenant?.name || "-"} />
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Resumen</label>
                  <input className="input" readOnly value={`${tenantCourts.length} canchas | ${reservationsForDate.length} reservas | ${blockedSlots.length} bloqueos`} />
                </div>
              </div>

              <div className="formGrid" style={{ marginTop: 8 }}>
                <div className="fieldStack">
                  <label className="fieldLabel">Cancha (opcional)</label>
                  <select className="input" value={blockCourtName} onChange={(e) => setBlockCourtName(e.target.value)}>
                    <option value="">Bloqueo general</option>
                    {tenantCourts.map((court, idx) => (
                      <option key={`${court.name}-${idx}`} value={court.name}>{court.name}</option>
                    ))}
                  </select>
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Desde</label>
                  <input className="input" type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} />
                </div>
                <div className="fieldStack">
                  <label className="fieldLabel">Hasta</label>
                  <input className="input" type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} />
                </div>
              </div>
              <div className="formGrid" style={{ marginTop: 8 }}>
                <div className="fieldStack">
                  <label className="fieldLabel">Motivo</label>
                  <input className="input" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Mantenimiento, torneo, evento..." />
                </div>
                <div className="fieldStack" style={{ alignSelf: "end" }}>
                  <button className="mutedBtn" onClick={() => void blockSlot()}>Bloquear horario</button>
                </div>
              </div>

              {blockedSlots.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <h3>Bloqueos del dia</h3>
                  <ul className="list">
                    {blockedSlots.map((item) => (
                      <li key={item.id}>
                        <strong>{formatTimeRange(item.start_dt, item.end_dt)}</strong> - {item.court_name || "General"} {item.reason ? `| ${item.reason}` : ""}
                        <button className="mutedBtn" style={{ marginLeft: 8 }} onClick={() => void unblockSlot(item.id)}>Quitar bloqueo</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="courtCards" style={{ marginTop: 10 }}>
                {tenantCourts.map((court, index) => {
                  const courtName = String(court.name || `Cancha ${index + 1}`);
                  const reservations = reservationsByCourt[courtName] || [];
                  const courtBlocks = blockedByCourt[courtName] || [];
                  return (
                    <article className="courtCard" key={`${courtName}-${index}`}>
                      <div className="courtCardMeta">
                        <strong>{courtName}</strong>
                        <span className="badge">
                          {reservations.length === 0 && courtBlocks.length === 0
                            ? "Disponible"
                            : `${reservations.length} reserva(s) | ${courtBlocks.length} bloqueo(s)`}
                        </span>
                      </div>
                      {reservations.length === 0 ? (
                        <p className="small">Sin reservas para {selectedDate}.</p>
                      ) : (
                        <ul className="list">
                          {reservations.map((appointment) => (
                            <li key={appointment.id}>
                              <strong>{formatTimeRange(appointment.start_dt, appointment.end_dt)}</strong> - {appointment.client_name || "Cliente"}
                              <div className="tableActions" style={{ marginTop: 6 }}>
                                <span className="badge">{appointment.status}</span>
                                {appointment.status === "requested" ? (
                                  <button className="mutedBtn" onClick={() => void confirmAppointment(appointment.id)}>Confirmar</button>
                                ) : null}
                                <button className="mutedBtn" onClick={() => void cancelAppointment(appointment.id)}>Cancelar reserva</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>

              {(reservationsByCourt["Sin cancha"] || []).length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <h3>Reservas sin cancha asignada</h3>
                  <ul className="list">
                    {reservationsByCourt["Sin cancha"].map((appointment) => (
                      <li key={appointment.id}>
                        {formatTimeRange(appointment.start_dt, appointment.end_dt)} - {appointment.client_name || "Cliente"}
                        {appointment.status === "requested" ? (
                          <button className="mutedBtn" style={{ marginLeft: 8 }} onClick={() => void confirmAppointment(appointment.id)}>Confirmar</button>
                        ) : null}
                        <button className="mutedBtn" style={{ marginLeft: 8 }} onClick={() => void cancelAppointment(appointment.id)}>Cancelar</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Resumen Financiero</h2>
        {summary ? (
          <div className="grid" style={{ marginTop: 6 }}>
            <div><strong>Ordenes</strong><br />{summary.orders_count}</div>
            <div><strong>Total ordenes</strong><br />ARS {Number(summary.orders_total).toLocaleString("es-AR")}</div>
            <div><strong>Total cobrado</strong><br />ARS {Number(summary.payments_total).toLocaleString("es-AR")}</div>
            <div><strong>Total facturado</strong><br />ARS {Number(summary.invoices_total).toLocaleString("es-AR")}</div>
            <div><strong>Pendiente</strong><br />ARS {Number(summary.pending_amount).toLocaleString("es-AR")}</div>
          </div>
        ) : (
          <p className="small">Sin datos</p>
        )}
      </section>

      <div className="linkRow">
        <button className="linkBtn" onClick={() => refresh()}>Refrescar</button>
        <Link className="mutedBtn" href="/professional/tenants">Onboarding negocio</Link>
        <Link className="mutedBtn" href="/professional/services">Configurar servicios</Link>
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}
