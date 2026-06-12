import * as echarts from "echarts/core";
import { GraphChart, MapChart, ScatterChart } from "echarts/charts";
import {
  DataZoomComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  CanvasRenderer,
  DataZoomComponent,
  GeoComponent,
  GraphChart,
  GridComponent,
  LabelLayout,
  LegendComponent,
  MapChart,
  ScatterChart,
  TooltipComponent,
  VisualMapComponent,
]);

export { echarts };
