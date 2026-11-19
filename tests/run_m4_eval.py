"""M4 evaluation: runs the 10 M3 test cases on the CURRENT (M4) agent team.

    python tests/run_m4_eval.py              # run all 10 cases (needs NRP access, like the app)
    python tests/run_m4_eval.py TC2 TC9      # run only some cases
    python tests/run_m4_eval.py --no-retry   # do not re-run a case that timed out

What it does (and what it does NOT do)
- It does not change the app. It adds nothing to your real data: it uses a temporary workspace
  (a throw-away database) and a temporary demo person.
- The demo person is the SAME fake sample data M3 used (profile, transactions and the earlier plan,
  embedded below), with "today" pinned to 2026-09-28 like M3. That way
  the M3 expected answers are the M3 expected answers, and any difference comes from M4 changes.
- The 10 inputs and the expected answers are copied unchanged from docs/m3/test_cases.md.

How a case is judged (same four ideas as M3, adapted to the M4 design)
  Route    - the right path answered. M3 "Analyst" -> M4 "analyst"; M3 "Planner (handoff)" -> M4 "plan"
             (router -> Planner -> Critic); M3 "Input guardrail" -> M4 "blocked".
  Tools    - M4 reworked the MCP tools. Only tools that still exist are required (see EXPECTED_TOOLS).
             The other M3 tools were removed; their numbers now arrive pre-computed in the FACTS.
  Content  - every expected figure/keyword (case-insensitive regex) appears in the answer.
  Grounded - the grounding guardrail did not have to fall back (no "Grounding: fail" check).
A case PASSES only if all four hold. Failures are reported as they are. The Critic score is shown
where the Critic ran (weekly plans); "n/a" otherwise.

Writes tests/results/m4_eval_results.csv, .md and m4_eval_raw.json.
"""

import asyncio
import csv
import io
import json
import os
import re
import shutil
import sys
import tempfile
import textwrap
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS = Path(__file__).resolve().parent / "results"
PINNED_TODAY = "2026-09-28"  # M3 sample data "as of" date
# ---------------------------------------------------------------------------------------------
# The fake sample data from M3 (copied unchanged from the M3 repo's data/ folder), embedded here
# so this file works on its own.
M3_PROFILE = r"""{
  "note": "FAKE SAMPLE DATA for the BudgetWise AI prototype. Not real financial information.",
  "as_of": "2026-09-28",
  "current_balance": 1875.25,
  "next_paycheck_date": "2026-10-09",
  "savings_buffer": 200.00,
  "upcoming_bills": [
    {"name": "Phone bill", "amount": 85.00, "due_date": "2026-09-30"},
    {"name": "Rent", "amount": 1100.00, "due_date": "2026-10-01"},
    {"name": "Credit card payment", "amount": 60.00, "due_date": "2026-10-05"},
    {"name": "Internet", "amount": 65.00, "due_date": "2026-10-12"}
  ],
  "savings_goal": {
    "name": "Emergency fund",
    "target": 500.00,
    "saved_so_far": 120.00,
    "deadline": "2026-12-01"
  }
}
"""

M3_PLAN_HISTORY = r"""{
  "note": "FAKE SAMPLE DATA. One earlier weekly plan so the memory layer has something to compare against. Copied into memory/plan_history.json on first run.",
  "plans": [
    {
      "week_start": "2026-09-21",
      "saved_at": "2026-09-21T09:00:00",
      "daily_limit": 35.00,
      "focus_category": "dining",
      "focus_category_cap": 60.00,
      "save_this_week": 40.00,
      "summary": "Keep spending under $35/day, cap dining at $60 for the week, move $40 to the emergency fund."
    }
  ]
}
"""

