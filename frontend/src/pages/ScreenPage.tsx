import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import GraphView from "../components/GraphView";
import LifeTrajectoryBoard from "../components/LifeTrajectoryBoard";
import MapView from "../components/MapView";
import TimelineChart from "../components/TimelineChart";
import type { Event, GraphNode, ScreenOverview } from "../types";

const metricItems = [
  ["articles", "篇目"],
  ["events", "事件"],
  ["locations", "地点"],
  ["ideas", "思想"],
  ["entities", "实体"],
  ["relations", "关系"],
] as const;

export default function ScreenPage() {
  const [overview, setOverview] = useState<ScreenOverview | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .screenOverview()
      .then((data) => {
        setOverview(data);
        const first = data.key_events[0];
        setSelectedEventId(first?.id);
        setSelectedNodeId(first ? `event:${first.id}` : data.graph.nodes[0]?.id);
        setError("");
      })
      .catch(() => setError("大屏数据加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!overview?.key_events.length) return;
    const timer = window.setInterval(() => {
      setSelectedEventId((current) => {
        const currentIndex = overview.key_events.findIndex((event) => event.id === current);
        const next = overview.key_events[(currentIndex + 1) % overview.key_events.length];
        setSelectedNodeId(`event:${next.id}`);
        return next.id;
      });
    }, 5200);

    return () => window.clearInterval(timer);
  }, [overview]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const selectedEvent = useMemo(
    () => overview?.key_events.find((event) => event.id === selectedEventId) ?? overview?.key_events[0],
    [overview, selectedEventId],
  );

  const selectedLocationName = selectedEvent?.location ?? overview?.map_locations[0]?.name;

  function handleEventSelect(event: Event) {
    setSelectedEventId(event.id);
    setSelectedNodeId(`event:${event.id}`);
  }

  function handleNodeSelect(node: GraphNode) {
    setSelectedNodeId(node.id);
    if (node.type === "event") {
      setSelectedEventId(node.raw_id);
    }
  }

  async function handleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  if (loading) {
    return <div className="screen-page screen-state">正在装载知识大屏...</div>;
  }

  if (error || !overview) {
    return <div className="screen-page screen-state">{error || "暂无大屏数据"}</div>;
  }

  return (
    <main className="screen-page">
      <header className="screen-header">
        <div>
          <div className="screen-kicker">MAOXUAN KNOWLEDGE OBSERVATORY</div>
          <h1>《毛泽东选集》知识可视化大屏</h1>
        </div>
        <div className="screen-header-side">
          <div className="screen-timeblock">
            <span>自动巡览</span>
            <strong>{selectedEvent?.date_text ?? selectedEvent?.start_date ?? "时间未标注"}</strong>
          </div>
          <div className="screen-controls">
            <Link to="/">返回工作台</Link>
            <button type="button" onClick={handleFullscreen}>
              {isFullscreen ? "退出全屏" : "全屏展示"}
            </button>
          </div>
        </div>
      </header>

      <section className="screen-metrics" aria-label="知识库统计">
        {metricItems.map(([key, label]) => (
          <div className="screen-metric" key={key}>
            <strong>{overview.stats[key]}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="screen-grid">
        <div className="screen-panel screen-panel-life">
          <LifeTrajectoryBoard />
        </div>

        <div className="screen-panel screen-panel-focus">
          <div className="screen-section-head">
            <span>当前焦点</span>
            <strong>重要度 {selectedEvent?.importance ?? "-"}</strong>
          </div>
          <h2>{selectedEvent?.title ?? "未选择事件"}</h2>
          <div className="screen-event-meta">
            {selectedEvent?.location ?? "地点未标注"} · {selectedEvent?.date_text ?? selectedEvent?.start_date ?? "时间未标注"}
          </div>
          <p>{selectedEvent?.description ?? "暂无事件说明"}</p>
          {selectedEvent?.quote && <blockquote>{selectedEvent.quote}</blockquote>}
          <div className="screen-event-rail">
            {overview.key_events.map((event, index) => (
              <button
                key={event.id}
                type="button"
                className={event.id === selectedEvent?.id ? "active" : ""}
                onClick={() => handleEventSelect(event)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {event.title}
              </button>
            ))}
          </div>
        </div>

        <div className="screen-panel screen-panel-map">
          <MapView
            locations={overview.map_locations}
            selectedLocationName={selectedLocationName}
            onSelect={() => undefined}
            variant="screen"
          />
        </div>

        <div className="screen-panel screen-panel-timeline">
          <TimelineChart
            events={overview.key_events}
            selectedEventId={selectedEvent?.id}
            onSelect={handleEventSelect}
            variant="screen"
          />
        </div>

        <div className="screen-panel screen-panel-graph">
          <div className="screen-section-head">
            <span>关系网络</span>
            <strong>{overview.graph.nodes.length} 节点 / {overview.graph.edges.length} 关系</strong>
          </div>
          <GraphView
            graph={overview.graph}
            selectedNodeId={selectedNodeId}
            onSelect={handleNodeSelect}
            className="screen-graph-view"
            height="100%"
            variant="screen"
          />
        </div>
      </section>
    </main>
  );
}
