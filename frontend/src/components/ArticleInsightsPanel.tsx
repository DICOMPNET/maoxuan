import { Link } from "react-router-dom";

import type { Entity, Event, Idea } from "../types";
import { typeLabel } from "../utils/labels";

const ENTITY_TYPE_ORDER = [
  "person",
  "人物",
  "organization",
  "组织",
  "place",
  "地点",
  "concept",
  "概念",
];

function groupEntities(entities: Entity[]): { type: string; items: Entity[] }[] {
  const map = new Map<string, Entity[]>();
  for (const entity of entities) {
    const type = entity.type.toLowerCase();
    if (!map.has(type)) map.set(type, []);
    map.get(type)!.push(entity);
  }
  const rank = (type: string) => {
    const idx = ENTITY_TYPE_ORDER.indexOf(type);
    return idx === -1 ? ENTITY_TYPE_ORDER.length : idx;
  };
  return Array.from(map.entries())
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([type, items]) => ({ type, items }));
}

export default function ArticleInsightsPanel({
  articleId,
  ideas,
  events,
  entities,
}: {
  articleId: number;
  ideas: Idea[];
  events: Event[];
  entities: Entity[];
}) {
  if (ideas.length === 0 && events.length === 0 && entities.length === 0) {
    return null;
  }

  return (
    <section className="article-insights">
      <div className="article-insights-head">
        <div>
          <div className="eyebrow">本篇知识</div>
          <div className="muted">结构化抽取结果可能存在误差，请以原文为准</div>
        </div>
        <Link className="action-link" to={`/graph?articleId=${articleId}`}>
          在知识图谱中查看
        </Link>
      </div>

      {ideas.length > 0 && (
        <div className="insight-section">
          <h2>核心思想</h2>
          <div className="stack">
            {ideas.map((idea) => (
              <article className="insight-card" key={idea.id}>
                <div className="insight-card-head">
                  <h3>{idea.name}</h3>
                  {idea.category && (
                    <span className="article-meta-chip">{idea.category}</span>
                  )}
                </div>
                <p>{idea.summary}</p>
                {idea.quote && (
                  <blockquote>
                    <p>{idea.quote}</p>
                  </blockquote>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="insight-section">
          <h2>相关事件</h2>
          <div className="stack">
            {events.map((event) => (
              <article className="insight-card" key={event.id}>
                <div className="insight-card-head">
                  <h3>{event.title}</h3>
                  <Link
                    className="action-link"
                    to={`/timeline?articleId=${articleId}&eventId=${event.id}`}
                  >
                    时间线定位
                  </Link>
                </div>
                <div className="meta">
                  {[event.date_text, event.location].filter(Boolean).join(" · ")}
                </div>
                <p>{event.description}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {entities.length > 0 && (
        <div className="insight-section">
          <h2>涉及实体</h2>
          {groupEntities(entities).map(({ type, items }) => (
            <div className="insight-entity-group" key={type}>
              <span className="insight-entity-type">{typeLabel(type)}</span>
              <div className="insight-entity-chips">
                {items.map((entity) => (
                  <Link
                    className="insight-entity-chip"
                    key={entity.id}
                    title={entity.description ?? undefined}
                    to={`/graph?articleId=${articleId}&node=entity:${entity.id}`}
                  >
                    {entity.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
