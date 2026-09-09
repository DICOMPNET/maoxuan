from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app import crud
from app.api.graph import _full_graph
from app.api.map import LOCATION_MARKERS
from app.database import get_session
from app.models import Article, Entity, Event, Idea, Relation
from app.schemas import MapLocation, ScreenOverview, ScreenStats

router = APIRouter(prefix="/api/screen", tags=["screen"])


@router.get("/overview", response_model=ScreenOverview)
def read_screen_overview(session: Session = Depends(get_session)):
    events = crud.list_events(session, limit=1000, sort="start_date")
    locations = _build_map_locations(events)
    key_events = sorted(
        events,
        key=lambda event: (
            -(event.importance or 0),
            event.start_date is None,
            event.start_date,
            event.id or 0,
        ),
    )[:12]

    return ScreenOverview(
        stats=ScreenStats(
            articles=_count(session, Article),
            events=_count(session, Event),
            ideas=_count(session, Idea),
            entities=_count(session, Entity),
            relations=_count(session, Relation),
            locations=len(locations),
        ),
        key_events=key_events,
        map_locations=locations,
        graph=_full_graph(session),
    )


def _count(session: Session, model: type) -> int:
    return int(session.exec(select(func.count()).select_from(model)).one())


def _build_map_locations(events: list[Event]) -> list[MapLocation]:
    grouped: dict[str, list[Event]] = {}
    for event in events:
        if event.location and event.location in LOCATION_MARKERS:
            grouped.setdefault(event.location, []).append(event)

    locations: list[MapLocation] = []
    for name, items in grouped.items():
        marker = LOCATION_MARKERS[name]
        longitude, latitude = marker["coordinates"]
        dated_events = [event for event in items if event.start_date is not None]
        locations.append(
            MapLocation(
                id=name,
                name=name,
                province=marker["province"],
                longitude=longitude,
                latitude=latitude,
                event_count=len(items),
                start_date=dated_events[0].start_date if dated_events else None,
                end_date=dated_events[-1].start_date if dated_events else None,
                events=items,
            )
        )

    return sorted(
        locations,
        key=lambda location: (-location.event_count, location.start_date is None, location.name),
    )
