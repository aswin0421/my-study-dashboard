"""
매일 아침 7시, 오늘의 캘린더 일정을 디스코드로 보내는 스크립트

    - GitHub Actions 가 매일 06:40(KST)에 실행 → 7시 정각까지 기다렸다가 전송
      (GitHub 예약 실행은 몇 분씩 늦게 시작되는 경우가 많아서 미리 시작해 둠)
    - 일정이 없는 날에도 "오늘은 등록된 일정이 없어요" 알림을 보냄
    - Supabase calendar 테이블의 day 컬럼(날짜)으로 조회
      → supabase/calendar_day_column.sql 을 먼저 실행해 두어야 함

필요한 환경변수: SUPABASE_URL, SUPABASE_KEY, DISCORD_WEBHOOK_URL
(GitHub 에서는 Secrets, 내 PC 에서는 .env 파일)

내 PC 에서 테스트:
    python scripts/notify_today.py --dry-run   # 디스코드로 안 보내고 메시지만 출력
    python scripts/notify_today.py             # 바로 디스코드로 전송
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

# 내 PC 에서 실행할 때는 .env 파일의 값을 읽어옴 (GitHub Actions 에서는 Secrets 를 씀)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

KST = timezone(timedelta(hours=9))  # 한국은 서머타임이 없어서 +9시간 고정
SEND_HOUR = 7                       # 알림 시각 (오전 7시)
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]
EMBED_COLOR = 0xE02D2D              # 웹사이트 포인트 레드

# 디스코드는 기본 파이썬 User-Agent 요청을 막는 경우가 있어서 직접 지정
USER_AGENT = "my-study-dashboard-notifier (https://github.com/aswin0421/my-study-dashboard, 1.0)"


def env(name):
    # Secrets 에 붙여넣을 때 끝에 줄바꿈·공백이 섞여 들어가는 경우가 많아서 제거
    value = (os.getenv(name) or "").strip()
    if not value:
        sys.exit(f"[오류] 환경변수 {name} 가 없습니다. (.env 또는 GitHub Secrets 확인)")
    return value


def wait_until_send_time():
    """7시 전에 시작됐으면 7시 정각까지 기다림 (7시가 지났으면 바로 진행)"""
    now = datetime.now(KST)
    target = now.replace(hour=SEND_HOUR, minute=0, second=0, microsecond=0)
    if timedelta(0) < target - now < timedelta(hours=1):
        print(f"{target:%H:%M} 까지 {int((target - now).total_seconds())}초 대기")
        time.sleep((target - now).total_seconds())


def get_today_schedule(supabase_url, supabase_key, day):
    """Supabase calendar 테이블에서 해당 날짜의 일정 내용 (없으면 None)"""
    query = urllib.parse.urlencode({"select": "content", "day": f"eq.{day.isoformat()}"})
    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/rest/v1/calendar?{query}",
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            rows = json.load(response)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        if "day" in detail and "does not exist" in detail:
            sys.exit("[오류] calendar 테이블에 day 컬럼이 없습니다. supabase/calendar_day_column.sql 을 먼저 실행하세요.")
        sys.exit(f"[오류] Supabase 조회 실패 ({e.code}): {detail}")

    return rows[0]["content"] if rows else None


def build_message(day, schedule):
    """디스코드로 보낼 메시지 (embed 카드 형태)"""
    title = f"📅 {day.month}월 {day.day}일 ({WEEKDAYS[day.weekday()]}) 오늘의 일정"
    return {
        "username": "Only For Me",
        "embeds": [{
            "title": title,
            "description": schedule if schedule else "오늘은 등록된 일정이 없어요. 🙂",
            "color": EMBED_COLOR,
        }],
    }


def send_to_discord(webhook_url, message):
    request = urllib.request.Request(
        webhook_url,
        data=json.dumps(message).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15):
            pass  # 성공하면 204 (내용 없음)
    except urllib.error.HTTPError as e:
        sys.exit(f"[오류] 디스코드 전송 실패 ({e.code}): {e.read().decode('utf-8', 'replace')}")


def main():
    dry_run = "--dry-run" in sys.argv

    # GitHub Actions 의 예약 실행일 때만 7시까지 기다림 (수동 실행·테스트는 바로 전송)
    if os.getenv("WAIT_UNTIL_SEND_TIME") == "true":
        wait_until_send_time()

    today = datetime.now(KST).date()
    schedule = get_today_schedule(env("SUPABASE_URL"), env("SUPABASE_KEY"), today)
    message = build_message(today, schedule)

    if dry_run:
        print(json.dumps(message, ensure_ascii=False, indent=2))
        return

    send_to_discord(env("DISCORD_WEBHOOK_URL"), message)
    print(f"전송 완료: {message['embeds'][0]['title']}")


if __name__ == "__main__":
    main()
