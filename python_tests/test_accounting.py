"""Accounting breakdown rules, re-derived independently in Python.

CAVEAT: these tests check the approved rules against the fixture using a
separate, Python-written categoriser. They do NOT exercise the app's
classifier or accounting code, so a bug there would not fail this file.
Use them to check the fixture's figures, not the app's behaviour.

Categories are assigned here by a small, separate rule set (keyword ->
category), then the seven figures are computed with the approved rules:
  Monthly Expenses  = spending only (excludes cash withdrawals, transfers, investments)
  Monthly Earnings  = credits except Refund and Transfer
  Refunds           = Refund credits (offset spending, never income)
  Net Cash Flow     = earnings + refunds - Monthly Expenses
  Bank net movement = every credit - every debit
"""
import unittest
from decimal import Decimal

import _statements as st

ZERO = Decimal("0.00")


def category(row: st.Row) -> str:
    n = row.narration.upper()
    if row.kind == "credit":
        if "SALARY" in n:
            return "Salary"
        if "SELF TRANSFER" in n:
            return "Transfer"
        if "REFUND" in n:
            return "Refund"
        if n.startswith("INT.PD"):
            return "Interest"
        return "Other Income"
    if "ATM WDL" in n:
        return "Cash Withdrawal"
    if "TRANSFER" in n:
        return "Transfers"
    if "SIP" in n or "MUTUAL FUND" in n:
        return "Investments"
    return "Spending"


def breakdown(rows):
    total = lambda pred: sum((r.amount for r in rows if pred(r)), ZERO)
    credits = total(lambda r: r.kind == "credit")
    debits = total(lambda r: r.kind == "debit")
    cats = {r.narration: category(r) for r in rows}
    spending = total(lambda r: r.kind == "debit" and category(r) == "Spending")
    atm = total(lambda r: r.kind == "debit" and category(r) == "Cash Withdrawal")
    transfers_out = total(lambda r: r.kind == "debit" and category(r) == "Transfers")
    investments = total(lambda r: r.kind == "debit" and category(r) == "Investments")
    refunds = total(lambda r: r.kind == "credit" and category(r) == "Refund")
    transfers_in = total(lambda r: r.kind == "credit" and category(r) == "Transfer")
    earnings = credits - refunds - transfers_in
    return {
        "monthlyEarnings": earnings,
        "monthlyExpenses": spending,
        "netCashFlow": earnings + refunds - spending,
        "transfersIn": transfers_in,
        "transfersOut": transfers_out,
        "cashWithdrawals": atm,
        "investments": investments,
        "refunds": refunds,
        "bankNetChange": credits - debits,
    }


class AccountingBreakdownTests(unittest.TestCase):
    def setUp(self):
        self.b = breakdown(st.read_separate_columns())

    def test_monthly_expenses_is_spending_only(self):
        # 450 + 1200 + 2000 + 750 + 3500 + 950 + 299 = 9149 (EXPECTED.monthlyExpenses)
        self.assertEqual(self.b["monthlyExpenses"], Decimal("9149.00"))

    def test_atm_withdrawal_is_excluded_from_expenses_but_shown_separately(self):
        self.assertEqual(self.b["cashWithdrawals"], Decimal("2000.00"))

    def test_transfers_in_are_not_earnings_and_not_cash_flow(self):
        self.assertEqual(self.b["transfersIn"], Decimal("5000.00"))
        self.assertEqual(self.b["monthlyEarnings"], Decimal("57515.50"))  # EXPECTED.monthlyEarnings

    def test_refund_offsets_spending_but_is_not_income(self):
        self.assertEqual(self.b["refunds"], Decimal("500.00"))
        self.assertEqual(self.b["netCashFlow"], Decimal("48866.50"))      # EXPECTED.netCashFlow

    def test_bank_net_movement_matches_the_fixture(self):
        self.assertEqual(self.b["bankNetChange"], Decimal("51866.50"))    # EXPECTED.bankNetChange

    def test_bank_net_movement_reconciles_to_the_closing_balance(self):
        self.assertEqual(st.OPENING + self.b["bankNetChange"], st.CLOSING)

    def test_every_movement_is_accounted_for_exactly_once(self):
        # Net cash flow + transfers in - cash withdrawals - transfers out - investments
        # must equal the bank's net movement: nothing silently dropped or double counted.
        b = self.b
        reconciled = b["netCashFlow"] + b["transfersIn"] - b["cashWithdrawals"] - b["transfersOut"] - b["investments"]
        self.assertEqual(reconciled, b["bankNetChange"])

    def test_the_same_figures_come_out_of_every_layout(self):
        expected = self.b
        for read in (st.read_drcr, st.read_signed):
            self.assertEqual(breakdown(read()), expected)


if __name__ == "__main__":
    unittest.main()