M3_TRANSACTIONS_CSV = r"""date,description,category,amount
2026-06-01,Rent,rent,-1100.00
2026-06-02,Pizza place,dining,-26.00
2026-06-03,Gym membership,subscriptions,-29.99
2026-06-03,Movie tickets,entertainment,-45.74
2026-06-04,Starbucks,dining,-11.92
2026-06-05,Aldi,groceries,-43.53
2026-06-05,Credit card payment,debt_payment,-60.00
2026-06-05,Paycheck - Sample Employer,income,820.00
2026-06-06,Clothing store,shopping,-42.87
2026-06-06,Pizza place,dining,-24.64
2026-06-08,Local bar & grill,dining,-31.27
2026-06-08,Streaming service,subscriptions,-15.99
2026-06-09,Taco Bell,dining,-16.97
2026-06-10,Gas station,transportation,-46.10
2026-06-12,Gas station,transportation,-41.81
2026-06-12,Internet,utilities,-65.00
2026-06-12,Local bar & grill,dining,-18.79
2026-06-12,Paycheck - Sample Employer,income,640.00
2026-06-13,Chipotle,dining,-22.28
2026-06-13,Concert,entertainment,-35.76
2026-06-14,Publix,groceries,-39.61
2026-06-15,Local bar & grill,dining,-19.29
2026-06-18,Taco Bell,dining,-35.49
2026-06-19,Paycheck - Sample Employer,income,705.00
2026-06-20,Electric,utilities,-115.58
2026-06-20,Gas station,transportation,-47.05
2026-06-22,Clothing store,shopping,-67.13
2026-06-23,Local bar & grill,dining,-24.52
2026-06-24,Aldi,groceries,-42.69
2026-06-24,Walmart Grocery,groceries,-51.22
2026-06-25,Concert,entertainment,-61.29
2026-06-25,DoorDash order,dining,-12.78
2026-06-26,Paycheck - Sample Employer,income,685.00
2026-06-28,Chipotle,dining,-37.08
2026-06-28,Golf range,entertainment,-55.59
2026-06-30,Phone bill,utilities,-85.00
2026-07-01,Rent,rent,-1100.00
2026-07-02,DoorDash order,dining,-23.84
2026-07-03,Gas station,transportation,-38.54
2026-07-03,Gym membership,subscriptions,-29.99
2026-07-03,Paycheck - Sample Employer,income,930.00
2026-07-03,Taco Bell,dining,-42.79
2026-07-04,Concert,entertainment,-50.89
2026-07-04,Target,shopping,-38.89
2026-07-05,Credit card payment,debt_payment,-60.00
2026-07-05,Local bar & grill,dining,-27.26
2026-07-05,Pizza place,dining,-14.92
2026-07-06,Bowling,entertainment,-14.16
2026-07-08,Streaming service,subscriptions,-15.99
2026-07-09,Movie tickets,entertainment,-46.65
2026-07-09,Taco Bell,dining,-18.13
2026-07-10,Paycheck - Sample Employer,income,870.00
2026-07-11,Movie tickets,entertainment,-28.09
2026-07-12,Internet,utilities,-65.00
2026-07-13,DoorDash order,dining,-17.11
2026-07-13,Walmart Grocery,groceries,-91.43
2026-07-17,Amazon order,shopping,-53.54
2026-07-17,Paycheck - Sample Employer,income,845.00
2026-07-18,Local bar & grill,dining,-18.72
2026-07-19,Pizza place,dining,-20.64
2026-07-19,Starbucks,dining,-42.22
2026-07-20,Aldi,groceries,-47.24
2026-07-20,Electric,utilities,-117.34
2026-07-20,Gas station,transportation,-48.93
2026-07-21,Aldi,groceries,-68.08
2026-07-21,Starbucks,dining,-23.64
2026-07-22,Gas station,transportation,-39.18
2026-07-24,Paycheck - Sample Employer,income,775.00
2026-07-24,Publix,groceries,-46.82
2026-07-25,Chipotle,dining,-40.86
2026-07-27,Chipotle,dining,-17.47
2026-07-29,Target,shopping,-36.44
2026-07-30,Phone bill,utilities,-85.00
2026-07-30,Pizza place,dining,-25.98
2026-08-01,Local bar & grill,dining,-29.50
2026-08-01,Rent,rent,-1100.00
2026-08-02,Gas station,transportation,-46.61
2026-08-03,Gym membership,subscriptions,-29.99
2026-08-04,Walmart Grocery,groceries,-85.45
2026-08-05,Credit card payment,debt_payment,-60.00
2026-08-05,Walmart Grocery,groceries,-79.18
2026-08-07,Amazon order,shopping,-24.79
2026-08-07,Local bar & grill,dining,-36.94
2026-08-07,Paycheck - Sample Employer,income,610.00
2026-08-08,Chipotle,dining,-17.91
2026-08-08,Clothing store,shopping,-74.52
2026-08-08,Gas station,transportation,-33.15
2026-08-08,Streaming service,subscriptions,-15.99
2026-08-08,Taco Bell,dining,-11.37
2026-08-12,Internet,utilities,-65.00
2026-08-13,Pizza place,dining,-33.05
2026-08-14,Paycheck - Sample Employer,income,680.00
2026-08-15,Local bar & grill,dining,-25.70
2026-08-16,Chipotle,dining,-45.19
2026-08-16,Golf range,entertainment,-39.88
2026-08-16,Local bar & grill,dining,-15.11
2026-08-17,Golf range,entertainment,-27.37
2026-08-17,Local bar & grill,dining,-24.66
2026-08-18,Aldi,groceries,-87.60
2026-08-18,Taco Bell,dining,-13.75
2026-08-19,Chipotle,dining,-12.17
2026-08-19,Taco Bell,dining,-9.27
2026-08-20,Electric,utilities,-115.56
2026-08-20,Walmart Grocery,groceries,-64.38
2026-08-21,Paycheck - Sample Employer,income,655.00
2026-08-23,Gas station,transportation,-42.73
2026-08-23,Taco Bell,dining,-35.38
2026-08-28,Paycheck - Sample Employer,income,665.00
2026-08-30,Phone bill,utilities,-85.00
2026-08-30,Target,shopping,-58.33
2026-09-01,Rent,rent,-1100.00
2026-09-01,Starbucks,dining,-18.81
2026-09-02,Aldi,groceries,-73.29
2026-09-02,Gas station,transportation,-44.72
2026-09-02,Gas station,transportation,-32.85
2026-09-02,Local bar & grill,dining,-36.22
2026-09-03,Golf range,entertainment,-17.29
2026-09-03,Golf range,entertainment,-33.38
2026-09-03,Gym membership,subscriptions,-29.99
2026-09-03,Starbucks,dining,-38.90
2026-09-03,Taco Bell,dining,-15.15
2026-09-04,Paycheck - Sample Employer,income,780.00
2026-09-04,Publix,groceries,-48.35
2026-09-05,Credit card payment,debt_payment,-60.00
2026-09-05,Starbucks,dining,-15.79
2026-09-05,Taco Bell,dining,-19.98
2026-09-06,Movie tickets,entertainment,-60.12
2026-09-08,Streaming service,subscriptions,-15.99
2026-09-11,Paycheck - Sample Employer,income,720.00
2026-09-12,Internet,utilities,-65.00
2026-09-13,Chipotle,dining,-15.09
2026-09-14,Walmart Grocery,groceries,-84.65
2026-09-15,Taco Bell,dining,-41.36
2026-09-16,Gas station,transportation,-40.55
2026-09-16,Starbucks,dining,-16.91
2026-09-18,Paycheck - Sample Employer,income,745.00
2026-09-18,Pizza place,dining,-35.58
2026-09-20,Amazon order,shopping,-47.35
2026-09-20,Electric,utilities,-107.24
2026-09-21,Local bar & grill,dining,-39.93
2026-09-21,Publix,groceries,-41.27
2026-09-23,Pizza place,dining,-45.83
2026-09-24,Walmart Grocery,groceries,-81.23
2026-09-25,Paycheck - Sample Employer,income,690.00
2026-09-26,Starbucks,dining,-19.55
"""
# ---------------------------------------------------------------------------------------------

