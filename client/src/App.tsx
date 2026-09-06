import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import RequesterSelection from "./components/RequesterSelection.js";
import AppShell from "./components/AppShell.js";

function AppContent() {
  const { currentRequester } = useRequester();

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  return (
    <AppShell>
      <h1 className="h4 mb-3">Welcome, {currentRequester.name}</h1>
      <p className="text-muted">
        Create Ticket and My Tickets will be available once those Issues are implemented.
      </p>
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
