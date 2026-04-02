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
        if (!destroyed && e.endTime > 0) {
          setProgress(Math.min(100, (e.currentTime / e.endTime) * 100));
        }
      });

      api.playerFinished.on(() => {
        if (!destroyed) {
          setProgress(0);
        }
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

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.isLooping = loop;
    }
  }, [loop]);

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
            backgroundColor: loop ? "var(--text)" : "transparent",
            color: loop ? "var(--bg)" : "var(--muted)",
            borderColor: loop ? "var(--text)" : "var(--border)",
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
