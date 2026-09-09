import { useEffect, useMemo, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { Link } from "react-router-dom";

import { echarts } from "./chartRegistry";
import { buildTrajectoryOption } from "./trajectoryOption";
import { lifePhaseLabels, lifeStops } from "../data/lifeTrajectory";

const STEP_MS = 2600;
// 播完后停留几拍再从头巡览
const RESTART_PAUSE_STEPS = 2;

export default function LifeTrajectoryBoard() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) =>
        current >= lifeStops.length + RESTART_PAUSE_STEPS ? 1 : current + 1,
      );
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, []);

  const revealedCount = Math.min(step, lifeStops.length);
  const revealedStops = useMemo(
    () => lifeStops.slice(0, revealedCount),
    [revealedCount],
  );
  const current = revealedStops[revealedStops.length - 1];

  const option = useMemo(
    () =>
      buildTrajectoryOption(revealedStops, current?.id, 1, {
        roam: false,
        layoutCenter: ["50%", "56%"],
        layoutSize: "150%",
      }),
    [revealedStops, current?.id],
  );

  return (
    <div className="screen-life-board">
      <div className="screen-section-head">
        <span>生平轨迹 1893-1976</span>
        <strong>
          {String(revealedCount).padStart(2, "0")} / {String(lifeStops.length).padStart(2, "0")}
        </strong>
      </div>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        className="responsive-chart"
        style={{ height: "100%" }}
      />
      <div className="screen-life-status">
        <strong>
          {current?.year} · {current?.title}
        </strong>
        <span>
          {current ? `${lifePhaseLabels[current.phase]} · ${current.location}` : ""}
          <Link to="/life">查看完整轨迹</Link>
        </span>
      </div>
    </div>
  );
}
