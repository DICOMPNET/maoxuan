import { lazy, Suspense, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import GuidePage from "./pages/GuidePage";

const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const DisclaimerPage = lazy(() => import("./pages/DisclaimerPage"));
const GraphPage = lazy(() => import("./pages/GraphPage"));
const IssuePage = lazy(() => import("./pages/IssuePage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ScreenPage = lazy(() => import("./pages/ScreenPage"));
const TimelinePage = lazy(() => import("./pages/TimelinePage"));

function ScreenRoute() {
  return (
    <Suspense fallback={<div className="screen-page screen-state">正在装载知识大屏...</div>}>
      <ScreenPage />
    </Suspense>
  );
}

function WorkspaceRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="state-panel route-loading">正在加载档案模块...</div>}>
      {children}
    </Suspense>
  );
}

const navItems = [
  { to: "/", label: "导读", code: "导" },
  { to: "/timeline", label: "时间线", code: "时" },
  { to: "/map", label: "地图", code: "图" },
  { to: "/graph", label: "知识图谱", code: "谱" },
  { to: "/articles", label: "文章", code: "文" },
  { to: "/search", label: "搜索", code: "搜" },
  { to: "/issue", label: "问题反馈", code: "馈" },
];

export default function App() {
  const location = useLocation();

  if (location.pathname.startsWith("/screen")) {
    return (
      <Routes>
        <Route path="/screen" element={<ScreenRoute />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand-block">
          <div className="brand-mark">毛选</div>
          <div>
            <div className="brand">毛选知识库</div>
            <div className="brand-subtitle">知识时间线</div>
          </div>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink to={item.to} key={item.to} end={item.to === "/"}>
              <span className="nav-code">{item.code}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <div className="side-status">
            <div className="status-dot" />
            <span>本地档案已连接</span>
          </div>
          <NavLink to="/disclaimer">免责声明</NavLink>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-topbar">
          <div>
            <div className="eyebrow">档案工作台</div>
            <div className="topbar-title">《毛泽东选集》知识可视化系统</div>
          </div>
          <div className="topbar-actions">
            <NavLink className="screen-shortcut" to="/screen">
              展示大屏
            </NavLink>
            <NavLink className="issue-shortcut" to="/issue">
              提交问题
            </NavLink>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<GuidePage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/timeline" element={<WorkspaceRoute><TimelinePage /></WorkspaceRoute>} />
            <Route path="/map" element={<WorkspaceRoute><MapPage /></WorkspaceRoute>} />
            <Route path="/graph" element={<WorkspaceRoute><GraphPage /></WorkspaceRoute>} />
            <Route path="/articles" element={<WorkspaceRoute><ArticlePage /></WorkspaceRoute>} />
            <Route path="/articles/:id" element={<WorkspaceRoute><ArticlePage /></WorkspaceRoute>} />
            <Route path="/search" element={<WorkspaceRoute><SearchPage /></WorkspaceRoute>} />
            <Route path="/screen" element={<ScreenRoute />} />
            <Route path="/issue" element={<WorkspaceRoute><IssuePage /></WorkspaceRoute>} />
            <Route path="/disclaimer" element={<WorkspaceRoute><DisclaimerPage /></WorkspaceRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
