"""
Wikipedia RAG Source.
Prompt uretimi sirasinda Wikipedia'dan baglam ceker.
Hem TR hem EN destegi vardir.
"""

import logging
from typing import Optional

import wikipediaapi

log = logging.getLogger(__name__)

# User-Agent zorunlu (Wikipedia API politikasi)
_UA = "NeoMagic-RAG/1.0 (https://github.com/neomagic; neomagic@app.dev)"

_wikis: dict[str, wikipediaapi.Wikipedia] = {}


def _get_wiki(lang: str = "en") -> wikipediaapi.Wikipedia:
    """Dil bazinda singleton Wikipedia istemcisi."""
    if lang not in _wikis:
        _wikis[lang] = wikipediaapi.Wikipedia(
            user_agent=_UA,
            language=lang,
            extract_format=wikipediaapi.ExtractFormat.WIKI,
        )
    return _wikis[lang]


async def wikipedia_search(
    query: str,
    language: str = "en",
    max_results: int = 3,
    max_chars: int = 2000,
) -> dict:
    """
    Wikipedia'dan sorguya uygun sayfalari getirir.

    Returns:
        {
            "query": str,
            "language": str,
            "results": [
                {
                    "title": str,
                    "summary": str,       # ilk paragraflar (max_chars)
                    "url": str,
                    "categories": list[str],
                }
            ],
            "source": "wikipedia"
        }
    """
    wiki = _get_wiki(language)

    # Wikipedia-API dogrudan arama desteklemez;
    # httpx ile MediaWiki opensearch API kullaniyoruz
    import httpx

    search_url = f"https://{language}.wikipedia.org/w/api.php"
    params = {
        "action": "opensearch",
        "search": query,
        "limit": str(max_results),
        "namespace": "0",
        "format": "json",
    }

    results = []
    try:
        headers = {"User-Agent": _UA}
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            resp = await client.get(search_url, params=params)
            resp.raise_for_status()
            data = resp.json()

        # opensearch format: [query, [titles], [descriptions], [urls]]
        titles = data[1] if len(data) > 1 else []

        for title in titles:
            page = wiki.page(title)
            if not page.exists():
                continue

            # Ozet metni — max_chars ile sinirla
            summary = page.summary[:max_chars]
            if len(page.summary) > max_chars:
                # Son cumle sinirinda kes
                last_dot = summary.rfind(".")
                if last_dot > max_chars // 2:
                    summary = summary[: last_dot + 1]

            results.append(
                {
                    "title": page.title,
                    "summary": summary,
                    "url": page.fullurl,
                    "categories": list(page.categories.keys())[:5],
                }
            )

    except Exception as e:
        log.warning("[Wikipedia] Search failed for '%s': %s", query, e)

    return {
        "query": query,
        "language": language,
        "results": results,
        "total": len(results),
        "source": "wikipedia",
    }


async def wikipedia_context_for_prompt(
    intent: str,
    language: str = "en",
    max_results: int = 2,
    max_chars: int = 1500,
) -> Optional[str]:
    """
    Prompt uretimi icin Wikipedia'dan zenginlestirilmis baglam olusturur.
    generateAdapter'dan cagrilmak uzere tasarlanmistir.

    Returns:
        Formatlanmis context string veya None (sonuc yoksa)
    """
    data = await wikipedia_search(
        query=intent,
        language=language,
        max_results=max_results,
        max_chars=max_chars,
    )

    if not data["results"]:
        return None

    sections = ["## Wikipedia Context (Auto-Retrieved)"]
    for r in data["results"]:
        sections.append(f"### {r['title']}")
        sections.append(r["summary"])
        sections.append(f"Source: {r['url']}\n")

    return "\n\n".join(sections)
