import { AuthScreen } from "@/components/auth/AuthScreen";
import { SharedView } from "@/components/data-room/SharedView";
import { WorkspaceScreen } from "@/components/data-room/WorkspaceScreen";
import { useDataRoomWorkspace } from "@/hooks/useDataRoomWorkspace";

function App() {
  const workspace = useDataRoomWorkspace();

  if (workspace.sharedToken) {
    return <SharedView error={workspace.sharedError} payload={workspace.sharedPayload} />;
  }

  if (!workspace.token || !workspace.user) {
    return (
      <AuthScreen
        authMode={workspace.authMode}
        authNotice={workspace.authNotice}
        email={workspace.email}
        loading={workspace.loading}
        name={workspace.name}
        password={workspace.password}
        theme={workspace.theme}
        onAuthModeChange={workspace.setAuthMode}
        onEmailChange={workspace.setEmail}
        onGoogleOAuth={workspace.startGoogleOAuth}
        onNameChange={workspace.setName}
        onPasswordChange={workspace.setPassword}
        onSubmit={workspace.handleAuth}
        onThemeToggle={() => workspace.setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
    );
  }

  return <WorkspaceScreen controller={workspace} />;
}

export default App;
