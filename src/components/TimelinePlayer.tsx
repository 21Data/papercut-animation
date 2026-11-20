import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {BankBalance, COMPOSITION} from '../Video';
import {ACTS, ALL_SHOTS, FPS, TOTAL_FRAMES, WIDTH, HEIGHT} from '../lib/data';

/**
 * Formats a frame number into standard timecode format (HH:MM:SS:FF)
 */
function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const frames = Math.floor(frame % fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * State-driven Timeline Player Component
 * Connects @remotion/player to a custom interactive timeline UI.
 */
export const TimelinePlayer: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [selectedActId, setSelectedActId] = useState<string | null>(null);

  // Synchronize Player playback state with React state
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate = () => {
      const frame = player.getCurrentFrame();
      setCurrentFrame(frame);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, []);

  // Seek handler from timeline position
  const seekToPosition = useCallback((clientX: number) => {
    if (!timelineRef.current || !playerRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetFrame = Math.round(ratio * TOTAL_FRAMES);
    const clampedFrame = Math.max(0, Math.min(targetFrame, TOTAL_FRAMES - 1));

    playerRef.current.seekTo(clampedFrame);
    setCurrentFrame(clampedFrame);
  }, []);

  // Handle timeline mouse dragging/scrubbing
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    seekToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, seekToPosition]);

  // Keyboard navigation (Space: play/pause, Arrow keys: frame step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        playerRef.current.toggle();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const target = Math.max(0, currentFrame - delta);
        playerRef.current.seekTo(target);
        setCurrentFrame(target);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const target = Math.min(TOTAL_FRAMES - 1, currentFrame + delta);
        playerRef.current.seekTo(target);
        setCurrentFrame(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFrame]);

  // Find active act and shot at current frame
  const currentTimeSec = currentFrame / FPS;
  const currentAct = ACTS.find((a) => currentTimeSec >= a.start && currentTimeSec < a.end);
  const currentShot = ALL_SHOTS.find((s) => currentFrame >= s.startFrame && currentFrame < s.endFrame);

  const playheadPercent = (currentFrame / TOTAL_FRAMES) * 100;

  return (
    <div style={styles.container}>
      {/* ── Top Bar / Header ── */}
      <header style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <span style={styles.badge}>REMOTION PLAYER</span>
          <h1 style={styles.headerTitle}>Bank Balance — Video Editor Timeline</h1>
        </div>

        <div style={styles.headerControls}>
          <button
            style={{...styles.button, ...(isPlaying ? styles.activeButton : {})}}
            onClick={() => playerRef.current?.toggle()}
          >
            {isPlaying ? 'Pause' : 'Play'} (Space)
          </button>
          <button
            style={styles.button}
            onClick={() => {
              playerRef.current?.seekTo(0);
              setCurrentFrame(0);
            }}
          >
            |&lt; Start
          </button>
          <button
            style={styles.button}
            onClick={() => {
              const prev = Math.max(0, currentFrame - FPS);
              playerRef.current?.seekTo(prev);
              setCurrentFrame(prev);
            }}
          >
            -1s
          </button>
          <button
            style={styles.button}
            onClick={() => {
              const next = Math.min(TOTAL_FRAMES - 1, currentFrame + FPS);
              playerRef.current?.seekTo(next);
              setCurrentFrame(next);
            }}
          >
            +1s
          </button>
          <div style={styles.timecodeDisplay}>
            {formatTimecode(currentFrame, FPS)}
            <span style={styles.frameLabel}>
              ({currentFrame} / {TOTAL_FRAMES} f)
            </span>
          </div>
        </div>
      </header>

      {/* ── Preview Viewport ── */}
      <div style={styles.viewport}>
        <div style={styles.playerWrapper}>
          <Player
            ref={playerRef}
            component={BankBalance}
            durationInFrames={COMPOSITION.durationInFrames}
            compositionWidth={WIDTH}
            compositionHeight={HEIGHT}
            fps={FPS}
            style={styles.player}
            controls={false} // Custom controls used below
            loop
          />
        </div>

        {/* Current Playhead Status Sidebar */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Current Frame Context</h3>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Time:</span>
            <span style={styles.infoValue}>{currentTimeSec.toFixed(2)}s</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Active Act:</span>
            <span style={styles.infoValue}>{currentAct ? currentAct.title : 'None'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Active Shot:</span>
            <span style={styles.infoValue}>
              {currentShot ? `#${currentShot.index} (G#${currentShot.globalIndex})` : 'None'}
            </span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Shot Camera:</span>
            <span style={styles.infoValue}>{currentShot?.camera ?? '—'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>HUD Mode:</span>
            <span style={styles.infoValue}>{currentShot?.hud ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* ── State-Driven Timeline UI ── */}
      <div style={styles.timelineContainer}>
        {/* Track Headers */}
        <div style={styles.trackLabels}>
          <div style={styles.trackLabel}>Acts</div>
          <div style={styles.trackLabel}>Shots</div>
          <div style={styles.trackLabel}>Voiceover</div>
        </div>

        {/* Multi-Track Scrub Canvas */}
        <div
          ref={timelineRef}
          style={styles.timelineCanvas}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Playhead Vertical Line */}
          <div
            style={{
              ...styles.playhead,
              left: `${playheadPercent}%`,
            }}
          >
            <div style={styles.playheadHandle} />
          </div>

          {/* Track 1: Acts */}
          <div style={styles.trackRow}>
            {ACTS.map((act) => {
              const actStartFrame = Math.round(act.start * FPS);
              const actDurationFrames = Math.round(act.duration * FPS);
              const left = (actStartFrame / TOTAL_FRAMES) * 100;
              const width = (actDurationFrames / TOTAL_FRAMES) * 100;
              const isSelected = selectedActId === act.id;
              const isActive = currentAct?.id === act.id;

              return (
                <div
                  key={act.id}
                  title={`${act.title} (${act.duration.toFixed(1)}s)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedActId(act.id);
                    playerRef.current?.seekTo(actStartFrame);
                    setCurrentFrame(actStartFrame);
                  }}
                  style={{
                    ...styles.trackClip,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: isActive ? '#3b82f6' : isSelected ? '#1d4ed8' : '#27272a',
                    borderColor: isActive ? '#60a5fa' : '#3f3f46',
                  }}
                >
                  <span style={styles.clipText}>{act.title}</span>
                </div>
              );
            })}
          </div>

          {/* Track 2: Shot Cuts */}
          <div style={styles.trackRow}>
            {ALL_SHOTS.map((shot) => {
              const left = (shot.startFrame / TOTAL_FRAMES) * 100;
              const width = ((shot.endFrame - shot.startFrame) / TOTAL_FRAMES) * 100;
              const isActive = currentShot?.globalIndex === shot.globalIndex;

              return (
                <div
                  key={`shot-${shot.globalIndex}`}
                  title={`Shot #${shot.index}: ${shot.camera}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playerRef.current?.seekTo(shot.startFrame);
                    setCurrentFrame(shot.startFrame);
                  }}
                  style={{
                    ...styles.trackClip,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: isActive ? '#eab308' : '#1f2937',
                    borderColor: isActive ? '#fef08a' : '#374151',
                    color: isActive ? '#000' : '#d1d5db',
                  }}
                >
                  <span style={styles.clipText}>#{shot.index}</span>
                </div>
              );
            })}
          </div>

          {/* Track 3: Voiceover Audio */}
          <div style={styles.trackRow}>
            {ACTS.filter((a) => a.audio).map((act) => {
              const startFrame = Math.round(act.start * FPS);
              const durationFrames = Math.round(act.duration * FPS);
              const left = (startFrame / TOTAL_FRAMES) * 100;
              const width = (durationFrames / TOTAL_FRAMES) * 100;

              return (
                <div
                  key={`audio-${act.id}`}
                  style={{
                    ...styles.trackClip,
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: '#047857',
                    borderColor: '#10b981',
                  }}
                >
                  <span style={styles.clipText}>VO: {act.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles for standalone dark-mode timeline UI
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#09090b',
    color: '#f4f4f5',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderBottom: '1px solid #27272a',
    backgroundColor: '#18181b',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badge: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    backgroundColor: '#27272a',
    color: '#fafafa',
    border: '1px solid #3f3f46',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  activeButton: {
    backgroundColor: '#ef4444',
    borderColor: '#f87171',
    color: '#ffffff',
  },
  timecodeDisplay: {
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 700,
    backgroundColor: '#09090b',
    border: '1px solid #27272a',
    borderRadius: '6px',
    padding: '6px 12px',
    marginLeft: '12px',
    color: '#38bdf8',
  },
  frameLabel: {
    fontSize: '11px',
    color: '#71717a',
    marginLeft: '8px',
    fontWeight: 400,
  },
  viewport: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    backgroundColor: '#000000',
  },
  playerWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  player: {
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: '16/9',
    borderRadius: '8px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
    border: '1px solid #27272a',
  },
  sidebar: {
    width: '280px',
    borderLeft: '1px solid #27272a',
    backgroundColor: '#18181b',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sidebarTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    borderBottom: '1px solid #27272a',
    paddingBottom: '8px',
  },
  infoLabel: {
    color: '#a1a1aa',
  },
  infoValue: {
    fontWeight: 600,
    color: '#f4f4f5',
  },
  timelineContainer: {
    height: '220px',
    borderTop: '1px solid #27272a',
    backgroundColor: '#18181b',
    display: 'flex',
    position: 'relative',
  },
  trackLabels: {
    width: '120px',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '20px',
  },
  trackLabel: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#a1a1aa',
  },
  timelineCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
    paddingTop: '20px',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#f43f5e',
    zIndex: 50,
    pointerEvents: 'none',
  },
  playheadHandle: {
    position: 'absolute',
    top: 0,
    left: '-6px',
    width: '14px',
    height: '14px',
    backgroundColor: '#f43f5e',
    borderRadius: '2px',
    transform: 'rotate(45deg)',
  },
  trackRow: {
    height: '48px',
    position: 'relative',
    borderBottom: '1px solid #27272a',
  },
  trackClip: {
    position: 'absolute',
    top: '4px',
    bottom: '4px',
    borderRadius: '4px',
    border: '1px solid',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  clipText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
