import { useState } from "react";
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

function AppContent() {
  const { currentRequester } = useRequester();
  const [screen, setScreen] = useState<Screen>({ view: "my-tickets" });

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  // Ticket Detail is a sub-page of My Tickets, not its own top-level nav item.
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
        <TicketDetail
          ticketId={screen.ticketId}
          onBack={() => setScreen({ view: "my-tickets" })}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
