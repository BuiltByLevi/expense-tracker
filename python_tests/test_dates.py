"""Date handling: day-first reading, month-first detection, and the noon-UTC anchor.

CAVEAT: parse_day_first, detect_month_first and the noon-UTC checks are
Python implementations of the rules. They do not call the app's
parseStatementDate, so they cannot detect a bug in normalize.ts. The
app's own timezone tests are in shared/timezoneStability.test.ts.
"""
import re
import unittest
from datetime import date, datetime, timedelta, timezone

import _statements as st


def parse_day_first(text: str) -> date | None:
    try:
        return datetime.strptime(text, "%d/%m/%Y").date()
    except ValueError:
        return None


def parse_month_first(text: str) -> date | None:
    try:
        return datetime.strptime(text, "%m/%d/%Y").date()
    except ValueError:
        return None


def detect_month_first(dates: list[str]) -> bool:
    """A file is month-first only if some date cannot be day-first and none cannot be month-first."""
    day_evidence = month_evidence = 0
    for text in dates:
        m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-]\d{2,4}", text.strip())
        if not m:
            continue
        first, second = int(m.group(1)), int(m.group(2))
        day_evidence += first > 12 and second <= 12
        month_evidence += second > 12 and first <= 12
    return month_evidence > 0 and day_evidence == 0


class DateTests(unittest.TestCase):
    def test_numeric_dates_are_read_day_first(self):
        self.assertEqual(parse_day_first("01/11/2026"), date(2026, 11, 1))   # not 11 Jan

    def test_a_date_that_cannot_be_day_first_is_rejected_as_day_first(self):
        self.assertIsNone(parse_day_first("11/30/2026"))

    def test_fixture_dates_are_all_day_first(self):
        dates = [r.day.strftime("%d/%m/%Y") for r in st.read_separate_columns()]
        self.assertFalse(detect_month_first(dates))
        self.assertEqual(len(dates), 16)

    def test_a_file_with_only_month_first_dates_is_detected(self):
        self.assertTrue(detect_month_first(["11/30/2026", "12/01/2026"]))
        self.assertEqual(parse_month_first("11/30/2026"), date(2026, 11, 30))

    def test_a_file_with_day_first_evidence_stays_day_first(self):
        self.assertFalse(detect_month_first(["11/30/2026", "30/11/2026"]))

    def test_an_ambiguous_only_file_is_not_treated_as_month_first(self):
        # Both parts <= 12 gives no evidence either way; the rule needs month-first evidence to switch.
        self.assertFalse(detect_month_first(["03/11/2026", "05/11/2026"]))

    def test_noon_utc_keeps_the_printed_day_for_viewers_from_utc_minus_11_to_plus_11(self):
        # The app stores a statement date at 12:00 UTC so the day shown does not depend on the device.
        for printed in [date(2026, 11, 1), date(2026, 11, 30), date(2028, 2, 29), date(2026, 3, 31)]:
            anchor = datetime(printed.year, printed.month, printed.day, 12, tzinfo=timezone.utc)
            for hours in range(-11, 12):
                local = anchor.astimezone(timezone(timedelta(hours=hours))).date()
                with self.subTest(printed=printed, offset=hours):
                    self.assertEqual(local, printed)

    def test_viewers_at_utc_plus_12_and_beyond_see_the_next_day(self):
        # Documented limit of the noon anchor, not a bug to hide.
        anchor = datetime(2026, 11, 30, 12, tzinfo=timezone.utc)
        self.assertEqual(anchor.astimezone(timezone(timedelta(hours=12))).date(), date(2026, 12, 1))

    def test_month_boundary_rows_stay_in_their_month(self):
        rows = st.read_signed()
        last = [r for r in rows if r.day.month == 11][-1]
        self.assertEqual(last.day, date(2026, 11, 30))


if __name__ == "__main__":
    unittest.main()
