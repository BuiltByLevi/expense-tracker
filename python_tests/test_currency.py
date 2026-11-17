"""Currency precision: exact paise arithmetic, and why float is not used for money.

CAVEAT: this checks Python's Decimal arithmetic and the fixture's paise totals.
It does not call shared/money.ts, so it cannot catch a rounding bug in the app.
"""
import unittest
from decimal import Decimal, ROUND_HALF_UP

import _statements as st


class CurrencyTests(unittest.TestCase):
    def test_fixture_totals_are_exact_in_paise(self):
        rows = st.read_separate_columns()
        credits_paise = sum(int(r.amount * 100) for r in rows if r.kind == "credit")
        debits_paise = sum(int(r.amount * 100) for r in rows if r.kind == "debit")
        self.assertEqual(credits_paise, 6301550)
        self.assertEqual(debits_paise, 1114900)

    def test_a_thousand_ten_paise_credits_sum_to_exactly_one_hundred_rupees(self):
        exact = sum((Decimal("0.10") for _ in range(1000)), Decimal("0.00"))
        self.assertEqual(exact, Decimal("100.00"))

    def test_float_drifts_on_the_same_sum_which_is_why_money_is_integer_paise(self):
        # A plain running float total (not sum(), which is compensated in recent Python).
        total = 0.0
        for _ in range(1000):
            total += 0.10
        self.assertNotEqual(total, 100.0)
        self.assertLess(abs(total - 100.0), 1e-9)  # drifts, but only slightly: the reason to keep paise integers

    def test_half_paisa_rounds_half_up(self):
        self.assertEqual(Decimal("15.505").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), Decimal("15.51"))

    def test_interest_credit_keeps_its_paisa(self):
        interest = [r for r in st.read_signed() if r.narration.startswith("INT.PD")][0]
        self.assertEqual(interest.amount, Decimal("15.50"))
        self.assertEqual(int(interest.amount * 100), 1550)

    def test_balance_column_never_drifts_across_sixteen_rows(self):
        running = st.OPENING
        for r in st.read_drcr():
            running += r.amount if r.kind == "credit" else -r.amount
            self.assertEqual(running, r.balance)


if __name__ == "__main__":
    unittest.main()
