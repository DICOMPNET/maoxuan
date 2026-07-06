import * as echarts from "echarts/core";
import { EffectScatterChart, GraphChart, LinesChart, MapChart, ScatterChart } from "echarts/charts";
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
  EffectScatterChart,
  GeoComponent,
  GraphChart,
  GridComponent,
  LabelLayout,
  LinesChart,
  LegendComponent,
  MapChart,
  ScatterChart,
  TooltipComponent,
  VisualMapComponent,
]);

export { echarts };
