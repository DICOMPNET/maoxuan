import { ChinaData } from "china-map-geojson";

import { echarts } from "./chartRegistry";
import { lifePhaseLabels, lifeStops, type LifePhase, type LifeStop } from "../data/lifeTrajectory";

echarts.registerMap("china", ChinaData as unknown as Parameters<typeof echarts.registerMap>[1]);

// 浅色界面（编年节点圆点）用色
export const phaseColors: Record<LifePhase, string> = {
  early: "#7b6650",
  revolution: "#9d4a35",
  base: "#6b3a2e",
  yanan: "#b18136",
  founding: "#2d6259",
  construction: "#426a8a",
  late: "#5e5965",
};

// 深色地图上的节点用色（同一相位的亮色变体）
const phaseColorsDark: Record<LifePhase, string> = {
  early: "#d8b98a",
  revolution: "#e8896b",
  base: "#cf7a55",
  yanan: "#e6bc6e",
  founding: "#7cc4b0",
  construction: "#89b3dd",
  late: "#b3a6c4",
};

// 同一坐标的节点分组；首个节点标地名，其余标年份
const stopGroups = (() => {
  const groups = new Map<string, LifeStop[]>();
  for (const stop of lifeStops) {
    const key = stop.coordinates.join(",");
    const list = groups.get(key);
    if (list) list.push(stop);
    else groups.set(key, [stop]);
  }
  const firstOfPlace = new Set<string>();
  groups.forEach((group) => firstOfPlace.add(group[0].id));
  return { groups, firstOfPlace };
})();

// 同地多站沿小圆环错开；环半径随缩放收敛，放大后回归真实位置
function computeDisplayCoords(zoom: number) {
  const coords = new Map<string, [number, number]>();
  stopGroups.groups.forEach((group) => {
    if (group.length === 1) {
      coords.set(group[0].id, group[0].coordinates);
      return;
    }
    const radius = Math.min(0.42 + group.length * 0.1, 1.05) / Math.max(1, zoom);
    group.forEach((stop, index) => {
      const angle = (Math.PI * 2 * index) / group.length - Math.PI / 2;
      coords.set(stop.id, [
        stop.coordinates[0] + radius * Math.cos(angle),
        stop.coordinates[1] + radius * Math.sin(angle),
      ]);
    });
  });
  return coords;
}