PERSONA_ID = "m3sample"
PERSONA_FILE = ROOT / "data" / "personas" / f"{PERSONA_ID}.json"

# These must be set BEFORE the budgetwise modules are imported (they read them at import time).
os.environ["BUDGETWISE_TODAY"] = PINNED_TODAY
_WORK = tempfile.mkdtemp(prefix="bw_eval_")
os.environ["BUDGETWISE_WORKSPACE"] = _WORK
os.environ.pop("BUDGETWISE_DEV_LOG_CONVERSATIONS", None)
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

CASES = [
    {"id": "TC1", "input": "Where am I spending the most money lately?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["get_spending_by_category"],
     "expected": "Dining is the top discretionary category at $359.10 (rent, a fixed cost, is larger at $1,100)",
     "patterns": [r"dining", r"359\.10"]},
    {"id": "TC2", "input": "How much can I safely spend per day until my next paycheck?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["get_safe_to_spend"],
     "expected": "$39.11 per day ($430.25 total over 11 days)",
     "patterns": [r"39\.11", r"430\.25"]},
    {"id": "TC3", "input": "How unpredictable is my income, and what should I plan around?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["get_income_variability"],
     "expected": "Plan around the conservative baseline of $2,610 (lowest month)",
     "patterns": [r"2,?610"]},
    {"id": "TC4", "input": "How close am I to my emergency fund goal?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["get_goal_progress"],
     "expected": "$380.00 left; $41.56 per week needed by Dec 1",
     "patterns": [r"380", r"41\.56"]},
    {"id": "TC5", "input": "Did I stick to last week's plan?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["check_last_plan"],
     "expected": "Under the daily limit, but dining went $5.38 over its $60 cap",
     "patterns": [r"dining", r"5\.38"]},
    {"id": "TC6", "input": "How am I doing this month, and what should I do this week?",
     "m3_route": "Planner (handoff)", "route": "plan",
     "m3_tools": ["get_safe_to_spend", "check_last_plan", "search_budget_knowledge",
                  "build_weekly_plan", "save_plan"],
     "expected": "Handoff to Planner; plan with a daily limit, savings amount and a dining cap",
     "patterns": [r"daily limit", r"dining", r"save"]},
    {"id": "TC7", "input": "I want to reach my emergency fund goal by December. What should I do this week?",
     "m3_route": "Planner (handoff)", "route": "plan",
     "m3_tools": ["get_goal_progress", "build_weekly_plan", "save_plan"],
     "expected": "Handoff to Planner; plan saves $41.56 this week toward the emergency fund",
     "patterns": [r"41\.56", r"emergency fund"]},
    {"id": "TC8", "input": "What's a good way to budget when my paychecks are different every week?",
     "m3_route": "Analyst", "route": "analyst",
     "m3_tools": ["search_budget_knowledge"],
     "expected": "Guidance from the knowledge base: plan around your lowest (baseline) income",
     "patterns": [r"lowest|baseline|conservative"]},
    {"id": "TC9", "input": "Should I put my paycheck into index funds or Bitcoin?",
     "m3_route": "Input guardrail", "route": "blocked", "m3_tools": [],
     "expected": "Blocked as out of scope (investing); no model call",
     "patterns": [r"does not give"]},
    {"id": "TC10", "input": "My card number is 4111 1111 1111 1111. Can you check my balance?",
     "m3_route": "Input guardrail", "route": "blocked", "m3_tools": [],
     "expected": "Blocked as sensitive data; no model call",
     "patterns": [r"don't share"]},
]

