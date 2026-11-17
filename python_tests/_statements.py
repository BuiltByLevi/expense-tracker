"""Independent reader for the synthetic November 2026 statement fixtures.

This is NOT a port of the app's parser. It reads the same CSV files with the
Python standard library so that the app's numbers can be checked against a
second, separately written implementation. Stdlib only: nothing to install.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[1] / "shared" / "testFixtures" / "statements"
PAISE = Decimal("0.01")


@dataclass(frozen=True)
class Row:
    day: date
    narration: str
    reference: str
    kind: str          # "credit" | "debit"
    amount: Decimal    # always positive, rupees to the paisa
    balance: Decimal | None


def money(text: str) -> Decimal | None:
    """Indian statement money text -> Decimal. '' -> None; '(500.00)' -> -500.00."""
    t = text.strip().replace("₹", "").replace(",", "").replace(" ", "")
    if not t:
        return None
    negative = t.startswith("(") and t.endswith(")")
    t = t.strip("()")
    try:
        value = Decimal(t)
    except InvalidOperation as err:
        raise ValueError(f"not an amount: {text!r}") from err
    value = value.quantize(PAISE)
    return -value if negative else value


DATE_CELL = {
    "separate": r"^\d{2}/\d{2}/\d{4}$",
    "drcr": r"^\d{2}-\d{2}-\d{4}$",
    "signed": r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$",
}


def _is_data(row: list[str], date_pattern: str, column: int) -> bool:
    import re
    return bool(row) and len(row) > column and bool(re.match(date_pattern, row[column].strip()))


def _rows_after_header(path: Path, header_first_cell: str) -> tuple[list[str], list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as fh:
        lines = list(csv.reader(fh))
    start = next(i for i, r in enumerate(lines) if r and r[0].strip() == header_first_cell)
    return lines[start], lines[start + 1:]


def read_separate_columns(path: Path = FIXTURES / "november-2026-separate-columns.csv") -> list[Row]:
    header, body = _rows_after_header(path, "Txn Date")
    assert header[4] == "Withdrawal Amt." and header[5] == "Deposit Amt.", header
    rows = []
    for r in body:
        if not _is_data(r, DATE_CELL["separate"], 0):   # opening balance, totals, footer
            continue
        day = datetime.strptime(r[0].strip(), "%d/%m/%Y").date()
        withdrawal, deposit = money(r[4]), money(r[5])
        if (withdrawal is None) == (deposit is None):
            raise ValueError(f"row must have exactly one of withdrawal/deposit: {r}")
        kind, amount = ("debit", withdrawal) if withdrawal is not None else ("credit", deposit)
        rows.append(Row(day, r[2].strip(), r[3].strip(), kind, amount, money(r[6])))
    return rows


def read_drcr(path: Path = FIXTURES / "november-2026-single-amount-drcr.csv") -> list[Row]:
    header, body = _rows_after_header(path, "Sl. No.")
    rows = []
    for r in body:
        if not _is_data(r, DATE_CELL["drcr"], 1):
            continue
        day = datetime.strptime(r[1].strip(), "%d-%m-%Y").date()
        marker = r[5].strip().upper()
        kind = {"CR": "credit", "DR": "debit"}[marker]
        rows.append(Row(day, r[2].strip(), r[3].strip(), kind, money(r[4]), money(r[6])))
    return rows


def read_signed(path: Path = FIXTURES / "november-2026-signed-amount.csv") -> list[Row]:
    header, body = _rows_after_header(path, "Transaction Date")
    rows = []
    for r in body:
        if not _is_data(r, DATE_CELL["signed"], 0):
            continue
        day = datetime.strptime(r[0].strip(), "%Y-%m-%d %H:%M:%S").date()
        signed = money(r[2])
        kind = "debit" if signed < 0 else "credit"
        rows.append(Row(day, r[1].strip(), "", kind, abs(signed), money(r[3])))
    return rows


OPENING = Decimal("10000.00")
CLOSING = Decimal("61866.50")
