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
import RequesterDashboard from "./components/RequesterDashboard.js";
import StaffDashboard from "./components/StaffDashboard.js";

type RequesterScreen =
  | { view: "dashboard" }
  | { view: "my-tickets" }
  | { view: "create-ticket" }
  | { view: "ticket-detail"; ticketId: number };

const REQUESTER_NAV: NavItem[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "my-tickets", label: "My Tickets" },
  { view: "create-ticket", label: "Create Ticket" },
];

const STAFF_NAV: NavItem[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "my-queue", label: "My Queue" },
];

const ADMIN_NAV: NavItem[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "admin", label: "Admin" },
];

function RequesterApp() {
  const [screen, setScreen] = useState<RequesterScreen>({ view: "my-tickets" });

  const navView: AppView =
    screen.view === "create-ticket"
      ? "create-ticket"
      : screen.view === "dashboard"
      ? "dashboard"
      : "my-tickets";

  return (
    <AppShell
      navItems={REQUESTER_NAV}
      activeView={navView}
      onNavigate={(view) => {
        if (view === "create-ticket") setScreen({ view: "create-ticket" });
        else if (view === "dashboard") setScreen({ view: "dashboard" });
        else setScreen({ view: "my-tickets" });
      }}
    >
      {screen.view === "dashboard" && (
        <RequesterDashboard
          onCreateTicket={() => setScreen({ view: "create-ticket" })}
          onViewTickets={() => setScreen({ view: "my-tickets" })}
          onOpenTicket={(ticketId) => setScreen({ view: "ticket-detail", ticketId })}
        />
      )}
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
  const [screen, setScreen] = useState<
    | { view: "dashboard" }
    | { view: "my-queue" }
    | { view: "ticket-detail"; ticketId: number }
  >({ view: "my-queue" });

  const navView: AppView = screen.view === "dashboard" ? "dashboard" : "my-queue";

  return (
    <AppShell
      navItems={STAFF_NAV}
      activeView={navView}
      onNavigate={(view) => {
        if (view === "dashboard") setScreen({ view: "dashboard" });
        else setScreen({ view: "my-queue" });
      }}
    >
      {screen.view === "dashboard" && (
        <StaffDashboard
          onNavigateToQueue={() => setScreen({ view: "my-queue" })}
          onOpenTicket={(ticketId) => setScreen({ view: "ticket-detail", ticketId })}
        />
      )}
      {screen.view === "my-queue" && (
        <StaffQueue onOpenTicket={(ticketId) => setScreen({ view: "ticket-detail", ticketId })} />
      )}
      {screen.view === "ticket-detail" && (
        <StaffTicketDetail
          ticketId={screen.ticketId}
          onBack={() => setScreen({ view: "my-queue" })}
        />
      )}
    </AppShell>
  );
}

function AdminApp() {
  const [screen, setScreen] = useState<
    | { view: "dashboard" }
    | { view: "admin" }
    | { view: "ticket-detail"; ticketId: number }
  >({ view: "admin" });

  const navView: AppView = screen.view === "dashboard" ? "dashboard" : "admin";

  return (
    <AppShell
      navItems={ADMIN_NAV}
      activeView={navView}
      onNavigate={(view) => {
        if (view === "dashboard") setScreen({ view: "dashboard" });
        else setScreen({ view: "admin" });
      }}
    >
      {screen.view === "dashboard" && (
        <StaffDashboard
          onNavigateToQueue={() => setScreen({ view: "admin" })}
          onOpenTicket={(ticketId) => setScreen({ view: "ticket-detail", ticketId })}
          onNavigateToAdmin={() => setScreen({ view: "admin" })}
        />
      )}
      {screen.view === "admin" && <UserManagement />}
      {screen.view === "ticket-detail" && (
        <StaffTicketDetail
          ticketId={screen.ticketId}
          onBack={() => setScreen({ view: "dashboard" })}
        />
      )}
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
