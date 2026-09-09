import ReactEChartsCore from "echarts-for-react/lib/core";
import { ChinaData } from "china-map-geojson";

import { echarts } from "./chartRegistry";
import type { MapLocation } from "../types";

echarts.registerMap("china", ChinaData as unknown as Parameters<typeof echarts.registerMap>[1]);

export default function MapView({
  locations,
  selectedLocationName,
  onSelect,
  variant = "default",
}: {
  locations: MapLocation[];
  selectedLocationName?: string;
  onSelect: (location: MapLocation) => void;
  variant?: "default" | "screen";
}) {
  const isScreen = variant === "screen";
  const selectedLocation = locations.find((location) => location.name === selectedLocationName);
  const eventCount = locations.reduce((total, location) => total + location.event_count, 0);
  const provinceData = buildProvinceData(locations);
  // “全国”类地点没有具体坐标含义，画成居中大点会盖住其他标记，改为浮动徽章展示
  const nationwideLocations = locations.filter((location) => location.province === "全国");
  const regionalLocations = locations.filter((location) => location.province !== "全国");
  const pointData = regionalLocations.map((location) => ({
    name: location.name,
    province: location.province,
    value: [location.longitude, location.latitude, location.event_count],
    dates: formatRange(location),
  }));

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#141d21",
      borderColor: "#2a3a40",
      borderWidth: 1,
      textStyle: { color: "#f0eadb", fontSize: 12 },
      formatter: (params: {
        seriesType: string;
        name: string;
        value?: number | [number, number, number];
        data?: { province?: string; dates?: string };
      }) => {
        if (params.seriesType === "scatter" && Array.isArray(params.value)) {
          return `${params.name}<br/>省份：${params.data?.province}<br/>事件：${params.value[2]}<br/>时间：${params.data?.dates}`;
        }
        const count = typeof params.value === "number" && !Number.isNaN(params.value) ? params.value : 0;
        return `${params.name}<br/>事件：${count}`;
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...provinceData.map((item) => item.value), 1),
      left: 18,
      bottom: 18,
      text: ["事件多", "事件少"],
      textStyle: { color: "#667068", fontSize: 11 },
      calculable: false,
      inRange: {
        color: isScreen ? ["#2a1612", "#8f332b", "#d34a38"] : ["#e8e3d7", "#8aab9e", "#2d6259"],
      },
    },
    geo: {
      map: "china",
      roam: true,
      zoom: 1.15,
      top: 18,
      bottom: 12,
      label: {
        show: true,
        color: isScreen ? "#9f7f70" : "#8e9890",
        fontSize: 9,
      },
      itemStyle: {
        areaColor: isScreen ? "#211412" : "#e2ddd4",
        borderColor: isScreen ? "#4d221d" : "#f3efe6",
        borderWidth: 0.8,
      },
      emphasis: {
        label: { color: "#1e2620" },
        itemStyle: { areaColor: isScreen ? "#7a2b25" : "#c8d5c2" },
      },
    },
    series: [
      {
        name: "省份事件",
        type: "map",
        map: "china",
        geoIndex: 0,
        data: provinceData,
      },
      {
        name: "地点事件",
        type: "scatter",
        coordinateSystem: "geo",
        // 事件数开方缩放并封顶，避免高频地点的大圆点盖住邻近标记
        symbolSize: (value: [number, number, number]) =>
          12 + Math.min(Math.sqrt(value[2]) * 5, 26),
        data: pointData,
        label: {
          show: true,
          formatter: "{b}",
          position: "right",
          color: "#3d4940",
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: {
          color: (params: { name: string }) =>
            params.name === selectedLocationName ? (isScreen ? "#d34a38" : "#c4a35a") : "#6b3a2e",
          borderColor: "#f3efe6",
          borderWidth: 2,
        },
      },
    ],
  };

  return (
    <div className="panel chart-module map-panel map-module">
      <div className="module-header">
        <div>
          <div className="eyebrow">空间索引</div>
          <h2>中国地点分布</h2>
        </div>
        <div className="module-kpis">
          <span>{locations.length} 个地点</span>
          <span>{eventCount} 个事件</span>
        </div>
      </div>
      <div className="map-chart-wrap">
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          className="responsive-chart map-chart"
          style={{ height: "100%" }}
          onEvents={{
            click: (params: { seriesType?: string; name: string }) => {
              if (params.seriesType !== "scatter") return;
              const location = locations.find((item) => item.name === params.name);
              if (location) onSelect(location);
            },
          }}
        />
        {nationwideLocations.length > 0 && (
          <div className="map-nationwide">
            {nationwideLocations.map((location) => (
              <button
                type="button"
                key={location.id}
                className={`map-nationwide-chip${location.name === selectedLocationName ? " active" : ""}`}
                title={`时间：${formatRange(location)}`}
                onClick={() => onSelect(location)}
              >
                {location.name} · 全国范围 · {location.event_count} 个事件
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="module-footer">
        当前选中：<strong>{selectedLocation?.name ?? "未选择地点"}</strong>
        {selectedLocation ? <span> · {selectedLocation.province} · {selectedLocation.event_count} 个事件</span> : null}
      </div>
    </div>
  );
}

function buildProvinceData(locations: MapLocation[]) {
  const totals = new Map<string, number>();
  for (const location of locations) {
    if (location.province === "全国") {
      continue;
    }
    totals.set(location.province, (totals.get(location.province) ?? 0) + location.event_count);
  }
  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

function formatRange(location: MapLocation) {
  if (location.start_date && location.end_date && location.start_date !== location.end_date) {
    return `${location.start_date} 至 ${location.end_date}`;
  }
  return location.start_date ?? location.end_date ?? "时间未标注";
}
