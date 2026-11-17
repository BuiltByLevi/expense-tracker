"""Statement parsing, checked independently of the TypeScript parser.

Each synthetic layout is read with the standard library and checked against
the figures in shared/testFixtures/statementFixture.ts (EXPECTED).
"""
import unittest
from decimal import Decimal

import _statements as st


class StatementParsingTests(unittest.TestCase):
    layouts = {
        "separate columns": st.read_separate_columns,
        "single amount Dr/Cr": st.read_drcr,
        "signed amount": st.read_signed,
    }

    def test_every_layout_keeps_all_sixteen_rows(self):
        for name, read in self.layouts.items():
            with self.subTest(layout=name):
                self.assertEqual(len(read()), 16)

    def test_debit_and_credit_counts_match_the_fixture(self):
        for name, read in self.layouts.items():
            with self.subTest(layout=name):
                rows = read()
                self.assertEqual(sum(r.kind == "credit" for r in rows), 8)
                self.assertEqual(sum(r.kind == "debit" for r in rows), 8)

    def test_credit_and_debit_totals_match_the_fixture_to_the_paisa(self):
        for name, read in self.layouts.items():
            with self.subTest(layout=name):
                rows = read()
                credits = sum((r.amount for r in rows if r.kind == "credit"), Decimal("0.00"))
                debits = sum((r.amount for r in rows if r.kind == "debit"), Decimal("0.00"))
                self.assertEqual(credits, Decimal("63015.50"))   # EXPECTED.creditTotal
                self.assertEqual(debits, Decimal("11149.00"))    # EXPECTED.debitTotal

    def test_every_amount_is_positive_and_has_no_more_than_two_decimals(self):
        for name, read in self.layouts.items():
            with self.subTest(layout=name):
                for r in read():
                    self.assertGreater(r.amount, 0)
                    self.assertEqual(r.amount, r.amount.quantize(Decimal("0.01")))

    def test_running_balance_recomputed_from_opening_matches_the_statement(self):
        # Separate-columns and Dr/Cr layouts print a balance column.
        for name, read in [("separate columns", st.read_separate_columns), ("single amount Dr/Cr", st.read_drcr)]:
            with self.subTest(layout=name):
                running = st.OPENING
                for r in read():
                    running += r.amount if r.kind == "credit" else -r.amount
                    self.assertEqual(running, r.balance, f"balance after {r.narration}")
                self.assertEqual(running, st.CLOSING)

    def test_signed_layout_debits_are_negative_in_the_file(self):
        # The signed layout must agree with the other two on direction.
        by_narration = {r.narration: r.kind for r in st.read_signed()}
        self.assertEqual(by_narration["NETFLIX SUBSCRIPTION"], "debit")
        self.assertEqual(by_narration["UPI/632912345003/AMAZON REFUND"], "credit")

    def test_the_three_layouts_agree_row_by_row(self):
        separate = st.read_separate_columns()
        drcr = st.read_drcr()
        signed = st.read_signed()
        for a, b, c in zip(separate, drcr, signed):
            self.assertEqual((a.day, a.kind, a.amount), (b.day, b.kind, b.amount))
            self.assertEqual((a.day, a.kind, a.amount), (c.day, c.kind, c.amount))

    def test_indian_digit_grouping_and_brackets_are_read_exactly(self):
        self.assertEqual(st.money("1,23,456.78"), Decimal("123456.78"))
        self.assertEqual(st.money("50,000.00"), Decimal("50000.00"))
        self.assertEqual(st.money("(500.00)"), Decimal("-500.00"))
        self.assertIsNone(st.money(""))
        with self.assertRaises(ValueError):
            st.money("12 rupees")


if __name__ == "__main__":
    unittest.main()