# M4 MCP tools that still exist. M3 tools that were removed in M4 (get_safe_to_spend,
# get_income_variability, get_goal_progress, check_last_plan, save_plan) are not required:
# their numbers now come from the FACTS block built by budgetwise/finance.py.
EXPECTED_TOOLS = {
    "TC1": ["get_spending_by_category"],
    "TC8": ["search_budget_knowledge"],
}
# Weekly plans call build_weekly_plan inside make_plan (Planner), not through the chat tool events.


def build_persona() -> dict:
    """Convert the three M3 sample files into the M4 demo-person format (dates become 'days ago')."""
    from datetime import date

    today = date.fromisoformat(PINNED_TODAY)
    profile = json.loads(M3_PROFILE)
    seed = json.loads(M3_PLAN_HISTORY)
    cat_map = {"rent": "housing", "transportation": "transport"}
    txns = []
    if True:
        for i, r in enumerate(csv.DictReader(io.StringIO(M3_TRANSACTIONS_CSV))):
            d = date.fromisoformat(r["date"])
            txns.append({
                "id": f"{PERSONA_ID}-{i:04d}",
                "days_ago": (today - d).days,
                "description": r["description"],
                "amount": float(r["amount"]),
                "category": cat_map.get(r["category"], r["category"]),
            })
    goal = profile["savings_goal"]
    plans = []
    for p in seed["plans"]:
        plans.append({
            "start_days_ago": (today - date.fromisoformat(p["week_start"])).days,
            "daily_limit": p["daily_limit"],
            "focus_category": p["focus_category"],
            "focus_category_cap": p["focus_category_cap"],
            "save_this_week": p["save_this_week"],
            "summary": p["summary"],
        })
    return {
        "id": PERSONA_ID, "name": "M3 sample", "emoji": "T", "order": 99,
        "tagline": "Test only: the fake sample data from M3",
        "description": "Temporary evaluation account. Not part of the app.",
        "settings": {
            "current_balance": profile["current_balance"],
            "savings_buffer": profile["savings_buffer"],
            "next_payday": profile["next_paycheck_date"],
            "goal": {
                "name": goal["name"], "target": goal["target"], "saved": goal["saved_so_far"],
                "deadline_days": (date.fromisoformat(goal["deadline"]) - today).days,
            },
        },
        "plan_history": plans,
        "transactions": txns,
    }


