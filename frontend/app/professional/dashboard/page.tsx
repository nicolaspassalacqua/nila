"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";

type Appointment = { id: number; status: string };
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

export default function ProfessionalDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cash, setCash] = useState<CashMovement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [log, setLog] = useState("Listo");

  const todayIncome = useMemo(() => {
    return cash.filter((m) => m.type === "in").reduce((sum, m) => sum + Number(m.amount), 0);
  }, [cash]);

  useEffect(() => {
    const session = getSession();
    if (!session.token || !session.tenantId) {
      router.replace("/login");
      return;
    }
    setToken(session.token);
    setTenantId(session.tenantId);
    setIsStaff(Boolean(session.user?.is_staff));
    void refresh(session.token, session.tenantId);
  }, [router]);

  async function refresh(activeToken = token, activeTenant = tenantId) {
    try {
      const [a, c, s, o, cm, inv, fin] = await Promise.all([
        apiRequest<Appointment[]>("/appointments", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Client[]>("/clients", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Service[]>("/services", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Order[]>("/orders", { token: activeToken, tenantId: activeTenant }),
        apiRequest<CashMovement[]>("/cash-movements", { token: activeToken, tenantId: activeTenant }),
        apiRequest<Invoice[]>("/invoices", { token: activeToken, tenantId: activeTenant }),
        apiRequest<FinancialSummary>("/orders/financial-summary", { token: activeToken, tenantId: activeTenant }),
      ]);
      setAppointments(a);
      setClients(c);
      setServices(s);
      setOrders(o);
      setCash(cm);
      setInvoices(inv);
      setSummary(fin);
      setLog("Panel actualizado");
    } catch (error: any) {
      setLog(`Error: ${error.message}`);
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>
      <h1 className="sectionTitle">Panel Profesional</h1>

      <div className="grid">
        <section className="card"><h2>Agenda</h2><p>{appointments.length} turnos totales</p></section>
        <section className="card"><h2>Clientes</h2><p>{clients.length} clientes activos</p></section>
        <section className="card"><h2>Servicios</h2><p>{services.length} servicios publicados</p></section>
        <section className="card"><h2>POS</h2><p>Ingresos registrados: ARS {todayIncome.toLocaleString("es-AR")}</p></section>
        <section className="card"><h2>Ordenes</h2><p>{orders.length} ordenes | pagadas: {orders.filter((o) => o.status === "paid").length}</p></section>
        <section className="card"><h2>Facturas</h2><p>{invoices.length} emitidas</p></section>
      </div>

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
        {isStaff ? <Link className="mutedBtn" href="/internal/admin">Administracion interna</Link> : null}
        <button className="mutedBtn" onClick={logout}>Cerrar sesion</button>
      </div>

      <pre className="pre">{log}</pre>
    </main>
  );
}

