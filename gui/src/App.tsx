import { useMemo, useState, useSyncExternalStore } from "react";
import type { Action } from "./bindings/Action";
import type { UpdateAsk } from "./bindings/UpdateAsk";
import type { WindowMode } from "./bindings/WindowMode";
import { showsOnboarding, type Connection } from "./connection";
import { Onboarding } from "./Onboarding";
import { Shell } from "./Shell";

/** The page: the first-launch questions until boot, then the shell. */
export function App({ connection }: { connection: Connection }) {
  const state = useSyncExternalStore(connection.subscribe, connection.getState);
  // One function for the whole session, so a tick does not re-render the memoized lists.
  const send = useMemo(
    () => (action: Action) => connection.send({ type: "action", action }),
    [connection],
  );
  const ask = useMemo(
    () => (ask: UpdateAsk) => connection.send({ type: "update", ask }),
    [connection],
  );
  const resize = useMemo(
    () => (mode: WindowMode) => connection.send({ type: "window", mode }),
    [connection],
  );

  if (state.expired)
    return (
      <>
        {state.onboarding && !state.booted && (
          <pre className="transcript">{state.onboarding.transcript}</pre>
        )}
        <p className="notice">This page is no longer connected to spotatui.</p>
        <AccessCodeForm />
      </>
    );

  if (state.onboarding && showsOnboarding(state))
    return (
      <Onboarding
        view={state.onboarding}
        connected={state.connected}
        onReply={(reply) => connection.send({ type: "onboarding", reply })}
      />
    );

  return (
    <Shell
      state={state}
      send={send}
      onUpdate={ask}
      onWindow={state.window ? resize : null}
      onQuit={() => connection.send({ type: "quit" })}
    />
  );
}

/** Fork: hosted mode. Takes the access code and reloads with it in the fragment, as a launch link would. */
function AccessCodeForm() {
  const [code, setCode] = useState("");
  return (
    <form
      className="notice"
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim();
        if (!value) return;
        window.location.href = `${window.location.pathname}#code=${encodeURIComponent(value)}`;
        window.location.reload();
      }}
    >
      <label>
        Access code{" "}
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>{" "}
      <button type="submit">Connect</button>
    </form>
  );
}
