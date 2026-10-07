"""웹사이트 페이지·API 가 정상 응답하는지 확인"""
import pytest

from categories import CATEGORIES


def test_home(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "Only For Me" in res.get_data(as_text=True)


def test_timetable_page(client):
    assert client.get("/timetable").status_code == 200


@pytest.mark.parametrize("slug", [c["slug"] for c in CATEGORIES])
def test_category_pages(client, slug):
    res = client.get(f"/category/{slug}")
    assert res.status_code == 200
    assert f'data-category="{slug}"' in res.get_data(as_text=True)


def test_unknown_category_is_404(client):
    assert client.get("/category/does-not-exist").status_code == 404


def test_old_webservice_url_redirects(client):
    res = client.get("/webservice")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/category/webservice")


def test_healthz(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_robots_blocks_search_engines(client):
    assert "Disallow: /" in client.get("/robots.txt").get_data(as_text=True)


def test_pages_are_noindex(client):
    assert 'name="robots" content="noindex' in client.get("/").get_data(as_text=True)


def test_spotify_disabled_without_keys(client):
    # 스포티파이 키가 없어도 사이트는 동작하고 위젯만 꺼짐
    assert client.get("/api/spotify").get_json() == {"status": "disabled"}
    assert client.get("/callback?code=x").status_code == 404
