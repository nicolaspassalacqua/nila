import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="brand">NILA</div>
      <div className="brandTag">Strategy | Technology | Execution</div>

      <h1 className="sectionTitle">Plataforma Operativa</h1>
      <div className="grid">
        <section className="card">
          <h2>Cliente</h2>
          <p>Busqueda de profesionales, reservas, turnos y lista de espera.</p>
          <div className="cardActions">
            <Link className="linkBtn" href="/client/dashboard">Dashboard cliente</Link>
          </div>
        </section>
        <section className="card">
          <h2>Profesional</h2>
          <p>Agenda, CRM, POS, multi-tenant y operaciones del negocio.</p>
          <div className="cardActions">
            <Link className="linkBtn" href="/professional/dashboard">Dashboard profesional</Link>
          </div>
        </section>
      </div>

      <div className="linkRow">
        <Link className="linkBtn" href="/login">Ingresar</Link>
        <Link className="mutedBtn" href="/client/marketplace">Marketplace</Link>
      </div>
    </main>
  );
}

