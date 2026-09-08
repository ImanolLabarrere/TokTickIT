import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import RequesterSelection from "./components/RequesterSelection.js";
import AppShell, { AppView } from "./components/AppShell.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";

function AppContent() {
  const { currentRequester } = useRequester();
  const [view, setView] = useState<AppView>("my-tickets");

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  return (
    <AppShell activeView={view} onNavigate={setView}>
      {view === "my-tickets" ? (
        <MyTickets onCreateTicket={() => setView("create-ticket")} />
      ) : (
        <CreateTicket />
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