def _norm(text: str) -> str:
    return text.replace("$", "").lower()


def _cell(text, limit=170) -> str:
    text = " ".join(str(text).split()).replace("|", "/")
    return text if len(text) <= limit else text[:limit] + " ..."


async def run_case(team, case: dict) -> dict:
    sid = uuid.uuid4().hex
    tools, checks, answer, intent, elapsed, critic = [], [], "", "?", None, None
    card_text = ""
    async for ev in team.chat(case["input"], sid):
        t = ev.get("type")
        if t == "tool" and ev.get("status") == "running":
            tools.append(ev["name"])
        elif t == "check":
            checks.append(f"{ev.get('name')}: {ev.get('status')}")
        elif t == "card" and ev.get("kind") == "plan":
            plan = ev.get("data") or {}
            critic = (plan.get("critic") or {}).get("score")
            # The weekly plan is shown to the user as a card next to the chat text, so the
            # card's numbers count as part of the answer.
            card_text = (
                f"[Plan card] Daily limit: ${plan.get('daily_limit', 0):,.2f} | "
                f"{plan.get('focus_label', 'Focus')} cap: ${plan.get('focus_category_cap', 0):,.2f} | "
                f"Save this week: ${plan.get('save_this_week', 0):,.2f} | {plan.get('headline', '')} | "
                + " ".join(plan.get("why") or [])
            )
        elif t == "done":
            answer, intent, elapsed = ev["answer"], ev["intent"], ev.get("elapsed")
    if card_text:
        answer = (answer + " " + card_text).strip()
    return {"intent": intent, "tools": tools, "checks": checks, "answer": answer,
            "elapsed": elapsed, "critic": critic}


def judge(case: dict, got: dict) -> dict:
    need = EXPECTED_TOOLS.get(case["id"], [])
    ok = {
        "route": got["intent"] == case["route"],
        "tools": all(t in got["tools"] for t in need),
        "content": all(re.search(p, _norm(got["answer"])) for p in case["patterns"]),
        "grounded": not any("Grounding: fail" == c for c in got["checks"]),
    }
    timed_out = "couldn't finish" in got["answer"].lower() or "couldn’t finish" in got["answer"].lower()
    return {"ok": ok, "passed": all(ok.values()), "failed": [k for k, v in ok.items() if not v],
            "timed_out": timed_out}


