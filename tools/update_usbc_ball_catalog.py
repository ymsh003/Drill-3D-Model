"""Build the browser-side USBC approved-ball catalog from the official PDF."""

from __future__ import annotations

import argparse
import json
import re
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen

import pdfplumber


SOURCE_URL = (
    "https://bowl.com/getmedia/8b570e80-761c-4486-8628-9d50d718dd60/"
    "approved_balllist_CURRENT.pdf"
)


def clean_cell(value: object) -> str:
    return " ".join(str(value or "").split()).strip()


def download_pdf(target: Path) -> None:
    request = Request(SOURCE_URL, headers={"User-Agent": "Drill-Studio-Catalog-Updater/1.0"})
    with urlopen(request, timeout=90) as response:
        target.write_bytes(response.read())


def parse_catalog(pdf_path: Path) -> tuple[str, list[dict[str, str]]]:
    updated = ""
    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    with pdfplumber.open(pdf_path) as document:
        for page in document.pages:
            for table in page.extract_tables():
                for raw_row in table:
                    if len(raw_row) != 3 or any(cell is None for cell in raw_row):
                        continue
                    brand, name, approved_date = (clean_cell(cell) for cell in raw_row)
                    if not updated and re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", brand) and not name and not approved_date:
                        updated = brand
                        continue
                    if brand == "Brand" and name == "Ball Name":
                        continue
                    if not brand or not name or not approved_date:
                        continue
                    key = (brand.casefold(), name.casefold(), approved_date.casefold())
                    if key in seen:
                        continue
                    seen.add(key)
                    rows.append({"brand": brand, "name": name, "approvedDate": approved_date})
    if not rows:
        raise RuntimeError("No approved-ball rows were found in the USBC PDF")
    return updated, rows


def write_javascript(target: Path, updated: str, rows: list[dict[str, str]]) -> None:
    payload = {
        "source": "USBC Approved Ball List",
        "sourceUrl": SOURCE_URL,
        "updated": updated,
        "count": len(rows),
        "balls": rows,
    }
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "/* Generated from the official USBC Approved Ball List. */\n"
        f"window.USBC_APPROVED_BALL_CATALOG={encoded};\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, help="Use an already-downloaded USBC PDF")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("outputs/usbc-approved-ball-catalog.js"),
    )
    args = parser.parse_args()

    if args.pdf:
        updated, rows = parse_catalog(args.pdf)
    else:
        with tempfile.TemporaryDirectory(prefix="drill-studio-usbc-") as temp_dir:
            pdf_path = Path(temp_dir) / "approved_balllist_CURRENT.pdf"
            download_pdf(pdf_path)
            updated, rows = parse_catalog(pdf_path)
    write_javascript(args.output, updated, rows)
    print(f"Wrote {len(rows)} rows (USBC {updated or 'date unknown'}) to {args.output}")


if __name__ == "__main__":
    main()
