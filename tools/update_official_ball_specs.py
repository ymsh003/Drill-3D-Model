#!/usr/bin/env python3
"""Build a local bowling-ball specification catalog from manufacturer pages.

The generated catalog contains public product specifications only. It is loaded by
the standalone HTML app so normal operator use does not depend on CORS, network
availability, or a manufacturer's current page markup.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import html as html_module
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from lxml import html


SPI_CATALOG_URL = "https://www.stormbowling.com/bowling-equipment/bowling-balls/all-bowling-balls/"
HAMMER_CATALOG_URL = "https://hammerbowling.com/collections/balls"
USER_AGENT = "DrillStudioCatalogUpdater/1.0 (+local catalog builder)"
VERIFIED_OFFICIAL_RECORDS = [
    {
        "brand": "900 Global",
        "name": "Reality Check",
        "sku": "",
        "sourceLabel": "Storm Products 2022 公式カタログ",
        "sourceUrl": "https://www.stormbowling.com/medias/StormCatalog_allbrands_2022_88_small.pdf",
        "cover": "S84 Beta Hybrid",
        "surface": "4K-Fast",
        "color": "Black / Indigo / Maroon",
        "core": "Disturbance Asymmetric",
        "coreType": "asymmetric",
        "hardness": "",
        "releaseDate": "",
        "specsByWeight": {
            "16": {"rg": 2.48, "diff": 0.052, "intDiff": 0.018},
            "15": {"rg": 2.49, "diff": 0.052, "intDiff": 0.018},
            "14": {"rg": 2.50, "diff": 0.052, "intDiff": 0.018},
            "13": {"rg": 2.57, "diff": 0.032, "intDiff": 0.010},
            "12": {"rg": 2.59, "diff": 0.029, "intDiff": 0.008},
        },
    },
    {
        "brand": "900 Global",
        "name": "Zen Gold Label",
        "sku": "BBMGZG",
        "sourceLabel": "900 Global 公式製品ページ",
        "sourceUrl": "https://www.stormbowling.com/900-global-zen-gold-label-bowling-ball",
        "cover": "Reserve Blend 801 Pearl",
        "surface": "Reacta Gloss",
        "color": "Deep Purple",
        "core": "Meditate Symmetric",
        "coreType": "symmetric",
        "hardness": "",
        "releaseDate": "July 28, 2023",
        "specsByWeight": {
            "16": {"rg": 2.48, "diff": 0.051},
            "15": {"rg": 2.49, "diff": 0.051},
            "14": {"rg": 2.50, "diff": 0.051},
        },
    },
    {
        "brand": "Storm",
        "name": "Phaze II",
        "sku": "BBMTZA",
        "sourceLabel": "Storm 公式テックシート",
        "sourceUrl": "https://www.stormbowling.com/medias/Storm_Phaze%20II_tech%20sheet.pdf",
        "cover": "TX-16 Solid",
        "surface": "3000 Grit",
        "color": "Red / Blue / Purple",
        "core": "Velocity",
        "coreType": "symmetric",
        "hardness": "73–75",
        "releaseDate": "10/04/16",
        "specsByWeight": {
            "16": {"rg": 2.48, "diff": 0.051},
            "15": {"rg": 2.48, "diff": 0.051},
            "14": {"rg": 2.53, "diff": 0.050},
            "13": {"rg": 2.59, "diff": 0.045},
            "12": {"rg": 2.65, "diff": 0.035},
        },
    },
    {
        "brand": "Storm",
        "name": "Pitch Black",
        "sku": "BBMTUB",
        "sourceLabel": "Storm 2016 公式製品カタログ",
        "sourceUrl": "https://www.stormbowling.com/medias/STORM_2016%20Product%20Catalog_full.pdf",
        "cover": "Controll Solid Urethane",
        "surface": "1000 Grit Abralon",
        "color": "Pitch Black",
        "core": "Capacitor",
        "coreType": "symmetric",
        "hardness": "74–76",
        "releaseDate": "05/27/14",
        "specsByWeight": {
            "16": {"rg": 2.56, "diff": 0.023},
            "15": {"rg": 2.57, "diff": 0.022},
            "14": {"rg": 2.59, "diff": 0.022},
            "13": {"rg": 2.61, "diff": 0.021},
            "12": {"rg": 2.63, "diff": 0.021},
        },
    },
    {
        "brand": "Roto Grip",
        "name": "Hustle RIP",
        "sku": "RQR",
        "sourceLabel": "Roto Grip 公式テックシート",
        "sourceUrl": "https://www.stormbowling.com/medias/TECH%20DOC_Hustle%20RIP.pdf",
        "cover": "VTC Solid Reactive",
        "surface": "Reacta Gloss",
        "color": "Royal Imperial Purple",
        "core": "Hustle",
        "coreType": "symmetric",
        "hardness": "",
        "releaseDate": "",
        "specsByWeight": {
            "16": {"rg": 2.53, "diff": 0.030},
            "15": {"rg": 2.53, "diff": 0.030},
            "14": {"rg": 2.55, "diff": 0.030},
            "13": {"rg": 2.63, "diff": 0.009},
            "12": {"rg": 2.65, "diff": 0.011},
        },
    },
]
FIELD_LABELS = (
    "PERFORMANCE",
    "PART NUMBER",
    "COLOR",
    "CORE",
    "COVERSTOCK",
    "COVER TYPE",
    "FINISH",
    "WEIGHTS",
    "LANE CONDITION",
    "REACTION",
    "WARRANTY",
    "RELEASE DATE",
    "RG / DIFF / ASY",
    "RG / DIFF",
    "DOWNLOADS",
    "FEATURING",
)


def fetch(url: str, retries: int = 3) -> bytes:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json"})
            with urlopen(request, timeout=45) as response:
                return response.read()
        except Exception as error:  # pragma: no cover - depends on remote service
            last_error = error
            if attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", html_module.unescape(str(value or ""))).strip()


def clean_spi_value(value: object) -> str:
    result = clean_text(value)
    return re.sub(r"^[A-Z]_", "", result)


def numeric(value: object, minimum: float, maximum: float) -> float | None:
    match = re.search(r"[-+]?\d+(?:\.\d+)?", str(value or ""))
    if not match:
        return None
    number = float(match.group(0))
    return number if minimum <= number <= maximum else None


def make_spec(rg: object, diff: object, int_diff: object = None) -> dict[str, float] | None:
    parsed_rg = numeric(rg, 2.0, 3.0)
    parsed_diff = numeric(diff, 0.0, 0.1)
    parsed_int = numeric(int_diff, 0.0, 0.1)
    if parsed_rg is None or parsed_diff is None:
        return None
    result = {"rg": parsed_rg, "diff": parsed_diff}
    if parsed_int is not None:
        result["intDiff"] = parsed_int
    return result


def text_fields(node) -> dict[str, str]:
    fields: dict[str, str] = {}
    for paragraph in node.xpath(".//p[strong or b]"):
        labels = paragraph.xpath("./strong[1] | ./b[1]")
        if not labels:
            continue
        label = clean_text(labels[0].text_content()).rstrip(":")
        full_text = clean_text(paragraph.text_content())
        value = full_text[len(clean_text(labels[0].text_content())) :].lstrip(": ")
        if label and value:
            fields.setdefault(label, value)
    return fields


def classify_core(symmetry: str, specs: dict[str, dict[str, float]]) -> str:
    normalized = clean_text(symmetry).lower()
    if "asym" in normalized or any(float(value.get("intDiff", 0)) > 0.003 for value in specs.values()):
        return "asymmetric"
    if "sym" in normalized or specs:
        return "symmetric"
    return ""


def parse_spi_listing() -> list[dict]:
    records: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for page in range(1, 10):
        page_url = f"https://www.stormbowling.com/products/equipment/bowling-balls/24/1/{page}/"
        document = html.fromstring(fetch(page_url))
        page_records = 0
        for item in document.xpath('//li[contains(concat(" ", normalize-space(@class), " "), " item ")]'):
            links = item.xpath('.//a[contains(concat(" ", normalize-space(@class), " "), " product-name-link ")][1]')
            custom_fields = item.xpath('.//div[contains(concat(" ", normalize-space(@class), " "), " product-custom-fields ")][1]')
            if not links or not custom_fields:
                continue
            link = links[0]
            name = clean_text(link.get("title") or link.text_content())
            fields = {clean_text(key): clean_spi_value(value) for key, value in text_fields(custom_fields[0]).items()}
            brand = fields.get("Brand", "")
            key = (canonical(brand), canonical(name))
            if not name or brand not in {"Storm", "Roto Grip", "900 Global"} or key in seen:
                continue
            weight = numeric(fields.get("Weight"), 8, 20)
            spec = make_spec(fields.get("Radius of Gyration"), fields.get("Differential"), fields.get("PSA"))
            specs: dict[str, dict[str, float]] = {}
            if weight is not None and spec:
                specs[str(int(weight))] = spec
            seen.add(key)
            page_records += 1
            records.append(
                {
                    "brand": brand,
                    "name": name,
                    "sku": clean_text(item.get("data-itemno")),
                    "sourceLabel": f"{brand} 公式製品ページ",
                    "sourceUrl": urljoin(page_url, link.get("href") or ""),
                    "cover": fields.get("Coverstock", ""),
                    "surface": fields.get("Finish", ""),
                    "color": fields.get("Color", ""),
                    "core": fields.get("Weight Block", ""),
                    "coreType": classify_core(fields.get("Symmetry", ""), specs),
                    "hardness": fields.get("Durometer", ""),
                    "releaseDate": fields.get("Release Date", ""),
                    "specsByWeight": specs,
                }
            )
        if page_records == 0:
            break
    return records


def parse_spi_detail(record: dict) -> dict:
    document = html.fromstring(fetch(record["sourceUrl"]))
    descriptions = document.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " secondary-desc ")]')
    if not descriptions:
        return record
    description = descriptions[0]
    fields = text_fields(description)
    for output_key, source_keys in {
        "cover": ("Coverstock",),
        "surface": ("Factory Finish", "Finish"),
        "color": ("Color",),
        "core": ("Core", "Weight Block"),
        "releaseDate": ("Release Date",),
        "hardness": ("Durometer", "Hardness"),
    }.items():
        for source_key in source_keys:
            if fields.get(source_key):
                record[output_key] = clean_spi_value(fields[source_key])
                break

    specs = dict(record.get("specsByWeight") or {})
    for marker in description.xpath('.//*[self::strong or self::b]'):
        marker_text = clean_text(marker.text_content())
        if not re.fullmatch(r"1[2-6](?:\s*(?:lb|lbs|pounds?))?", marker_text, re.I):
            continue
        weight_match = re.search(r"1[2-6]", marker_text)
        if not weight_match:
            continue
        card = marker.getparent()
        for _ in range(3):
            card_text = clean_text(card.text_content())
            rg_match = re.search(r"\bRG\s*:?\s*\(?([0-9.]+)", card_text, re.I)
            diff_match = re.search(r"\bDiff(?:erential)?\s*:?\s*\(?([0-9.]+)", card_text, re.I)
            int_match = re.search(r"\b(?:PSA|ASY|Int(?:ermediate)?\.?\s*Diff)\s*:?\s*\(?([0-9.]+)", card_text, re.I)
            spec = make_spec(rg_match.group(1) if rg_match else None, diff_match.group(1) if diff_match else None, int_match.group(1) if int_match else None)
            if spec:
                specs[weight_match.group(0)] = spec
                break
            parent = card.getparent()
            if parent is None:
                break
            card = parent

    record["specsByWeight"] = specs
    record["coreType"] = classify_core(fields.get("Symmetry", record.get("coreType", "")), specs)
    return record


def parse_hammer_field(text: str, label: str) -> str:
    labels = "|".join(re.escape(item) for item in FIELD_LABELS)
    match = re.search(rf"\b{re.escape(label)}\b\s+(.*?)(?=\s+(?:{labels})\b|$)", text, re.I)
    return clean_text(match.group(1)) if match else ""


def parse_hammer_product(url: str) -> dict | None:
    data = json.loads(fetch(f"{url}.js"))
    description_html = data.get("description") or ""
    description = clean_text(html.fromstring(f"<div>{description_html}</div>").text_content())
    specs: dict[str, dict[str, float]] = {}
    pattern = re.compile(
        r"\b(1[2-6])\s*lb\s*-\s*RG\s*\(?([0-9.]+)\)?\s*DIFF\s*\(?([0-9.]+)\)?(?:\s*(?:ASY|INT\.?\s*DIFF)\s*\(?([0-9.]+)\)?)?",
        re.I,
    )
    for match in pattern.finditer(description):
        spec = make_spec(match.group(2), match.group(3), match.group(4))
        if spec:
            specs[match.group(1)] = spec
    if not specs:
        return None
    core_type = classify_core("asymmetric" if any("intDiff" in spec for spec in specs.values()) else "symmetric", specs)
    return {
        "brand": "Hammer",
        "name": clean_text(data.get("title")),
        "sku": clean_text(parse_hammer_field(description, "PART NUMBER")),
        "sourceLabel": "Hammer 公式製品ページ",
        "sourceUrl": url,
        "cover": parse_hammer_field(description, "COVERSTOCK"),
        "surface": parse_hammer_field(description, "FINISH"),
        "color": parse_hammer_field(description, "COLOR"),
        "core": parse_hammer_field(description, "CORE"),
        "coreType": core_type,
        "hardness": "",
        "releaseDate": parse_hammer_field(description, "RELEASE DATE"),
        "specsByWeight": specs,
    }


def parse_hammer_catalog() -> list[dict]:
    document = html.fromstring(fetch(HAMMER_CATALOG_URL))
    urls: list[str] = []
    seen: set[str] = set()
    for href in document.xpath('//a[contains(@href, "/products/")]/@href'):
        product_path = str(href).split("?")[0]
        if not re.match(r"^/?(?:collections/balls/)?products/[^/]+/?$", product_path):
            continue
        product_path = re.sub(r"^/?collections/balls/", "/", product_path)
        if not product_path.startswith("/"):
            product_path = f"/{product_path}"
        url = urljoin("https://hammerbowling.com", product_path).rstrip("/")
        if url not in seen:
            seen.add(url)
            urls.append(url)
    records: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(parse_hammer_product, url): url for url in urls}
        for future in concurrent.futures.as_completed(futures):
            try:
                record = future.result()
                if record:
                    records.append(record)
            except Exception as error:  # pragma: no cover - individual remote page failure
                print(f"warning: skipped {futures[future]}: {error}", file=sys.stderr)
    return records


def canonical(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def merge_records(records: list[dict]) -> list[dict]:
    merged: dict[tuple[str, str], dict] = {}
    for record in records:
        key = (canonical(record.get("brand", "")), canonical(record.get("name", "")))
        if not all(key):
            continue
        previous = merged.get(key)
        if previous:
            previous["specsByWeight"].update(record.get("specsByWeight") or {})
            for field, value in record.items():
                if field != "specsByWeight" and value and not previous.get(field):
                    previous[field] = value
        else:
            merged[key] = record
    output = []
    for record in merged.values():
        record["specsByWeight"] = dict(sorted(record.get("specsByWeight", {}).items(), key=lambda item: int(item[0]), reverse=True))
        if record["specsByWeight"]:
            output.append(record)
    return sorted(output, key=lambda item: (canonical(item["brand"]), canonical(item["name"])))


def build_catalog(include_spi: bool, include_hammer: bool) -> dict:
    records: list[dict] = list(VERIFIED_OFFICIAL_RECORDS)
    sources: list[dict[str, str]] = []
    if include_spi:
        spi_records = parse_spi_listing()
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            records.extend(executor.map(parse_spi_detail, spi_records))
        sources.append({"label": "Storm Products（Storm / Roto Grip / 900 Global）", "url": SPI_CATALOG_URL})
    if include_hammer:
        records.extend(parse_hammer_catalog())
        sources.append({"label": "Hammer Bowling", "url": HAMMER_CATALOG_URL})
    sources.extend(
        [
            {"label": "Storm Products 2022 公式カタログ", "url": VERIFIED_OFFICIAL_RECORDS[0]["sourceUrl"]},
            {"label": "Storm 2016 公式製品カタログ", "url": VERIFIED_OFFICIAL_RECORDS[3]["sourceUrl"]},
            {"label": "Roto Grip 公式テックシート", "url": VERIFIED_OFFICIAL_RECORDS[4]["sourceUrl"]},
        ]
    )
    balls = merge_records(records)
    return {
        "schemaVersion": 2,
        "updated": dt.date.today().isoformat(),
        "count": len(balls),
        "sources": sources,
        "balls": balls,
    }


def write_catalog(path: Path, catalog: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    content = (
        "/* Generated from official manufacturer product pages. Run tools/update_official_ball_specs.py to refresh. */\n"
        f"window.BALL_SPEC_CATALOG={payload};\n"
        "window.BALL_SPEC_DATABASE=window.BALL_SPEC_CATALOG.balls;\n"
    )
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "outputs" / "ball-spec-catalog.js",
    )
    parser.add_argument("--skip-spi", action="store_true", help="Skip Storm Products brands")
    parser.add_argument("--skip-hammer", action="store_true", help="Skip Hammer")
    args = parser.parse_args()
    catalog = build_catalog(not args.skip_spi, not args.skip_hammer)
    if not catalog["balls"]:
        raise RuntimeError("No validated manufacturer specifications were collected; existing catalog was not replaced.")
    write_catalog(args.output, catalog)
    print(f"wrote {catalog['count']} official product records to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
