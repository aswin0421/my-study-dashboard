"""아침 알림 스크립트(scripts/notify_today.py)의 메시지·대기 시간 계산 확인 — 실제 전송은 하지 않음"""
import datetime as dt

import pytest

import notify_today as n


def test_message_with_schedule_and_classes():
    classes = [
        {"subject": "데이터통신", "room": "IT융합대학3120 강의실", "start_time": "10:00:00", "end_time": "12:00:00"},
        {"subject": "알고리즘", "room": None, "start_time": "12:00:00", "end_time": "13:00:00"},
    ]
    embed = n.build_message(dt.date(2026, 10, 13), "sqld 시험 접수", classes)["embeds"][0]

    assert embed["title"] == "📅 10월 13일 (화) 오늘의 일정"
    schedule, lessons = embed["fields"]
    assert schedule["value"] == "sqld 시험 접수"
    assert lessons["value"].splitlines() == [
        "`10:00~12:00` **데이터통신** · IT융합대학3120 강의실",
        "`12:00~13:00` **알고리즘**",
    ]


def test_message_without_schedule_or_classes():
    embed = n.build_message(dt.date(2026, 10, 10), None, [])["embeds"][0]
    assert embed["title"].endswith("(토) 오늘의 일정")
    assert embed["fields"][0]["value"] == "오늘은 등록된 일정이 없어요. 🙂"
    assert embed["fields"][1]["value"] == "오늘은 수업이 없어요. 🎉"


def test_message_when_timetable_failed():
    embed = n.build_message(dt.date(2026, 10, 7), None, None)["embeds"][0]
    assert embed["fields"][1]["value"] == "시간표를 불러오지 못했어요."


def test_long_schedule_is_cut_to_discord_limit():
    embed = n.build_message(dt.date(2026, 10, 7), "가" * 3000, [])["embeds"][0]
    assert len(embed["fields"][0]["value"]) == 1024


@pytest.mark.parametrize("start, expected_wait", [
    ((6, 55), 300),       # 예약 실행이 제시간에 시작 → 7시까지 5분 대기
    ((6, 59, 30), 30),
    ((7, 12), 0),         # 늦게 시작 → 바로 전송
    ((5, 30), 0),         # 1시간보다 일찍 시작하는 경우는 기다리지 않음
])
def test_wait_until_7am(monkeypatch, start, expected_wait):
    slept = []
    monkeypatch.setattr(n.time, "sleep", lambda seconds: slept.append(round(seconds)))

    class FakeDatetime(dt.datetime):
        @classmethod
        def now(cls, tz=None):
            return dt.datetime(2026, 10, 7, *start, tzinfo=n.KST)

    monkeypatch.setattr(n, "datetime", FakeDatetime)
    n.wait_until_send_time()
    assert (slept[0] if slept else 0) == expected_wait
