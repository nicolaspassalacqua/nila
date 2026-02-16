"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getApiUrl } from "@/lib/api";

const INTERNAL_TOOLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_INTERNAL_WORKSPACE === "1";

export default function ProfessionalWorkspacePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin12345");
  const [log, setLog] = useState("Listo");

  const [tenants, setTenants] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [waitlists, setWaitlists] = useState<any[]>([]);
  const [waitlistOffers, setWaitlistOffers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cash, setCash] = useState<any[]>([]);
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);

  const [tenantName, setTenantName] = useState("Centro Aurora Pilates");
  const [tenantSlug, setTenantSlug] = useState("centro-aurora");

  const [serviceName, setServiceName] = useState("Clase Pilates");
  const [serviceDiscipline, setServiceDiscipline] = useState("Pilates");

  const [clientName, setClientName] = useState("Maria Perez");
  const [clientEmail, setClientEmail] = useState("maria@example.com");

  const [appointmentServiceId, setAppointmentServiceId] = useState("");
  const [appointmentClientId, setAppointmentClientId] = useState("");
  const [appointmentStart, setAppointmentStart] = useState("2026-02-20T18:00");
  const [appointmentEnd, setAppointmentEnd] = useState("2026-02-20T19:00");

  const [waitlistServiceId, setWaitlistServiceId] = useState("");
  const [waitlistDate, setWaitlistDate] = useState("2026-02-20");
  const [waitlistIdForEntry, setWaitlistIdForEntry] = useState("");
  const [waitlistClientIdForEntry, setWaitlistClientIdForEntry] = useState("");
  const [appointmentIdForOffer, setAppointmentIdForOffer] = useState("");

  const [productName, setProductName] = useState("Sesion Pilates");
  const [productPrice, setProductPrice] = useState("12000");
  const [orderClientId, setOrderClientId] = useState("");
  const [orderIdForItem, setOrderIdForItem] = useState("");
  const [productIdForItem, setProductIdForItem] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("12000");
  const [orderIdForPayment, setOrderIdForPayment] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("12000");
  const [appointmentIdForReminder, setAppointmentIdForReminder] = useState("");

  useEffect(() => {
    if (!INTERNAL_TOOLS_ENABLED) {
      router.replace("/professional/dashboard");
      return;
    }

    const savedToken = localStorage.getItem("nila_token") || "";
    const savedTenant = localStorage.getItem("nila_tenant_id") || "";
    setToken(savedToken);
    setTenantId(savedTenant);
  }, [router]);

  if (!INTERNAL_TOOLS_ENABLED) {
    return null;
  }

  function persistSession(nextToken: string, nextTenantId?: string) {
    setToken(nextToken);
    localStorage.setItem("nila_token", nextToken);
    if (nextTenantId !== undefined) {
      setTenantId(nextTenantId);
      localStorage.setItem("nila_tenant_id", nextTenantId);
    }
  }

  async function login() {
    try {
      const data = await apiRequest<{ access: string }>("/auth/token/", {
        method: "POST",
        body: { username, password },
      });
      persistSession(data.access);
      setLog("Login OK");
    } catch (e: any) {
      setLog(`Login error: ${e.message}`);
    }
  }

  async function refreshAll() {
    if (!token) return setLog("Falta token");
    try {
      const [t, s, c, a, w, wo, p, o, cm, mq, inv, fin] = await Promise.all([
        apiRequest<any[]>("/tenants/", { token }),
        tenantId ? apiRequest<any[]>("/services/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/clients/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/appointments/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/waitlists/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/waitlist-offers/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/products/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/orders/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/cash-movements/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/message-queue/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any[]>("/invoices/", { token, tenantId }) : Promise.resolve([]),
        tenantId ? apiRequest<any>("/orders/financial-summary/", { token, tenantId }) : Promise.resolve(null),
      ]);
      setTenants(t);
      setServices(s);
      setClients(c);
      setAppointments(a);
      setWaitlists(w);
      setWaitlistOffers(wo);
      setProducts(p);
      setOrders(o);
      setCash(cm);
      setMessageQueue(mq);
      setInvoices(inv);
      setFinancialSummary(fin);
      setLog("Datos actualizados");
    } catch (e: any) {
      setLog(`Refresh error: ${e.message}`);
    }
  }

  async function createTenant() {
    try {
      const t = await apiRequest<any>("/tenants/", { method: "POST", token, body: { name: tenantName, slug: tenantSlug } });
      persistSession(token, String(t.id));
      setLog(`Tenant creado: ${t.name}`);
      await refreshAll();
    } catch (e: any) {
      setLog(`Tenant error: ${e.message}`);
    }
  }

  async function createService() {
    try {
      await apiRequest("/services/", {
        method: "POST",
        token,
        tenantId,
        body: { name: serviceName, discipline: serviceDiscipline, duration_min: 60, price: 12000, is_online: false },
      });
      setLog("Servicio creado");
      await refreshAll();
    } catch (e: any) {
      setLog(`Servicio error: ${e.message}`);
    }
  }

  async function createClient() {
    try {
      await apiRequest("/clients/", { method: "POST", token, tenantId, body: { full_name: clientName, email: clientEmail } });
      setLog("Cliente creado");
      await refreshAll();
    } catch (e: any) {
      setLog(`Cliente error: ${e.message}`);
    }
  }

  async function createAppointment() {
    try {
      await apiRequest("/appointments/", {
        method: "POST",
        token,
        tenantId,
        body: {
          service: Number(appointmentServiceId),
          client: Number(appointmentClientId),
          start_dt: `${appointmentStart}:00`,
          end_dt: `${appointmentEnd}:00`,
          status: "confirmed",
        },
      });
      setLog("Turno creado");
      await refreshAll();
    } catch (e: any) {
      setLog(`Turno error: ${e.message}`);
    }
  }

  async function cancelAppointment(id: number) {
    try {
      await apiRequest(`/appointments/${id}/cancel/`, { method: "POST", token, tenantId });
      setLog(`Turno ${id} cancelado`);
      await refreshAll();
    } catch (e: any) {
      setLog(`Cancel error: ${e.message}`);
    }
  }

  async function createWaitlist() {
    try {
      await apiRequest("/waitlists/", {
        method: "POST",
        token,
        tenantId,
        body: { service: Number(waitlistServiceId), desired_date: waitlistDate, status: "active" },
      });
      setLog("Waitlist creada");
      await refreshAll();
    } catch (e: any) {
      setLog(`Waitlist error: ${e.message}`);
    }
  }

  async function createWaitlistEntry() {
    try {
      await apiRequest("/waitlist-entries/", {
        method: "POST",
        token,
        tenantId,
        body: { waitlist: Number(waitlistIdForEntry), client: Number(waitlistClientIdForEntry), priority: 100 },
      });
      setLog("Entrada waitlist creada");
      await refreshAll();
    } catch (e: any) {
      setLog(`Entry error: ${e.message}`);
    }
  }

  async function offerFromCancel() {
    try {
      await apiRequest("/waitlist-offers/offer-from-cancel/", {
        method: "POST",
        token,
        tenantId,
        body: { appointment_id: Number(appointmentIdForOffer) },
      });
      setLog("Oferta de waitlist generada");
      await refreshAll();
    } catch (e: any) {
      setLog(`Offer error: ${e.message}`);
    }
  }

  async function createProduct() {
    try {
      await apiRequest("/products/", {
        method: "POST",
        token,
        tenantId,
        body: { name: productName, type: "service", price: Number(productPrice), is_active: true },
      });
      setLog("Producto creado");
      await refreshAll();
    } catch (e: any) {
      setLog(`Producto error: ${e.message}`);
    }
  }

  async function createOrder() {
    try {
      await apiRequest("/orders/", {
        method: "POST",
        token,
        tenantId,
        body: { client: orderClientId ? Number(orderClientId) : null, status: "draft", total_amount: 0, currency: "ARS" },
      });
      setLog("Orden creada");
      await refreshAll();
    } catch (e: any) {
      setLog(`Orden error: ${e.message}`);
    }
  }

  async function createOrderItem() {
    try {
      await apiRequest("/order-items/", {
        method: "POST",
        token,
        tenantId,
        body: {
          order: Number(orderIdForItem),
          product: Number(productIdForItem),
          qty: Number(itemQty),
          unit_price: Number(itemUnitPrice),
        },
      });
      setLog("Item agregado a orden");
      await refreshAll();
    } catch (e: any) {
      setLog(`Item error: ${e.message}`);
    }
  }

  async function createPayment() {
    try {
      await apiRequest("/payments/", {
        method: "POST",
        token,
        tenantId,
        body: { order: Number(orderIdForPayment), method: "cash", amount: Number(paymentAmount), external_ref: "" },
      });
      setLog("Pago registrado");
      await refreshAll();
    } catch (e: any) {
      setLog(`Pago error: ${e.message}`);
    }
  }

  async function markPaid(orderId: number) {
    try {
      await apiRequest(`/orders/${orderId}/mark-paid/`, { method: "POST", token, tenantId });
      setLog(`Orden ${orderId} marcada como pagada`);
      await refreshAll();
    } catch (e: any) {
      setLog(`mark-paid error: ${e.message}`);
    }
  }

  async function createInvoice(orderId: number) {
    try {
      await apiRequest(`/orders/${orderId}/create-invoice/`, { method: "POST", token, tenantId });
      setLog(`Factura emitida para orden ${orderId}`);
      await refreshAll();
    } catch (e: any) {
      setLog(`invoice error: ${e.message}`);
    }
  }

  async function acceptOffer(offerId: number) {
    try {
      await apiRequest(`/waitlist-offers/${offerId}/accept/`, { method: "POST", token, tenantId });
      setLog(`Oferta ${offerId} aceptada`);
      await refreshAll();
    } catch (e: any) {
      setLog(`accept offer error: ${e.message}`);
    }
  }

  async function rejectOffer(offerId: number) {
    try {
      await apiRequest(`/waitlist-offers/${offerId}/reject/`, { method: "POST", token, tenantId });
      setLog(`Oferta ${offerId} rechazada`);
      await refreshAll();
    } catch (e: any) {
      setLog(`reject offer error: ${e.message}`);
    }
  }

  async function queueReminder() {
    try {
      await apiRequest("/message-queue/queue-appointment-reminder/", {
        method: "POST",
        token,
        tenantId,
        body: { appointment_id: Number(appointmentIdForReminder) },
      });
      setLog("Recordatorio en cola");
      await refreshAll();
    } catch (e: any) {
      setLog(`queue reminder error: ${e.message}`);
    }
  }

  async function markMessageSent(messageId: number) {
    try {
      await apiRequest(`/message-queue/${messageId}/mark-sent/`, { method: "POST", token, tenantId });
      setLog(`Mensaje ${messageId} marcado como enviado`);
      await refreshAll();
    } catch (e: any) {
      setLog(`mark sent error: ${e.message}`);
    }
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Workspace Profesional</h1>
      <p className="small">API: {getApiUrl()}</p>

      <div className="card">
        <h2>1) Login y contexto</h2>
        <div className="formGrid">
          <input className="input" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="linkBtn" onClick={login}>Login</button>
        </div>
        <div className="formGrid" style={{ marginTop: 8 }}>
          <input className="input" placeholder="Tenant ID activo" value={tenantId} onChange={(e) => { setTenantId(e.target.value); localStorage.setItem("nila_tenant_id", e.target.value); }} />
          <button className="mutedBtn" onClick={refreshAll}>Refrescar todo</button>
          <Link className="mutedBtn" href="/professional/dashboard">Volver</Link>
        </div>
      </div>

      <div className="grid">
        <section className="card">
          <h2>2) Tenant</h2>
          <div className="formGrid">
            <input className="input" value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Nombre" />
            <input className="input" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Slug" />
            <button className="linkBtn" onClick={createTenant}>Crear tenant</button>
          </div>
          <ul className="list">{tenants.map((t) => <li key={t.id}>{t.id} - {t.name}</li>)}</ul>
        </section>

        <section className="card">
          <h2>3) Servicios</h2>
          <div className="formGrid">
            <input className="input" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Servicio" />
            <input className="input" value={serviceDiscipline} onChange={(e) => setServiceDiscipline(e.target.value)} placeholder="Disciplina" />
            <button className="linkBtn" onClick={createService}>Crear servicio</button>
          </div>
          <ul className="list">{services.map((s) => <li key={s.id}>{s.id} - {s.name}</li>)}</ul>
        </section>

        <section className="card">
          <h2>4) Clientes</h2>
          <div className="formGrid">
            <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre" />
            <input className="input" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" />
            <button className="linkBtn" onClick={createClient}>Crear cliente</button>
          </div>
          <ul className="list">{clients.map((c) => <li key={c.id}>{c.id} - {c.full_name}</li>)}</ul>
        </section>

        <section className="card">
          <h2>5) Turnos</h2>
          <div className="formGrid">
            <select className="select" value={appointmentServiceId} onChange={(e) => setAppointmentServiceId(e.target.value)}>
              <option value="">Servicio</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="select" value={appointmentClientId} onChange={(e) => setAppointmentClientId(e.target.value)}>
              <option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <button className="linkBtn" onClick={createAppointment}>Crear turno</button>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <input className="input" type="datetime-local" value={appointmentStart} onChange={(e) => setAppointmentStart(e.target.value)} />
            <input className="input" type="datetime-local" value={appointmentEnd} onChange={(e) => setAppointmentEnd(e.target.value)} />
            <input className="input" value={appointmentIdForOffer} onChange={(e) => setAppointmentIdForOffer(e.target.value)} placeholder="ID turno para offer-from-cancel" />
          </div>
          <ul className="list">{appointments.map((a) => <li key={a.id}>{a.id} - {a.status} <button className="mutedBtn" onClick={() => cancelAppointment(a.id)}>Cancelar</button></li>)}</ul>
        </section>

        <section className="card">
          <h2>6) Waitlist</h2>
          <div className="formGrid">
            <select className="select" value={waitlistServiceId} onChange={(e) => setWaitlistServiceId(e.target.value)}>
              <option value="">Servicio</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" type="date" value={waitlistDate} onChange={(e) => setWaitlistDate(e.target.value)} />
            <button className="linkBtn" onClick={createWaitlist}>Crear waitlist</button>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <select className="select" value={waitlistIdForEntry} onChange={(e) => setWaitlistIdForEntry(e.target.value)}>
              <option value="">Waitlist</option>{waitlists.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
            </select>
            <select className="select" value={waitlistClientIdForEntry} onChange={(e) => setWaitlistClientIdForEntry(e.target.value)}>
              <option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <button className="linkBtn" onClick={createWaitlistEntry}>Crear entrada</button>
          </div>
          <div className="linkRow"><button className="linkBtn" onClick={offerFromCancel}>Offer from cancel</button></div>
        </section>

        <section className="card">
          <h2>7) POS + Caja</h2>
          <div className="formGrid">
            <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Producto" />
            <input className="input" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Precio" />
            <button className="linkBtn" onClick={createProduct}>Crear producto</button>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <select className="select" value={orderClientId} onChange={(e) => setOrderClientId(e.target.value)}>
              <option value="">Cliente (opcional)</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <button className="linkBtn" onClick={createOrder}>Crear orden</button>
            <span className="badge">Ordenes: {orders.length}</span>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <select className="select" value={orderIdForItem} onChange={(e) => setOrderIdForItem(e.target.value)}>
              <option value="">Orden</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.id}</option>)}
            </select>
            <select className="select" value={productIdForItem} onChange={(e) => setProductIdForItem(e.target.value)}>
              <option value="">Producto</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="linkBtn" onClick={createOrderItem}>Agregar item</button>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <input className="input" value={itemQty} onChange={(e) => setItemQty(e.target.value)} placeholder="qty" />
            <input className="input" value={itemUnitPrice} onChange={(e) => setItemUnitPrice(e.target.value)} placeholder="unit_price" />
            <span className="badge">Monto = qty x unit_price</span>
          </div>
          <div className="formGrid" style={{ marginTop: 8 }}>
            <select className="select" value={orderIdForPayment} onChange={(e) => setOrderIdForPayment(e.target.value)}>
              <option value="">Orden pago</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.id}</option>)}
            </select>
            <input className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="monto" />
            <button className="linkBtn" onClick={createPayment}>Registrar pago</button>
          </div>
          <ul className="list">
            {orders.map((o) => (
              <li key={o.id}>
                Orden {o.id} - {o.status} - total {o.total_amount}
                <button className="mutedBtn" onClick={() => markPaid(o.id)}>Mark paid</button>
                <button className="mutedBtn" onClick={() => createInvoice(o.id)}>Emitir factura</button>
              </li>
            ))}
          </ul>
          <p className="small">Movimientos caja: {cash.length}</p>
        </section>

        <section className="card">
          <h2>8) Ofertas Waitlist</h2>
          <ul className="list">
            {waitlistOffers.map((offer) => (
              <li key={offer.id}>
                Oferta {offer.id} - estado {offer.status} - turno {offer.appointment}
                <button className="mutedBtn" onClick={() => acceptOffer(offer.id)}>Aceptar</button>
                <button className="mutedBtn" onClick={() => rejectOffer(offer.id)}>Rechazar</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>9) Recordatorios</h2>
          <div className="formGrid">
            <input className="input" value={appointmentIdForReminder} onChange={(e) => setAppointmentIdForReminder(e.target.value)} placeholder="ID turno" />
            <button className="linkBtn" onClick={queueReminder}>Colar recordatorio</button>
            <span className="badge">Mensajes: {messageQueue.length}</span>
          </div>
          <ul className="list">
            {messageQueue.map((m) => (
              <li key={m.id}>
                Msg {m.id} - {m.channel} - {m.status} - {m.to_address}
                {m.status !== "sent" && <button className="mutedBtn" onClick={() => markMessageSent(m.id)}>Mark sent</button>}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>10) Facturacion</h2>
          <p className="small">Facturas emitidas: {invoices.length}</p>
          <ul className="list">
            {invoices.map((inv) => (
              <li key={inv.id}>#{inv.number} - orden {inv.order} - total {inv.total} - {inv.status}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>11) Resumen Financiero</h2>
          {financialSummary ? (
            <ul className="list">
              <li>Ordenes: {financialSummary.orders_count}</li>
              <li>Ordenes pagadas: {financialSummary.orders_paid_count}</li>
              <li>Total ordenes: ARS {financialSummary.orders_total}</li>
              <li>Total cobrado: ARS {financialSummary.payments_total}</li>
              <li>Total facturado: ARS {financialSummary.invoices_total}</li>
              <li>Pendiente: ARS {financialSummary.pending_amount}</li>
            </ul>
          ) : (
            <p className="small">Sin datos</p>
          )}
        </section>
      </div>

      <h3 className="sectionTitle">Log operativo</h3>
      <pre className="pre">{log}</pre>
    </main>
  );
}


