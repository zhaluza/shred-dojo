import { useRef, useEffect, useState, useCallback } from "react";

interface AlphaTabPlayerProps {
  file: string;
  loop: boolean;
  onToggleLoop: () => void;
}

export function AlphaTabPlayer({ file, loop, onToggleLoop }: AlphaTabPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    import("@coderline/alphatab").then((alphaTab) => {
      if (destroyed || !containerRef.current) return;

      const settings: any = {
        core: {
          fontDirectory: "/font/",
          logLevel: alphaTab.LogLevel.None,
        },
        display: {
          staveProfile: alphaTab.StaveProfile.TabMixed,
          layoutMode: alphaTab.LayoutMode.Horizontal,
        },
        player: {
          enablePlayer: true,
          enableCursor: true,
          enableUserInteraction: true,
          soundFont: "/soundfont/sonivox.sf2",
          scrollElement: containerRef.current,
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
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!isReady}
          className="font-display text-[0.7rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isPlaying ? "var(--text)" : "transparent",
            color: isPlaying ? "var(--bg)" : "var(--text)",
            borderColor: isPlaying ? "var(--text)" : "var(--border)",
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleStop}
          disabled={!isReady}
          className="font-display text-[0.7rem] tracking-[0.08em] uppercase border border-[var(--border)] text-[var(--text)] bg-transparent px-3 py-[0.35rem] transition-colors hover:border-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Stop
        </button>
        <button
          onClick={onToggleLoop}
          className="font-display text-[0.7rem] tracking-[0.08em] uppercase border px-3 py-[0.35rem] transition-colors"
          style={{
            backgroundColor: loop ? "var(--text)" : "transparent",
            color: loop ? "var(--bg)" : "var(--text)",
            borderColor: loop ? "var(--text)" : "var(--border)",
          }}
        >
          Loop
        </button>
        {isLoading && (
          <span className="text-[0.6rem] tracking-[0.1em] uppercase text-[var(--muted)]">
            Loading...
          </span>
        )}
      </div>

      {/* AlphaTab render target */}
      <div
        ref={containerRef}
        className="overflow-x-auto border border-[var(--border)] bg-white"
        style={{ minHeight: 160 }}
      />
    </div>
  );
}
