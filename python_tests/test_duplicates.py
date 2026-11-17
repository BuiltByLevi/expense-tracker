"""Duplicate-detection rules, specified and checked in Python.

CAVEAT: the matcher here is a Python specification, not the app's matcher.
These tests show the fixture satisfies the stated rules. They cannot fail
because of a bug in shared/duplicateDetection.ts; only the Vitest suite
(shared/duplicateAudit.test.ts and the import tests) checks that code.

This checks the rules the fixture must satisfy and the rule shape the app
uses (a shared non-empty bank reference is a duplicate; same date, amount
and narration without a reference is a likely duplicate). It does not port
the TypeScript matcher; it checks the data and the stated rules.
"""
import unittest
from decimal import Decimal

import _statements as st


def normalise(text: str) -> str:
    return " ".join(text.upper().split())


def same_reference(a: st.Row, b: st.Row) -> bool:
    return bool(a.reference) and a.reference == b.reference


def likely_duplicate(a: st.Row, b: st.Row) -> bool:
    return a.day == b.day and a.amount == b.amount and normalise(a.narration) == normalise(b.narration)


class DuplicateRuleTests(unittest.TestCase):
    def setUp(self):
        self.rows = st.read_separate_columns()

    def test_no_two_fixture_rows_share_a_bank_reference(self):
        refs = [r.reference for r in self.rows if r.reference and not set(r.reference) <= {"0"}]
        self.assertEqual(len(refs), len(set(refs)))

    def test_no_two_fixture_rows_are_likely_duplicates(self):
        for i, a in enumerate(self.rows):
            for b in self.rows[i + 1:]:
                self.assertFalse(likely_duplicate(a, b), f"{a.narration} / {b.narration}")

    def test_two_real_payments_on_the_same_day_are_not_duplicates(self):
        # 15/11/2026 has a UPI payment of 750 and an ATM withdrawal of 2,000.
        same_day = [r for r in self.rows if r.day.day == 15]
        self.assertEqual(len(same_day), 2)
        self.assertFalse(likely_duplicate(*same_day))
        self.assertFalse(same_reference(*same_day))

    def test_same_day_same_amount_with_different_references_is_not_a_duplicate(self):
        a = st.Row(st.datetime(2026, 11, 10).date(), "UPI/PAYMENT", "REF1", "debit", Decimal("100.00"), None)
        b = st.Row(st.datetime(2026, 11, 10).date(), "UPI/PAYMENT", "REF2", "debit", Decimal("100.00"), None)
        self.assertFalse(same_reference(a, b))
        self.assertTrue(likely_duplicate(a, b), "text match alone is only a soft flag, never an automatic exclusion")

    def test_same_reference_is_a_duplicate_even_when_narration_differs(self):
        a = st.Row(st.datetime(2026, 11, 10).date(), "NEFT A", "REF9", "credit", Decimal("10.00"), None)
        b = st.Row(st.datetime(2026, 11, 12).date(), "NEFT B", "REF9", "credit", Decimal("10.00"), None)
        self.assertTrue(same_reference(a, b))


if __name__ == "__main__":
    unittest.main()
