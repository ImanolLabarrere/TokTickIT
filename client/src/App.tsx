import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import Login from "./components/Login.js";
import ChangePassword from "./components/ChangePassword.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import RequesterSelection from "./components/RequesterSelection.js";
import AppShell, { AppView } from "./components/AppShell.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import TicketDetail from "./components/TicketDetail.js";

type Screen =
  | { view: "my-tickets" }
  | { view: "create-ticket" }
  | { view: "ticket-detail"; ticketId: number };

function LegacyLab2App() {
  // TEMPORARY (Lab 3 Issue 2): Lab 2 screens still use the Development
  // Requester selector under the hood. Issue 3 ("Requester regression")
  // replaces this with the authenticated identity and removes the selector.
  const { currentRequester } = useRequester();
  const [screen, setScreen] = useState<Screen>({ view: "my-tickets" });

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  const navView: AppView = screen.view === "create-ticket" ? "create-ticket" : "my-tickets";

  return (
    <AppShell activeView={navView} onNavigate={(view) => setScreen({ view })}>
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

  return (
    <RequesterProvider>
      <LegacyLab2App />
    </RequesterProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}