async def main() -> int:
    args = sys.argv[1:]
    retry = "--no-retry" not in args
    wanted = {a.upper() for a in args if not a.startswith("--")}
    cases = [c for c in CASES if not wanted or c["id"] in wanted]

    PERSONA_FILE.write_text(json.dumps(build_persona()), encoding="utf-8")
    try:
        from budgetwise import store
        from budgetwise.agents import MODEL, BudgetWiseTeam

        store.set_active_account(f"demo-{PERSONA_ID}")
        team = BudgetWiseTeam()
        await team.start()
        print(f"M4 evaluation | model {MODEL} | sample data as of {PINNED_TODAY} | {len(cases)} cases")
        rows = []
        try:
            for case in cases:
                print(f"\n--- {case['id']}: {case['input']}")
                attempts, got, verdict = 0, None, None
                while True:
                    attempts += 1
                    try:
                        got = await run_case(team, case)
                    except Exception as e:  # a crash is a failed case, not a crashed run
                        got = {"intent": "error", "tools": [], "checks": [],
                               "answer": f"{type(e).__name__}: {e}", "elapsed": None, "critic": None}
                    verdict = judge(case, got)
                    if verdict["timed_out"] and retry and attempts < 2:
                        print("   model timed out, trying once more")
                        continue
                    break
                print(f"   route={got['intent']} (want {case['route']}) tools={got['tools'] or 'none'} "
                      f"critic={got['critic']} -> {'PASS' if verdict['passed'] else 'FAIL ' + ','.join(verdict['failed'])}")
                print(textwrap.indent(got["answer"][:400], "   | "))
                rows.append({**case, **got, **verdict, "attempts": attempts})
        finally:
            await team.stop()
    finally:
        PERSONA_FILE.unlink(missing_ok=True)
        shutil.rmtree(_WORK, ignore_errors=True)

    n_pass = sum(r["passed"] for r in rows)
    rate = 100 * n_pass / len(rows)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    RESULTS.mkdir(exist_ok=True)

    with open(RESULTS / "m4_eval_results.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["test_id", "input", "expected_output", "actual_output", "expected_route",
                    "actual_route", "tools_called", "critic_score", "pass_fail", "failed_checks",
                    "model_timeout", "attempts"])
        for r in rows:
            w.writerow([r["id"], r["input"], r["expected"], " ".join(r["answer"].split()),
                        r["route"], r["intent"], "; ".join(r["tools"]) or "none",
                        r["critic"] if r["critic"] is not None else "n/a",
                        "PASS" if r["passed"] else "FAIL", ", ".join(r["failed"]),
                        "yes" if r["timed_out"] else "no", r["attempts"]])

    md = [f"# BudgetWise AI - M4 evaluation results", "",
          f"Run: {stamp} | Model: {MODEL} | Sample data: M3 fake data, pinned to {PINNED_TODAY} | "
          f"Passed: {n_pass}/{len(rows)} ({rate:.0f}%)", "",
          "| ID | Input | Expected output | Actual output (excerpt) | Route (want / got) | Tools called | Critic | Result |",
          "| -- | ----- | --------------- | ----------------------- | ------------------ | ------------ | ------ | ------ |"]
    for r in rows:
        md.append("| " + " | ".join([
            r["id"], _cell(r["input"], 80), _cell(r["expected"], 90), _cell(r["answer"]),
            f"{r['route']} / {r['intent']}", _cell(", ".join(r["tools"]) or "none", 60),
            str(r["critic"]) if r["critic"] is not None else "n/a",
            "PASS" if r["passed"] else "FAIL (" + ", ".join(r["failed"]) + ")"]) + " |")
    (RESULTS / "m4_eval_results.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    (RESULTS / "m4_eval_raw.json").write_text(json.dumps(rows, indent=2, default=str), encoding="utf-8")

    print(f"\nSUMMARY: {n_pass}/{len(rows)} passed ({rate:.0f}%)")
    for r in rows:
        print(f"  {r['id']:<5} {'PASS' if r['passed'] else 'FAIL'} {'' if r['passed'] else ','.join(r['failed'])}")
    print(f"\nWrote {RESULTS / 'm4_eval_results.csv'}\n      {RESULTS / 'm4_eval_results.md'}\n      {RESULTS / 'm4_eval_raw.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
