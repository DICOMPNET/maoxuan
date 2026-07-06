import { useEffect, useMemo, useRef, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";

import { echarts } from "../components/chartRegistry";
import { buildTrajectoryOption, phaseColors } from "../components/trajectoryOption";
import {
  lifePhaseLabels,
  lifeSources,
  lifeStops,
  type LifePhase,
  type LifeStop,
} from "../data/lifeTrajectory";

const phaseOrder = Object.keys(lifePhaseLabels) as LifePhase[];

const AUTO_PLAY_MS = 2600;
const SWEEP_MS = 240;
const CHINA_CENTER: [number, number] = [104.5, 35.8];
const CAM_TWEEN_MS = 900;

export default function LifeTrajectoryPage() {
  const [activePhase, setActivePhase] = useState<LifePhase | "all">("all");
  const [selectedId, setSelectedId] = useState(lifeStops[0]?.id ?? "");
  const [revealedCount, setRevealedCount] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sweepTarget, setSweepTarget] = useState<number | null>(null);
  const [geoZoom, setGeoZoom] = useState(1);
  const [followCam, setFollowCam] = useState(true);
  const chartRef = useRef<ReactEChartsCore>(null);
  const tweenRef = useRef<number | null>(null);

  function cancelCamTween() {
    if (tweenRef.current !== null) window.cancelAnimationFrame(tweenRef.current);
    tweenRef.current = null;
  }

  // 平滑推拉镜头：ECharts 的 geo center/zoom 变更本身不带过渡，用 rAF 补间
  function tweenCamera(targetCenter: [number, number], targetZoom: number) {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    cancelCamTween();
    const currentOption = instance.getOption() as
      | { geo?: Array<{ zoom?: number; center?: [number, number] }> }
      | undefined;
    // 实例可能已创建但尚未 setOption（首帧），此时无从取当前视角，跳过本次补间
    if (!currentOption?.geo?.length) return;
    const geoOption = currentOption.geo[0];
    const fromZoom = geoOption?.zoom ?? 1;
    const fromCenter = geoOption?.center ?? CHINA_CENTER;
    const start = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min((now - start) / CAM_TWEEN_MS, 1);
      const k = ease(t);
      instance.setOption(
        {
          geo: {
            center: [
              fromCenter[0] + (targetCenter[0] - fromCenter[0]) * k,
              fromCenter[1] + (targetCenter[1] - fromCenter[1]) * k,
            ],
            zoom: fromZoom + (targetZoom - fromZoom) * k,
          },
        },
        { lazyUpdate: true },
      );
      tweenRef.current = t < 1 ? window.requestAnimationFrame(step) : null;
    };
    tweenRef.current = window.requestAnimationFrame(step);
  }

  useEffect(() => cancelCamTween, []);

  const visibleStops = useMemo(
    () => lifeStops.filter((stop) => activePhase === "all" || stop.phase === activePhase),
    [activePhase],
  );

  const selected =
    visibleStops.find((stop) => stop.id === selectedId) ?? visibleStops[0] ?? lifeStops[0];
  const revealedStops = useMemo(
    () => visibleStops.slice(0, Math.max(1, Math.min(revealedCount, visibleStops.length))),
    [revealedCount, visibleStops],
  );
  const selectedIndex = Math.max(
    visibleStops.findIndex((stop) => stop.id === selected?.id),
    0,
  );

  const option = useMemo(
    () => buildTrajectoryOption(revealedStops, selected?.id, geoZoom),
    [revealedStops, selected?.id, geoZoom],
  );

  useEffect(() => {
    setRevealedCount(1);
    setSweepTarget(null);
    setIsPlaying(true);
    setFollowCam(true);
    const first = visibleStops[0];
    if (first) setSelectedId(first.id);
  }, [activePhase, visibleStops]);

  // 自动巡览：按节奏逐站推进
  useEffect(() => {
    if (!isPlaying || sweepTarget !== null || visibleStops.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setRevealedCount((current) => {
        const next = Math.min(current + 1, visibleStops.length);
        const nextStop = visibleStops[next - 1];
        if (nextStop) setSelectedId(nextStop.id);
        if (next >= visibleStops.length) setIsPlaying(false);
        return next;
      });
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPlaying, sweepTarget, visibleStops]);

  // 点击跳转：快速扫掠到目标站点（正反向均可）
  useEffect(() => {
    if (sweepTarget === null) return undefined;
    const timer = window.setInterval(() => {
      setRevealedCount((current) => {
        if (current === sweepTarget) {
          window.clearInterval(timer);
          setSweepTarget(null);
          return current;
        }
        const next = current < sweepTarget ? current + 1 : current - 1;
        const nextStop = visibleStops[next - 1];
        if (nextStop) setSelectedId(nextStop.id);
        if (next === sweepTarget) {
          window.clearInterval(timer);
          setSweepTarget(null);
        }
        return next;
      });
    }, SWEEP_MS);

    return () => window.clearInterval(timer);
  }, [sweepTarget, visibleStops]);

  // 跟随镜头：推进到新站点后，把镜头对准当前一程；短途自动放大，长途拉远
  useEffect(() => {
    if (!followCam || sweepTarget !== null) return;
    const index = revealedStops.length - 1;
    const current = revealedStops[index];
    if (!current) return;
    if (index === 0) {
      tweenCamera(CHINA_CENTER, 1);
      setGeoZoom(1);
      return;
    }
    const previous = revealedStops[index - 1];
    const [x1, y1] = previous.coordinates;
    const [x2, y2] = current.coordinates;
    const center: [number, number] = [(x1 + x2) / 2, (y1 + y2) / 2];
    const span = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2) * 1.5, 0.6);
    const zoom = Math.min(Math.max(58 / (span * 3), 1.15), 5.5);
    tweenCamera(center, zoom);
    setGeoZoom(zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followCam, sweepTarget, revealedStops]);

  // 方向键逐站切换
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const nextIndex = event.key === "ArrowRight" ? selectedIndex + 1 : selectedIndex - 1;
      const stop = visibleStops[nextIndex];
      if (!stop) return;
      event.preventDefault();
      setIsPlaying(false);
      setSelectedId(stop.id);
      setSweepTarget(nextIndex + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, visibleStops]);

  function handlePhaseChange(phase: LifePhase | "all") {
    setActivePhase(phase);
    setRevealedCount(1);
    setSweepTarget(null);
    setIsPlaying(true);
    const first = lifeStops.find((stop) => phase === "all" || stop.phase === phase);
    if (first) setSelectedId(first.id);
  }

  function handleSelectStop(stop: LifeStop) {
    const index = visibleStops.findIndex((item) => item.id === stop.id);
    if (index < 0) return;
    setIsPlaying(false);
    setSelectedId(stop.id);
    const targetCount = index + 1;
    setSweepTarget(targetCount === revealedCount ? null : targetCount);
  }

  function handleTogglePlay() {
    setSweepTarget(null);
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (revealedCount >= visibleStops.length) {
      setRevealedCount(1);
      const first = visibleStops[0];
      if (first) setSelectedId(first.id);
    }
    setIsPlaying(true);
  }

  function handleReplay() {
    setSweepTarget(null);
    setRevealedCount(1);
    setFollowCam(true);
    const first = visibleStops[0];
    if (first) setSelectedId(first.id);
    setIsPlaying(true);
  }

  // 手动缩放/平移：镜头控制权交还用户，并同步 zoom 让节点环、线宽、符号自适应
  function handleGeoRoam() {
    cancelCamTween();
    setFollowCam(false);
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    const currentOption = instance.getOption() as { geo?: Array<{ zoom?: number }> } | undefined;
    const zoom = currentOption?.geo?.[0]?.zoom ?? 1;
    setGeoZoom((previous) => (Math.abs(zoom - previous) / previous > 0.08 ? zoom : previous));
  }

  function handleToggleFollow() {
    if (followCam) {
      cancelCamTween();
      setFollowCam(false);
      return;
    }
    setFollowCam(true);
  }

  return (
    <div className="page-inner life-page">
      <section className="life-hero">
        <div className="life-hero-copy">
          <div className="eyebrow">人物轨迹</div>
          <h1>毛泽东一生轨迹图</h1>
          <p>以权威年表为骨架，按地点、年代与阶段串联主要人生节点。</p>
          <div className="life-hero-meta">
            <span>1893</span>
            <i />
            <span>1976</span>
            <strong>{lifeStops.length} 个节点</strong>
          </div>
        </div>
        <div className="life-hero-aside" aria-label="当前筛选">
          <span>当前阶段</span>
          <strong>{activePhase === "all" ? "全部阶段" : lifePhaseLabels[activePhase]}</strong>
          <em>{visibleStops.length} 个节点</em>
        </div>
      </section>

      <section className="life-controls" aria-label="人生阶段筛选">
        <button
          type="button"
          className={activePhase === "all" ? "active" : ""}
          onClick={() => handlePhaseChange("all")}
        >
          全部
        </button>
        {phaseOrder.map((phase) => (
          <button
            type="button"
            key={phase}
            className={activePhase === phase ? "active" : ""}
            onClick={() => handlePhaseChange(phase)}
          >
            {lifePhaseLabels[phase]}
          </button>
        ))}
      </section>

      <section className="life-layout">
        <div className="panel chart-module life-map-module">
          <div className="module-header">
            <div>
              <div className="eyebrow">空间轨迹</div>
              <h2>主要活动地点</h2>
            </div>
            <div className="life-play-controls">
              <button type="button" className="primary" onClick={handleTogglePlay}>
                {isPlaying ? "❚❚ 暂停" : "▶ 播放"}
              </button>
              <button type="button" onClick={handleReplay}>
                ↺ 重播
              </button>
              <button
                type="button"
                className={followCam ? "follow-on" : ""}
                onClick={handleToggleFollow}
                title="巡览时镜头自动对准当前一程；手动拖拽或缩放地图会暂时关闭"
              >
                {followCam ? "◉ 跟随" : "○ 跟随"}
              </button>
              <span className="life-play-progress">
                {String(selectedIndex + 1).padStart(2, "0")} / {String(visibleStops.length).padStart(2, "0")}
              </span>
            </div>
          </div>
          <ReactEChartsCore
            ref={chartRef}
            echarts={echarts}
            option={option}
            className="responsive-chart"
            style={{ height: "100%" }}
            onEvents={{
              georoam: handleGeoRoam,
              click: (params: { seriesType?: string; data?: { stopId?: string } }) => {
                if (
                  (params.seriesType !== "scatter" && params.seriesType !== "effectScatter") ||
                  !params.data?.stopId
                )
                  return;
                const stop = visibleStops.find((item) => item.id === params.data?.stopId);
                if (stop) handleSelectStop(stop);
              },
            }}
          />
          <div className="module-footer life-map-footer">
            <div className="life-progress-track" aria-hidden="true">
              <i style={{ width: `${(revealedStops.length / Math.max(visibleStops.length, 1)) * 100}%` }} />
            </div>
            <div>
              当前选中：<strong>{selected?.title}</strong>
              {selected ? <span> · {selected.location} · {selected.year}</span> : null}
            </div>
          </div>
        </div>

        <aside className="panel life-detail">
          <div className="life-detail-content" key={selected?.id}>
            <div className="life-detail-topline">
              <span>{String(selectedIndex + 1).padStart(2, "0")}</span>
              <em>{selected ? lifePhaseLabels[selected.phase] : ""}</em>
            </div>
            <div className="eyebrow">{selected?.year}</div>
            <h2>{selected?.title}</h2>
            <div className="meta">
              {selected?.date} · {selected?.location} · {selected?.province}
            </div>
            <p>{selected?.summary}</p>
            <div className="life-source-tags">
              {selected?.sourceIds.map((sourceId) => {
                const source = lifeSources.find((item) => item.id === sourceId);
                return source ? (
                  <a href={source.url} target="_blank" rel="noreferrer" key={sourceId}>
                    来源 {sourceId.replace("s", "")}
                  </a>
                ) : null;
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="life-timeline-panel panel">
        <div className="module-header inline-header">
          <div>
            <div className="eyebrow">编年节点</div>
            <h2>阶段轨迹</h2>
          </div>
          <div className="module-kpis">
            <span>← → 键可逐站切换</span>
          </div>
        </div>
        <div className="life-rail">
          {visibleStops.map((stop, index) => (
            <button
              type="button"
              key={stop.id}
              className={[
                "life-stop",
                stop.id === selected?.id ? "active" : "",
                index < revealedCount ? "revealed" : "",
                sweepTarget !== null && index + 1 === sweepTarget ? "target" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleSelectStop(stop)}
            >
              <span className="life-stop-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="life-stop-dot" style={{ backgroundColor: phaseColors[stop.phase] }} />
              <span className="life-stop-body">
                <strong>{stop.year} · {stop.title}</strong>
                <em>{lifePhaseLabels[stop.phase]} / {stop.location}</em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel life-sources-panel">
        <div>
          <div className="eyebrow">资料来源</div>
          <h2>权威资料入口</h2>
          <p>
            页面节点综合共产党员网、人民网党史频道的分段生平年表，并用中央党史和文献研究院、
            中央文献出版社关于《毛泽东年谱》的说明作为年谱依据。
          </p>
        </div>
        <div className="life-source-list">
          {lifeSources.map((source, index) => (
            <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{source.title}</strong>
              <em>{source.publisher}</em>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

