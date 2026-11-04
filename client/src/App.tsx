import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import Login from "./components/Login.js";
import ChangePassword from "./components/ChangePassword.js";
import AppShell, { AppView, NavItem } from "./components/AppShell.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import TicketDetail from "./components/TicketDetail.js";
import StaffQueue from "./components/StaffQueue.js";
import StaffTicketDetail from "./components/StaffTicketDetail.js";
import UserManagement from "./components/UserManagement.js";

type RequesterScreen =
  | { view: "my-tickets" }
  | { view: "create-ticket" }
  | { view: "ticket-detail"; ticketId: number };

const REQUESTER_NAV: NavItem[] = [
  { view: "my-tickets", label: "My Tickets" },
  { view: "create-ticket", label: "Create Ticket" },
];
const STAFF_NAV: NavItem[] = [{ view: "my-queue", label: "My Queue" }];
const ADMIN_NAV: NavItem[] = [{ view: "admin", label: "Admin" }];

function RequesterApp() {
  const [screen, setScreen] = useState<RequesterScreen>({ view: "my-tickets" });
  const navView: AppView = screen.view === "create-ticket" ? "create-ticket" : "my-tickets";

  return (
    <AppShell
      navItems={REQUESTER_NAV}
      activeView={navView}
      onNavigate={(view) => setScreen(view === "create-ticket" ? { view } : { view: "my-tickets" })}
    >
      {screen.view === "my-tickets" && (
        <MyTickets
          onCreateTicket={() => setScreen({ view: "create-ticket" })}
          onOpenTicket={(ticketId) => setScreen({ view: "ticket-detail", ticketId })}
        />
      )}
      {screen.view === "create-ticket" && <CreateTicket />}
      {screen.view === "ticket-detail" && (
        <TicketDetail ticketId={screen.ticketId} onBack={() => setScreen({ view: "my-tickets" })} />
      )}
    </AppShell>
  );
}

function StaffApp() {
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  return (
    <AppShell navItems={STAFF_NAV} activeView="my-queue" onNavigate={() => setOpenTicketId(null)}>
      {openTicketId === null ? (
        <StaffQueue onOpenTicket={setOpenTicketId} />
      ) : (
        <StaffTicketDetail ticketId={openTicketId} onBack={() => setOpenTicketId(null)} />
      )}
    </AppShell>
  );
}

function AdminApp() {
  return (
    <AppShell navItems={ADMIN_NAV} activeView="admin" onNavigate={() => undefined}>
      <UserManagement />
    </AppShell>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center py-5 text-muted">Loading…</div>;
  }
  if (!user) {
    return <Login />;
  }
  if (user.mustChangePassword) {
    return <ChangePassword />;
  }
  if (user.role === "IT_STAFF") {
    return <StaffApp />;
  }
  if (user.role === "ADMINISTRATOR") {
    return <AdminApp />;
  }
  return <RequesterApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
