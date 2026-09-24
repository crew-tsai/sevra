import { Component, type ReactNode } from "react";

/**
 * Catches a route that failed to load, and recovers from the common cause.
 *
 * Routes are code-split, so opening one fetches a JavaScript chunk whose name
 * contains a hash of its contents. Deploy again and those names change. A tab
 * that has been open across a deploy — or a browser holding a cached
 * index.html — then asks for a chunk that no longer exists, the import
 * rejects, and React suspends forever behind a blank screen with nothing
 * logged and nothing to click.
 *
 * That happened here. The splitting went out without this and a workspace
 * appeared not to load.
 *
 * So: a failed chunk reloads the page ONCE, which fetches the current
 * index.html and the current chunk names, and almost always fixes it. The
 * "once" is the important half — a reload loop would be worse than the blank
 * page it replaces — so the attempt is recorded in sessionStorage and a
 * second failure shows a real message instead.
 */
const RELOAD_KEY = "sevra:chunk-reload";

function isChunkError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Loading chunk|Failed to fetch dynamically imported|Importing a module script failed|dynamically imported module/i
    .test(message);
}

type Props = { children: ReactNode; message: string; retry: string };
type State = { failed: boolean };

export class RouteBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (!isChunkError(error)) {
      // Something else broke. Leave it to the visible message and the
      // console rather than reloading over a real bug forever.
      console.error("Route failed to render", error);
      return;
    }
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_KEY) === "1";
      if (!alreadyTried) sessionStorage.setItem(RELOAD_KEY, "1");
    } catch {
      // Private window, blocked storage: treat as already tried, because
      // without somewhere to record the attempt a reload could loop.
      alreadyTried = true;
    }
    if (!alreadyTried) window.location.reload();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm text-muted-foreground">{this.props.message}</p>
          <button
            type="button"
            className="text-sm font-medium text-primary underline underline-offset-4"
            onClick={() => {
              try {
                sessionStorage.removeItem(RELOAD_KEY);
              } catch { /* nothing to clear */ }
              window.location.reload();
            }}
          >
            {this.props.retry}
          </button>
        </div>
      </div>
    );
  }
}

/** Clears the one-shot guard once a route has actually rendered. */
export function clearChunkReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch { /* nothing to clear */ }
}
