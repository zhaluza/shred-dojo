import { useRef, useEffect, useState, useCallback } from "react";

interface AlphaTabPlayerProps {
  file: string;
  loop: boolean;
  onToggleLoop: () => void;
}

export function AlphaTabPlayer({ file, loop, onToggleLoop }: AlphaTabPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0); // 0–100

  // Refs so event handlers always see current values without re-registering
  const loopRef = useRef(loop);
  // Guard: prevents double-seek when multiple position events fire near endTick
  const seekedRef = useRef(false);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    if (!containerRef.current || !scrollRef.current) return;

    let destroyed = false;

    import("@coderline/alphatab").then((alphaTab) => {
      if (destroyed || !containerRef.current || !scrollRef.current) return;

      const settings: any = {
        core: {
          fontDirectory: "/font/",
          logLevel: alphaTab.LogLevel.None,
        },
        display: {
          // ScoreTab = 1: standard notation stave above guitar tab
          staveProfile: alphaTab.StaveProfile.ScoreTab,
          layoutMode: alphaTab.LayoutMode.Horizontal,
          scale: 0.9,
        },
        player: {
          enablePlayer: true,
          enableCursor: true,
          enableUserInteraction: true,
          soundFont: "/soundfont/sonivox.sf2",
          scrollElement: scrollRef.current,
        },
        notation: {
          elements: new Map<number, boolean>([
            [alphaTab.NotationElement.ScoreTitle, false],
            [alphaTab.NotationElement.ScoreSubTitle, false],
            [alphaTab.NotationElement.ScoreArtist, false],
            [alphaTab.NotationElement.ScoreAlbum, false],
            [alphaTab.NotationElement.ScoreWords, false],
            [alphaTab.NotationElement.ScoreMusic, false],
            [alphaTab.NotationElement.ScoreCopyright, false],
            [alphaTab.NotationElement.ScoreWordsAndMusic, false],
          ]),
        },
      };

      const api = new alphaTab.AlphaTabApi(containerRef.current, settings);
      // Never use api.isLooping — it waits for the audio buffer to drain before
      // restarting (the "gap"). We implement looping ourselves via tick monitoring.
      api.load(file);

      api.playerReady.on(() => {
        if (!destroyed) {
          setIsReady(true);
          setIsLoading(false);
        }
      });

      api.playerStateChanged.on((e: any) => {
        if (!destroyed) {
          setIsPlaying(e.state === 1); // PlayerState.Playing = 1
        }
      });

      api.playerPositionChanged.on((e: any) => {
        if (destroyed || e.endTick <= 0) return;

        setProgress(Math.min(100, (e.currentTick / e.endTick) * 100));

        if (loopRef.current) {
          // Jump back 20 ticks before endTick. At 960 PPQ this is ~1/48th of a
          // beat — inaudible at any tempo — but early enough that the sequencer
          // never stops dispatching MIDI events, so synth voices never fade and
          // the audio buffer never drains. This is the workaround confirmed in
          // AlphaTab issue #2569; the built-in isLooping has this gap by design.
          if (e.currentTick >= e.endTick - 20 && !seekedRef.current) {
            seekedRef.current = true;
            api.tickPosition = 0;
            setProgress(0);
          }
          // Reset guard once safely past the start of the next cycle
          if (e.currentTick > e.endTick * 0.25) {
            seekedRef.current = false;
          }
        }
      });

      // Fallback: fires if the 20-tick window was somehow missed entirely.
      // play() alone (no stop() first) restarts with minimal latency.
      api.playerFinished.on(() => {
        if (destroyed) return;
        setProgress(0);
        if (loopRef.current) api.play();
      });

      api.renderFinished.on(() => {
        if (!destroyed) setIsLoading(false);
      });

      apiRef.current = api;
    });

    return () => {
      destroyed = true;
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [file]);

  const handlePlayPause = useCallback(() => {
    if (!apiRef.current || !isReady) return;
    apiRef.current.playPause();
  }, [isReady]);

  const handleStop = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.stop();
    setIsPlaying(false);
    setProgress(0);
  }, []);

  return (
    <div className="flex flex-col gap-0">
      {/* Transport bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border border-[var(--border)]"
        style={{ backgroundColor: "var(--surface)" }}
      >
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          disabled={!isReady}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="w-8 h-8 flex items-center justify-center border transition-colors shrink-0 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isPlaying ? "var(--accent)" : "transparent",
            borderColor: isPlaying ? "var(--accent)" : "var(--border)",
            color: isPlaying ? "#fff" : "var(--text)",
          }}
        >
          {isPlaying ? (
            /* Pause icon */
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect x="0" y="0" width="3.5" height="12" />
              <rect x="6.5" y="0" width="3.5" height="12" />
            </svg>
          ) : (
            /* Play icon */
            <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor">
              <polygon points="0,0 11,6.5 0,13" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          disabled={!isReady}
          aria-label="Stop"
          className="w-8 h-8 flex items-center justify-center border border-[var(--border)] transition-colors shrink-0 disabled:opacity-25 disabled:cursor-not-allowed hover:border-[var(--text)]"
          style={{ backgroundColor: "transparent", color: "var(--text)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="0" y="0" width="10" height="10" />
          </svg>
        </button>

        {/* Progress track */}
        <div className="flex-1 h-[3px] bg-[var(--border)] relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-100"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </div>

        {/* Loop toggle */}
        <button
          onClick={onToggleLoop}
          aria-label={loop ? "Disable loop" : "Enable loop"}
          className="flex items-center gap-1.5 font-display text-[0.58rem] tracking-[0.1em] uppercase border px-2.5 py-1 transition-colors shrink-0"
          style={{
            backgroundColor: loop ? "var(--accent)" : "transparent",
            color: loop ? "var(--bg)" : "var(--muted)",
            borderColor: loop ? "var(--accent)" : "var(--border)",
            boxShadow: loop ? "var(--glow)" : undefined,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h7M7 1l2 2-2 2" />
            <path d="M9 8H2M4 6l-2 2 2 2" />
          </svg>
          Loop
        </button>

        {/* Status */}
        {isLoading && (
          <span className="font-display text-[0.55rem] tracking-[0.1em] uppercase text-[var(--muted)] shrink-0">
            Loading…
          </span>
        )}
      </div>

      {/* AlphaTab cursor styles — these class names are injected by AlphaTab
          into the DOM and have no default styling; we must provide them here. */}
      <style>{`
        .at-cursor-bar {
          background: rgba(139, 26, 26, 0.08);
        }
        .at-cursor-beat {
          background: rgba(139, 26, 26, 0.75);
          width: 2px;
        }
        .at-selection div {
          background: rgba(139, 26, 26, 0.12);
        }
      `}</style>

      {/* Score viewport */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden border-x border-b border-[var(--border)]"
        style={{ minHeight: 200, backgroundColor: "#fff" }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}
