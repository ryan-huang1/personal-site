"use client";

import Hls, { ErrorTypes } from "hls.js";
import Link from "next/link";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { VideoMetadata } from "@/lib/video-library";

type VideoPlayerProps = {
  hlsUrl: string;
  posterUrl: string;
  video: VideoMetadata;
};

const DEFAULT_FOV = 90;
const DRAG_SPEED = -0.5;
const PINCH_ZOOM_SPEED = 0.16;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function renditionUrl(masterUrl: string, rendition: string) {
  const baseUrl = masterUrl.slice(0, masterUrl.lastIndexOf("/"));
  return `${baseUrl}/${rendition}/index.m3u8`;
}

function pinchDistance(touches: TouchList) {
  const horizontal = touches[0].clientX - touches[1].clientX;
  const vertical = touches[0].clientY - touches[1].clientY;

  return Math.hypot(horizontal, vertical);
}

export function VideoPlayer({ hlsUrl, posterUrl, video }: VideoPlayerProps) {
  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [availableHeights, setAvailableHeights] = useState<number[]>([]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds);
  const [error, setError] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [showPoster, setShowPoster] = useState(true);

  const finishLoading = useCallback(() => {
    clearTimeout(loadingTimerRef.current);
    setIsLoading(false);
  }, []);

  const beginLoading = useCallback(() => {
    clearTimeout(loadingTimerRef.current);
    setIsLoading(true);
    loadingTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setError("Playback is taking longer than expected. Tap play to retry.");
    }, 12000);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);

    if (!isPlaying) return;

    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2600);
  }, [isPlaying]);

  useEffect(() => {
    const stage = stageRef.current;
    const visualViewport = window.visualViewport;

    if (!stage) return;

    const syncViewerHeight = () => {
      const height = visualViewport?.height ?? window.innerHeight;
      stage.style.setProperty("--viewer-height", `${Math.round(height)}px`);
    };

    syncViewerHeight();
    visualViewport?.addEventListener("resize", syncViewerHeight);
    visualViewport?.addEventListener("scroll", syncViewerHeight);
    window.addEventListener("orientationchange", syncViewerHeight);

    return () => {
      visualViewport?.removeEventListener("resize", syncViewerHeight);
      visualViewport?.removeEventListener("scroll", syncViewerHeight);
      window.removeEventListener("orientationchange", syncViewerHeight);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sourceVideo = videoRef.current;

    if (!viewport || !sourceVideo) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.01, 200);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    const texture = new THREE.VideoTexture(sourceVideo);
    const geometry = new THREE.SphereGeometry(100, 72, 48);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: sourceVideo.readyState >= 2 ? 1 : 0,
      transparent: true,
    });
    const panorama = new THREE.Mesh(geometry, material);
    const controls = new OrbitControls(camera, renderer.domElement);
    let lastPinchDistance = 0;
    let lastVideoTime = -1;

    texture.colorSpace = THREE.SRGBColorSpace;
    geometry.scale(-1, 1, 1);
    camera.position.set(0, 0, 0.1);
    scene.add(panorama);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "panorama-canvas";
    viewport.appendChild(renderer.domElement);

    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = DRAG_SPEED;

    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const zoom = (delta: number) => {
      camera.fov = clamp(camera.fov + delta, 25, 130);
      camera.updateProjectionMatrix();
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.deltaY * 0.035);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      lastPinchDistance = pinchDistance(event.touches);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;

      event.preventDefault();
      const nextDistance = pinchDistance(event.touches);
      zoom((lastPinchDistance - nextDistance) * PINCH_ZOOM_SPEED);
      lastPinchDistance = nextDistance;
    };

    const resizeObserver = new ResizeObserver(resize);
    const revealVideo = () => {
      material.opacity = 1;
      material.needsUpdate = true;
    };

    resizeObserver.observe(viewport);
    sourceVideo.addEventListener("loadeddata", revealVideo);
    renderer.domElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    renderer.domElement.addEventListener("touchstart", handleTouchStart);
    renderer.domElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    renderer.setAnimationLoop(() => {
      if (
        sourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        sourceVideo.currentTime !== lastVideoTime
      ) {
        texture.needsUpdate = true;
        lastVideoTime = sourceVideo.currentTime;
      }

      controls.update();
      renderer.render(scene, camera);
    });
    resize();

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("touchstart", handleTouchStart);
      renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      sourceVideo.removeEventListener("loadeddata", revealVideo);
      controls.dispose();
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;

    setError("");

    if (!Hls.isSupported()) {
      setAvailableHeights(video.renditions.map(({ height }) => height));
      sourceVideo.src = hlsUrl;
      return;
    }

    const hls = new Hls({
      backBufferLength: 30,
      maxBufferLength: 30,
      startLevel: -1,
    });

    hlsRef.current = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(sourceVideo);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setError("");
      setAvailableHeights(hls.levels.map(({ height }) => height));
      if (!window.matchMedia("(max-width: 48rem)").matches) return;

      const mobileCap = hls.levels.reduce(
        (cap, { height }, index) => (height <= 1920 ? index : cap),
        -1,
      );
      if (mobileCap >= 0) hls.autoLevelCapping = mobileCap;
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;

      finishLoading();

      if (data.type === ErrorTypes.NETWORK_ERROR) {
        setError("The video could not load. Tap play to retry.");
        return;
      }

      if (data.type === ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
        setError("Recovering video playback…");
        return;
      }

      setError("This video is temporarily unavailable.");
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [finishLoading, hlsUrl, video.renditions]);

  useEffect(() => {
    return () => {
      clearTimeout(hideTimerRef.current);
      clearTimeout(loadingTimerRef.current);
      clearTimeout(retryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const closeQualityMenu = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (qualityRef.current?.contains(event.target)) return;
      setQualityOpen(false);
    };

    const closeQualityMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQualityOpen(false);
    };

    document.addEventListener("pointerdown", closeQualityMenu);
    document.addEventListener("keydown", closeQualityMenuWithKeyboard);

    return () => {
      document.removeEventListener("pointerdown", closeQualityMenu);
      document.removeEventListener("keydown", closeQualityMenuWithKeyboard);
    };
  }, []);

  const switchNativeSource = useCallback((nextUrl: string) => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;

    const previousTime = sourceVideo.currentTime;
    const shouldResume = !sourceVideo.paused;

    sourceVideo.src = nextUrl;
    sourceVideo.load();
    sourceVideo.addEventListener(
      "loadedmetadata",
      () => {
        sourceVideo.currentTime = previousTime;
        if (shouldResume) void sourceVideo.play();
      },
      { once: true },
    );
  }, []);

  const changeQuality = (quality: string) => {
    const hls = hlsRef.current;

    setQualityOpen(false);

    if (quality === "auto") {
      setSelectedQuality(quality);
      if (hls) hls.currentLevel = -1;
      if (!hls) switchNativeSource(hlsUrl);
      return;
    }

    const rendition = video.renditions.find(({ name }) => name === quality);
    if (!rendition) return;

    if (!hls) {
      setSelectedQuality(quality);
      switchNativeSource(renditionUrl(hlsUrl, quality));
      return;
    }

    const level = hls.levels.findIndex(
      ({ height }) => height === rendition.height,
    );
    if (level < 0) {
      setError("That quality is not available yet.");
      return;
    }

    setError("");
    setSelectedQuality(quality);
    hls.currentLevel = level;
  };

  const failPlayback = useCallback(
    (playError: DOMException) => {
      finishLoading();
      setError(
        playError.name === "NotAllowedError"
          ? "Your browser blocked playback. Tap play to start."
          : "The video could not load. Tap play to retry.",
      );
    },
    [finishLoading],
  );

  const startPlayback = () => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;

    setError("");
    beginLoading();
    hlsRef.current?.startLoad(-1);
    sourceVideo.play().catch((playError: DOMException) => {
      // AbortError means the play request was interrupted (e.g. hls.js was
      // still attaching the media source), so retry once instead of asking
      // the user to tap again for no reason.
      if (playError.name !== "AbortError") {
        failPlayback(playError);
        return;
      }

      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        videoRef.current?.play().catch(failPlayback);
      }, 400);
    });
  };

  const togglePlayback = () => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;
    if (!sourceVideo.paused) {
      sourceVideo.pause();
      return;
    }

    startPlayback();
  };

  const toggleMuted = () => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;
    sourceVideo.muted = !sourceVideo.muted;
    setIsMuted(sourceVideo.muted);
  };

  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    const sourceVideo = videoRef.current;

    if (!sourceVideo) return;
    sourceVideo.currentTime = Number(event.target.value);
  };

  const enterFullscreen = () => {
    if (stageRef.current?.requestFullscreen) {
      void stageRef.current.requestFullscreen();
    }
  };

  const toggleQualityMenu = () => {
    clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    setQualityOpen((open) => !open);
  };

  const qualityOptions = [
    "auto",
    ...video.renditions
      .filter(({ height }) => availableHeights.includes(height))
      .reverse()
      .map(({ name }) => name),
  ];

  return (
    <section
      className={`viewer ${controlsVisible ? "viewer--active" : ""}`}
      onPointerDown={revealControls}
      onPointerMove={revealControls}
      ref={stageRef}
    >
      <div
        className="viewer__viewport"
        ref={viewportRef}
        style={{
          backgroundImage: showPoster ? `url("${posterUrl}")` : "none",
        }}
      />
      <video
        className="viewer__source"
        crossOrigin="anonymous"
        muted={isMuted}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onPause={() => {
          clearTimeout(retryTimerRef.current);
          setIsPlaying(false);
          finishLoading();
        }}
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => {
          setHasStarted(true);
          setError("");
          setShowPoster(false);
          finishLoading();
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
          if (!event.currentTarget.paused) finishLoading();
        }}
        onWaiting={(event) => {
          if (!event.currentTarget.paused) beginLoading();
        }}
        playsInline
        ref={videoRef}
      />
      <header className="viewer__top">
        <Link className="viewer__back" href="/videos">
          <span aria-hidden="true">←</span> Gallery
        </Link>
        <span className="viewer__name">{video.title}</span>
      </header>
      <div aria-hidden="true" className="viewer__hint">
        Drag to look · Pinch to zoom
      </div>
      {(!hasStarted || isLoading) && (
        <button
          aria-label={isLoading ? "Loading video" : "Play video"}
          className="viewer__start"
          disabled={isLoading}
          onClick={startPlayback}
          type="button"
        >
          <span
            aria-hidden="true"
            className={
              isLoading ? "viewer__loading-spinner" : "viewer__play-icon"
            }
          />
        </button>
      )}
      {error && <p className="viewer__error">{error}</p>}
      <div className="viewer__controls">
        <button onClick={togglePlayback} type="button">
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="viewer__time">{formatTime(currentTime)}</span>
        <input
          aria-label="Video progress"
          max={duration}
          min="0"
          onChange={seek}
          step="0.1"
          type="range"
          value={currentTime}
        />
        <button onClick={toggleMuted} type="button">
          {isMuted ? "Sound on" : "Mute"}
        </button>
        <div
          className={`viewer__quality ${
            qualityOpen ? "viewer__quality--open" : ""
          }`}
          ref={qualityRef}
        >
          <button
            aria-controls="quality-menu"
            aria-expanded={qualityOpen}
            aria-haspopup="menu"
            className="viewer__quality-trigger"
            onClick={toggleQualityMenu}
            type="button"
          >
            {selectedQuality === "auto"
              ? "Auto"
              : selectedQuality.toUpperCase()}
            <span aria-hidden="true" className="viewer__quality-chevron" />
          </button>
          {qualityOpen && (
            <div
              aria-label="Video quality"
              className="viewer__quality-menu"
              id="quality-menu"
              role="menu"
            >
              {qualityOptions.map((quality) => (
                <button
                  aria-checked={selectedQuality === quality}
                  className="viewer__quality-option"
                  key={quality}
                  onClick={() => changeQuality(quality)}
                  role="menuitemradio"
                  type="button"
                >
                  {quality === "auto" ? "Auto" : quality.toUpperCase()}
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={enterFullscreen} type="button">
          Fullscreen
        </button>
      </div>
    </section>
  );
}
