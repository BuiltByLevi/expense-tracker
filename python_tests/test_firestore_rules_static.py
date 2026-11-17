"""STATIC guard on firestore.rules. It reads the text; it does NOT evaluate the rules.

Evaluating rules (ownership isolation, denied writes, batch atomicity) needs the
Firestore emulator and is covered only by src/utils/firestoreEmulator.test.ts.
This test only catches a rule edit that obviously opens data up, such as an
allow clause with no sign-in check or a wildcard `if true`.
"""
import re
import unittest
from pathlib import Path

RULES = Path(__file__).resolve().parents[1] / "firestore.rules"
USER_COLLECTIONS = ["expenses", "income", "recurring", "statementImports", "userSettings"]


def allow_clauses(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if re.match(r"^\s*allow\s", line)]


class FirestoreRulesStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = RULES.read_text(encoding="utf-8")

    def test_no_wildcard_allow(self):
        self.assertNotRegex(self.text, r"if\s+true\s*;")

    def test_every_allow_clause_requires_a_signed_in_user(self):
        # Ownership helpers (ownsExisting / ownsNew / signedIn) are defined in terms
        # of request.auth; a clause is safe if it reaches one of them.
        guarded_helpers = [h for h in ("signedIn", "ownsExisting", "ownsNew") if re.search(rf"function {h}\(", self.text)]
        self.assertEqual(sorted(guarded_helpers), ["ownsExisting", "ownsNew", "signedIn"])
        for helper in guarded_helpers:
            body = re.search(rf"function {helper}\(\)\s*\{{ return ([^;]*);", self.text).group(1)
            self.assertIn("request.auth", body + (" signedIn()" if helper != "signedIn" else ""), helper)
        for clause in allow_clauses(self.text):
            with self.subTest(clause=clause):
                self.assertTrue(
                    any(f"{h}()" in clause or "request.auth" in clause for h in guarded_helpers),
                    f"allow clause without a sign-in or ownership check: {clause}",
                )

    def test_every_allow_clause_checks_ownership_not_only_sign_in(self):
        # Sign-in alone is not enough: a read of signedIn() would expose every user's records.
        owner_checks = ("ownsExisting()", "ownsNew()", "request.auth.uid == userId")
        for clause in allow_clauses(self.text):
            with self.subTest(clause=clause):
                self.assertTrue(any(c in clause for c in owner_checks), f"no ownership check: {clause}")

    def test_amount_validation_keeps_both_bounds(self):
        body = re.search(r"function validAmount\(v\)\s*\{ return ([^;]*);", self.text).group(1)
        self.assertIn("v is number", body)
        self.assertIn("v >= 0", body)
        self.assertRegex(body, r"v < \d+")

    def test_every_user_collection_is_declared(self):
        for name in USER_COLLECTIONS:
            with self.subTest(collection=name):
                self.assertRegex(self.text, rf"match\s+/{name}/\{{")

    def test_expense_and_income_creates_require_ownership_and_valid_fields(self):
        for name in ["expenses", "income"]:
            block = re.search(rf"match /{name}/\{{[^}}]*\}}\s*\{{(.*?)\n    \}}", self.text, re.S)
            self.assertIsNotNone(block, name)
            create = re.search(r"allow create:[^;]*;", block.group(1))
            self.assertIn("ownsNew()", create.group(0))
            self.assertIn("validTransaction(request.resource.data)", create.group(0))

    def test_updates_cannot_move_a_record_to_another_owner(self):
        for name in ["expenses", "income", "recurring"]:
            block = re.search(rf"match /{name}/\{{[^}}]*\}}\s*\{{(.*?)\n    \}}", self.text, re.S)
            update = re.search(r"allow update:[^;]*;", block.group(1))
            self.assertIn("ownerUnchanged()", update.group(0), name)


if __name__ == "__main__":
    unittest.main()