export function buildTrajectoryOption(
  stops: LifeStop[],
  selectedId: string | undefined,
  zoom: number,
  {
    roam = true,
    layoutCenter = ["52%", "54%"],
    layoutSize = "104%",
  }: { roam?: boolean; layoutCenter?: [string, string]; layoutSize?: string } = {},
) {
  const zoomScale = Math.max(1, Math.min(zoom, 6));
  const widthScale = Math.min(1 + (zoomScale - 1) * 0.12, 1.7);
  const symbolScale = Math.min(1 + (zoomScale - 1) * 0.1, 1.6);
  const coords = computeDisplayCoords(zoomScale);
  const coordOf = (stop: LifeStop) => coords.get(stop.id) ?? stop.coordinates;

  const scatterData = stops
    .filter((stop) => stop.id !== selectedId)
    .map((stop) => ({
      stopId: stop.id,
      name: `${stop.year} ${stop.location} ${stop.id}`,
      value: coordOf(stop),
      year: stop.year,
      location: stop.location,
      phase: lifePhaseLabels[stop.phase],
      title: stop.title,
      summary: stop.summary,
      itemStyle: {
        color: phaseColorsDark[stop.phase],
        borderColor: "rgba(13,21,25,0.85)",
        borderWidth: 1.2,
        shadowBlur: 6,
        shadowColor: "rgba(0,0,0,0.4)",
      },
      label: {
        show: true,
        // 同地多站只在首站标地名，其余标年份，避免同名标签堆叠
        formatter: stopGroups.firstOfPlace.has(stop.id) ? stop.location : stop.year,
      },
    }));

  const selectedStop = stops.find((stop) => stop.id === selectedId);
  const selectedData = selectedStop
    ? [
        {
          // 固定 name 让高亮点在站点间平滑滑动
          name: "current",
          stopId: selectedStop.id,
          value: coordOf(selectedStop),
          year: selectedStop.year,
          location: selectedStop.location,
          phase: lifePhaseLabels[selectedStop.phase],
          title: selectedStop.title,
          summary: selectedStop.summary,
        },
      ]
    : [];

  // 线段按数据索引追加、内容不复用，避免 merge 更新时旧线段 morph 出残影
  const segments = stops.slice(1).map((stop, index) => {
    const previous = stops[index];
    const isActive = index === stops.length - 2;
    return {
      coords: [coordOf(previous), coordOf(stop)],
      fromName: previous.location,
      toName: stop.location,
      lineStyle: isActive
        ? {
            color: "#f2cf7e",
            width: 3.2 * widthScale,
            opacity: 0.95,
            shadowBlur: 10,
            shadowColor: "rgba(242,207,126,0.55)",
          }
        : {
            color: phaseColorsDark[stop.phase],
            width: 1.5 * widthScale,
            opacity: 0.55,
            shadowBlur: 0,
          },
    };
  });
  const activeSegment = segments.slice(-1).map((segment) => ({ ...segment, lineStyle: undefined }));

  const visitedProvinces = Array.from(new Set(stops.map((stop) => stop.province)))
    .filter((province) => province !== "全国")
    .map((name) => ({
      name,
      value: 1,
      itemStyle: { areaColor: "#2f4a55" },
    }));

  return {
    animation: true,
    animationDuration: 700,
    // 位置更新必须即时生效：镜头补间逐帧改 geo 视角时，地图区域是瞬时变换的，
    // 若散点/线带更新动画会滞后地图产生漂移割裂
    animationDurationUpdate: 0,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "#141d21",
      borderColor: "#3a4b52",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: "#f0eadb", fontSize: 12, lineHeight: 18 },
      formatter: (params: {
        seriesType: string;
        data?: { title?: string; phase?: string; summary?: string; year?: string; location?: string };
      }) => {
        if (!params.data?.title) return "";
        const { title, year, location, phase, summary } = params.data;
        return `<strong>${title}</strong><br/>${year} · ${location} · ${phase}<br/><span style="color:#c9d0c8">${summary}</span>`;
      },
    },
    geo: {
      map: "china",
      roam,
      scaleLimit: { min: 0.9, max: 6 },
      layoutCenter,
      layoutSize,
      label: { show: true, color: "rgba(226,222,206,0.34)", fontSize: 9 },
      itemStyle: {
        areaColor: "#243740",
        borderColor: "rgba(240,234,219,0.18)",
        borderWidth: 0.7,
      },
      emphasis: {
        label: { color: "#f0eadb" },
        itemStyle: { areaColor: "#3a5a66" },
      },
    },
    series: [
      {
        name: "活动省份",
        type: "map",
        map: "china",
        geoIndex: 0,
        z: 1,
        data: visitedProvinces,
        selectedMode: false,
        itemStyle: {
          areaColor: "#243740",
          borderColor: "rgba(240,234,219,0.18)",
          borderWidth: 0.7,
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: "人生轨迹",
        type: "lines",
        coordinateSystem: "geo",
        z: 2,
        polyline: false,
        data: segments,
        silent: true,
        animationDurationUpdate: 0,
        lineStyle: {
          curveness: 0.28,
        },
        effect: {
          show: segments.length > 1,
          period: 10,
          trailLength: 0,
          symbol: "circle",
          symbolSize: 3.5,
          color: "rgba(242,207,126,0.85)",
        },
      },
      {
        name: "当前一程",
        type: "lines",
        coordinateSystem: "geo",
        z: 3,
        polyline: false,
        data: activeSegment,
        silent: true,
        animationDurationUpdate: 0,
        lineStyle: {
          width: 0,
          opacity: 0,
          curveness: 0.28,
        },
        effect: {
          show: activeSegment.length > 0,
          period: 2.6,
          trailLength: 0.5,
          symbol: "arrow",
          symbolSize: 11,
          color: "#ffe3a1",
        },
      },
      {
        name: "关键节点",
        type: "scatter",
        coordinateSystem: "geo",
        z: 4,
        symbolSize: 8.5 * symbolScale,
        data: scatterData,
        labelLayout: { hideOverlap: true },
        label: {
          color: "rgba(238,232,214,0.92)",
          fontSize: 11,
          fontWeight: 700,
          position: "right",
          distance: 6,
          textBorderColor: "rgba(13,21,25,0.95)",
          textBorderWidth: 2.5,
        },
        emphasis: {
          scale: 1.6,
          label: { show: true, color: "#ffe9b0" },
        },
      },
      {
        name: "当前节点",
        type: "effectScatter",
        coordinateSystem: "geo",
        z: 5,
        symbolSize: 13 * symbolScale,
        rippleEffect: { period: 3.2, scale: 3.2, brushType: "stroke" },
        data: selectedData,
        itemStyle: {
          color: "#ffd977",
          borderColor: "#fff3d6",
          borderWidth: 2,
          shadowBlur: 14,
          shadowColor: "rgba(255,217,119,0.6)",
        },
        label: {
          show: true,
          formatter: (params: { data?: { year?: string; location?: string } }) =>
            `${params.data?.year ?? ""} ${params.data?.location ?? ""}`,
          color: "#ffe9b0",
          fontSize: 12,
          fontWeight: 800,
          position: "right",
          distance: 8,
          textBorderColor: "rgba(13,21,25,0.95)",
          textBorderWidth: 3,
        },
      },
    ],
  };
}
