import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import RequesterSelection from "./components/RequesterSelection.js";
import AppShell from "./components/AppShell.js";
import CreateTicket from "./components/CreateTicket.js";

function AppContent() {
  const { currentRequester } = useRequester();

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  return (
    <AppShell>
      <CreateTicket />
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
