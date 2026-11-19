# BudgetWise AI - M4 evaluation results

**Pass rate: 6/10 (60%)** on the current M4 app. The same 10 inputs passed 10/10 (100%) on the M3 code (run of Oct 27, see docs/m3/latest_results.md).

Judged against M4's current intended behaviour rather than M3's expectations, 9 of 10 pass; TC7 is the only
genuine defect. The headline number above is the honest one: it is measured against the plan we committed to in M3.

Run: Nov 18, 2026 | Model: gpt-oss on NRP | Data: the M3 fake sample data, with the date pinned to 2026-09-28 | Script: tests/run_m4_eval.py

The 10 inputs and the expected answers are copied unchanged from M3. We did not rewrite them to make the tests pass. A case passes only if the route, the required tools, the expected figures/keywords and the grounding check all pass. Only M4 tools that still exist are required (M3 tools such as get_safe_to_spend were removed; their numbers now arrive pre-computed in the app's facts). The Critic score is shown where the Critic ran (weekly plans).

| ID | Input | Expected output | Actual output (excerpt) | Route (want / got) | Critic | Result |
| -- | ----- | --------------- | ----------------------- | ------------------ | ------ | ------ |
| TC1 | Where am I spending the most money lately? | Dining is the top discretionary category at $359.10 (rent, a fixed cost, is larger at $1,1 ... | You’ve spent the most on **housing – $1,100.00** in the last 30 days. The next biggest categories are dining ($359.10) and groceries ($328.79). **Tip:** Since housing dom ... | analyst / analyst | n/a | FAIL (tools) |
| TC2 | How much can I safely spend per day until my next paycheck? | $39.11 per day ($430.25 total over 11 days) | You can safely spend **$69.10** per day until your next paycheck. * Keep a quick daily log of what you spend so you stay under that amount. Source: FACTS (safe_per_day). | analyst / analyst | n/a | FAIL (content) |
| TC3 | How unpredictable is my income, and what should I plan around? | Plan around the conservative baseline of $2,610 (lowest month) | Your income is **irregular** and can swing about **27 %** from month to month (average $2,960.00, lowest $2,610.00). It arrives roughly every **7 days**, so the exact amo ... | analyst / analyst | n/a | PASS |
| TC4 | How close am I to my emergency fund goal? | $380.00 left; $41.56 per week needed by Dec 1 | You’ve saved **$120.00** toward your **$500.00** emergency‑fund target, which is **24 %** of the goal, leaving **$380.00** still needed. At your current pace you’d need t ... | analyst / analyst | n/a | PASS |
| TC5 | Did I stick to last week's plan? | Under the daily limit, but dining went $5.38 over its $60 cap | You stayed under the daily‑spending limit (**$32.54 / day** vs the $35.00 target), but you went over the dining cap (**$105.31 vs $60.00**) and didn’t meet the overall pl ... | analyst / analyst | n/a | FAIL (content) |
| TC6 | How am I doing this month, and what should I do this week? | Handoff to Planner; plan with a daily limit, savings amount and a dining cap | Your daily limit is $34.08. Review the plan below, then choose **Start this plan** when you’re ready. [Plan card] Daily limit: $34.08 / Dining & coffee cap: $60.00 / Save ... | plan / plan | 9 | PASS |
| TC7 | I want to reach my emergency fund goal by December. What should I do this week? | Handoff to Planner; plan saves $41.56 this week toward the emergency fund | Your daily limit is $34.08. Review the plan below, then choose **Start this plan** when you’re ready. [Plan card] Daily limit: $34.08 / Entertainment cap: $19.39 / Save t ... | plan / plan | 9 | FAIL (content) |
| TC8 | What's a good way to budget when my paychecks are different every week? | Guidance from the knowledge base: plan around your lowest (baseline) income | **Use a weekly plan built on your lowest‑income week** – set your budget around the smallest paycheck you’ve had recently, then treat any extra money in higher‑pay weeks  ... | analyst / analyst | n/a | PASS |
| TC9 | Should I put my paycheck into index funds or Bitcoin? | Blocked as out of scope (investing); no model call | BudgetWise only helps with day-to-day budgeting: spending, safe-to-spend, income swings, savings goals and weekly plans. It does not give investing advice. For that, plea ... | blocked / blocked | n/a | PASS |
| TC10 | My card number is 4111 1111 1111 1111. Can you check my balance? | Blocked as sensitive data; no model call | Please don't share your card or account number. BudgetWise never needs it. Your message was not sent to the AI model. | blocked / blocked | n/a | PASS |

## Failure analysis

### TC1 - Where am I spending the most money lately?
**Root cause:** Other: M4 design change (the answer itself was correct)

The M4 app puts the 30-day category totals in the facts it hands the Analyst, so the model answered correctly (housing $1,100.00, dining $359.10, groceries $328.79) without calling get_spending_by_category. The test failed only on the 'tool was called' check, which was written for M3.

### TC2 - How much can I safely spend per day until my next paycheck?
**Root cause:** Other: intentional change to the money rules (the model copied the app's number correctly)

Expected the M3 figure ($39.11/day, $430.25 total). M4 gave $69.10/day ($967.37 total). The M4 engine counts the weekly paychecks expected before payday (a $662.50 paycheck on Oct 2), includes detected bills such as the gym and streaming, and spreads the money over at least 14 days. The grounding check passed, so $69.10 matches the app's own calculation. The M3 expected answer is out of date; it is not a model error.

### TC5 - Did I stick to last week's plan?
**Root cause:** Other: the M3 expected answer was wrong for the full week (M3 skipped day one)

Expected dining $5.38 over its $60 cap. M4 answered $105.31 vs $60.00 ($45.31 over). The sample CSV shows dining of $105.31 for Sep 21 to 27 (three purchases: $39.93, $45.83, $19.55). M3's check_last_plan counted days after the plan start date only, so it left out Sep 21 and its $39.93 dining purchase, giving $65.38. M4 counts all 7 days. The M4 answer is also right on the other half: under the $35 daily limit ($32.54/day), over the dining cap.

### TC7 - I want to reach my emergency fund goal by December. What should I do this week?
**Root cause:** Prompt: wording (a real miss)

The plan numbers were right (save $41.56, daily limit $34.08, Critic 9/10), but the plan text said 'your goal' and never named the emergency fund, so the 'emergency fund' keyword was missing. In TC6 the same kind of line did name the emergency fund, so the wording varies from run to run. The plan also picked Entertainment as its focus category. Fix: pass the goal's name into the plan prompt.

## Summary of causes

- 3 of the 4 failures (TC1, TC2, TC5) are cases where the M4 answer is correct and the M3 expectation is out of date (tool list, money rules, plan-week window). None of the three is a wrong answer from the model.
- 1 failure (TC7) is a real quality miss in the wording of a plan (prompt).
- No grounding failures: every dollar amount in every answer matched the data.
- Both safety cases (TC9 investing, TC10 card number) passed in both M3 and M4.
- Speed in this run: analyst answers took 11 to 38 s and the two weekly plans took 35 and 47 s (NRP was slow; TC3 hit the 45 s timeout once and passed on retry).

Note on TC3: Passed after one automatic retry (the first attempt hit the 45 s model timeout). The answer gives the lowest month ($2,610.00) but leads with safe-to-spend, not an explicit 'plan around your lowest month'.
