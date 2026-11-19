# BudgetWise AI (Team 3, CEN 4930 M4)

**Problem:** People with irregular income—students, part-time and gig workers, and freelancers—can see their balance, but often cannot tell what is safe to spend, how to reach a savings goal, or what to change this week.

**BudgetWise AI** is a goal-centered budgeting assistant that remembers and organizes what a user shares. A user can type naturally—"I spent about $20 on food," "rent is $900 on the first," or "I get paid every two weeks but it changes"—or import a bank CSV. BudgetWise tracks income, spending, bills, balances, and goals; then produces grounded advice, safe-to-spend guidance, and practical weekly plans. Users can start with very little information and add or correct details whenever they want.

The AI is used for language understanding, personalized explanations, planning strategy, and categorizing unfamiliar merchants. **Deterministic Python code calculates every dollar amount**, and SQLite preserves the user's financial picture across visits. That makes BudgetWise more useful than a one-off chatbot conversation: it maintains a structured, correctable workspace and updates its guidance as the user's real situation changes.

> New to the project? Read the short [M4 project overview](docs/PROJECT_OVERVIEW.md), then use
> [AGENTS.md](AGENTS.md) for detailed engineering rules and [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)
> for the course requirements.

## What you can do

- **Tell it in plain words.** For example: "spent like $40 the last couple days on gas", "I made $300 in tips this week", "rent is $725 on the 1st", "I have $410 right now" or "that was groceries actually". The Bookkeeper agent saves and organizes it, shows exactly what it saved, and **Undo** removes it with one tap.
- **Keep one useful available-money estimate.** BudgetWise asks whether a purchase came from that pool, a credit card, or somewhere else. Credit-card and cash activity still count toward spending patterns but do not silently change the available-money number. A transaction dated before the latest balance check is not counted twice.
- **Stay on track with light weekly check-ins.** About once a week, BudgetWise can confirm the available-money estimate and ask how much was added toward the active goal. It updates the remaining weekly pace instead of restarting setup.
- **Start with as much or as little as you want.** The guided conversation asks one useful question at a time, but every question can be skipped. Once there is enough context, it stops setup and invites the user to log activity or ask for advice.
- **See what's safe to spend today.** BudgetWise checks the next 30 days of conservative pay, recurring bills, usual living costs and your cushion, then spreads today's amount across at least two weeks. The "runway" shows upcoming bills and paychecks.
- **Ask for useful advice.** For example: "Can I afford a $60 dinner on Friday?", "Where did my money go this month?", or "Will I run short before payday?" Every amount is checked against saved data and Python calculations before it is shown.
- **Get a weekly plan.** It sets a daily limit, a cap on one category and an amount to save. The Critic agent reviews the plan, and nothing is saved until you click **Start this plan**. Next week, BudgetWise checks how it went.
- **Upload your bank's CSV for exact numbers.** It reads exports from Chase, Bank of America, Capital One, Wells Fargo and most others. Upload a new file each week into the same account: rows it already has are skipped, and your estimates for those dates are replaced by the exact bank rows. Bills and paydays are detected, and anything you told BudgetWise takes priority. Your data stays on your computer.
- **Try examples without mixing data.** **Maya** (student barista), **Jordan** (rideshare driver), and **Priya** (freelance designer) each have a separate fake workspace showing consistent use.

## How it works

![BudgetWise AI agent architecture](docs/architecture.png)

_Source: [`docs/architecture.html`](docs/architecture.html) — open it in a browser and screenshot at 1520x950 to regenerate._

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete request flow, module map, data boundaries, and updated M4 diagram.

| Agent           | Job                                                                                                      | Pattern (chapter)                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Analyst**     | Answers money questions using the facts and MCP tools                                                    | ReAct (Ch 5)                                                            |
| **Planner**     | Chooses this week's strategy; the `build_weekly_plan` tool does the math                                 | Chain of thought (Ch 5)                                                 |
| **Critic**      | Scores each plan for grounding, realism and clear actions, and sends weak plans back once                | Critic agent (Ch 7)                                                     |
| **Bookkeeper**  | Turns plain words into saved records: spending, income, bills, pay schedule, balance, goals, corrections | Tool use with function tools (Ch 2), human in the loop with Undo (Ch 8) |
| **Categorizer** | Labels bank descriptions that no keyword rule matches, in one batch                                      | Typed JSON output (Ch 2)                                                |

### How BudgetWise follows the course

| Course idea                                                     | Where it is in BudgetWise                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tools in an MCP server (Ch 3)                                   | `mcp_server.py`: 6 tools, started once at app startup over stdio                                                                                                                                                                   |
| Multi-agent orchestration, deterministic decision points (Ch 4) | `budgetwise/agents.py`: the router is code, so it adds no model call and always behaves the same way                                                                                                                               |
| Guardrails and the cost ladder (Ch 4)                           | `guardrails.py`: free checks first (scope, privacy, prompt injection, grounding). The Critic is the only LLM check                                                                                                                 |
| ReAct and chain of thought (Ch 5)                               | Analyst and Planner instructions                                                                                                                                                                                                   |
| RAG and memory (Ch 6)                                           | ChromaDB guides (`knowledge/`), short-term chat memory, and long-term memory in SQLite (what you told it, saved plans)                                                                                                             |
| Grounding and critic evaluation (Ch 7)                          | Every dollar amount is verified, and plans get a 1-10 critic score                                                                                                                                                                 |
| Hosting agents behind an API, streamed with SSE (Ch 8)          | `app.py`, following the `chapter_08/01z` pattern                                                                                                                                                                                   |
| Human in the loop, allowlists, identity, secrets (Ch 8)         | Plans are saved only when you click Start, and every Bookkeeper save can be undone. Each agent sees only its own tools. The Bookkeeper's tools get the account from the app, never from the model. The API key stays on the server |

## Setup and run

> These setup helpers and commands are written and tested for **Windows PowerShell**. Mac and Linux users can still run the Python application, but should create and activate their virtual environment using their platform's normal commands.

### Windows quick start

Requirements: **Git**, **Python 3.11 or newer** (Python 3.12 is recommended), an internet connection for the first setup, and an NRP API key from the instructor. Node is not required unless you are editing the React interface.

1. Clone the M4 branch and enter the project:

   ```powershell
   git clone --branch m4-upgrade --single-branch https://github.com/erFig/TeamProject3_M4.git
   cd TeamProject3_M4
   ```

2. Run the Windows setup helper. It creates `venv`, installs Python packages, and copies `.env.example` to `.env` without overwriting an existing file:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\setup_windows.ps1
   ```

3. Open `.env` and replace `your_nrp_api_key_here` with your own NRP key:

   ```powershell
   notepad .env
   ```

4. Start BudgetWise, then open **http://127.0.0.1:8000**:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\start_windows.ps1
   ```

   Press `Ctrl+C` in that terminal to stop the server. Do **not** add `--reload` on Windows; it uses an event loop that cannot start the MCP stdio tool server correctly.

The first start can take longer because ChromaDB downloads a small embedding model once. Later starts reuse the local copy. The built React app is committed in `frontend/dist`, so teammates do not need Node for normal use.

### Manual Windows setup

If you prefer not to run the helper scripts:

```powershell
py -3 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
.\venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

**Other ways to run it**

- Terminal version: `python agent.py "Can I afford a $60 dinner on Friday?"`, `python agent.py --plan`, or `python agent.py` for chat mode.
- Editing the UI (needs Node 18+): run `cd frontend`, `npm install`, then `npm run dev` (port 5173, proxying API requests to port 8000). Run `npm run build` before committing and include the changed `frontend/dist` files.
- Regenerating the demo data: `python scripts/make_demo_data.py`.

## Project structure

```
app.py                  FastAPI server: REST + streamed chat/plan endpoints, serves the React app
agent.py                Same agent team in the terminal
mcp_server.py           MCP tool server (thin wrappers around the money engine)
guardrails.py           Input, grounding and sanitizing checks (no model needed)
budgetwise/
  finance.py            Money engine: safe-to-spend, bills, paydays, forecast, insights, plans
  agents.py             Router, Analyst, Planner, Critic, Categorizer, streaming
  bookkeeper.py         Bookkeeper agent and its save/fix/undo tools
  conversation.py       Guided questions, quick replies, persistent history and loop prevention
  devlog.py             Opt-in private development conversation logging
  importer.py           Reads any bank's CSV export
  categories.py         Categories and keyword rules
  knowledge.py          ChromaDB search over knowledge/*.md
  store.py              SQLite ledger in data/workspace/budgetwise.db (git-ignored)
frontend/               React + Vite + Tailwind + Recharts (built copy committed in frontend/dist)
data/personas/          Demo people (fake data, dates relative to today)
data/samples/           Sample bank CSV for trying the upload
knowledge/              Budgeting guides (Penn State Extension, CFPB)
tests/                  Unit tests (no model calls)
tests/run_m4_eval.py    M4 evaluation suite: the 10 M3 test cases run against the M4 agent
tests/results/          M4 evaluation output (CSV + Markdown), submitted with the report
docs/ARCHITECTURE.md    Current M4 system diagram and request flow
docs/PROJECT_OVERVIEW.md Product purpose, M3-to-M4 changes, agent roles, and testing/logging handoff
docs/m3/                M3 architecture and evaluation, kept for reference
```

## Tests

- `python -m pytest` runs **106 checks with no model calls**: money math, natural payment-source replies and balance reconciliation, weekly check-ins, first-use state, local log archiving, the CSV importer, categorizer rules, routing, conversation progression and loop prevention, guardrails, the ledger, Bookkeeper tools, and the MCP server over the real protocol.
- `python tests/run_m4_eval.py` runs the **M4 evaluation suite**: the same 10 test cases we committed to in M3,
  against the same fake sample data with the date pinned to 2026-09-28. It needs the NRP key because it calls the
  real agents. It writes `tests/results/m4_eval_results.csv`, `.md` and `m4_eval_raw.json`.
  `tests/results/m4_eval_results.csv` is the evaluation results file submitted with the M4 report.

## Reviewing development conversations

Conversation logging is off by default because messages can contain financial information. To opt in while
developing or running a consented user test, add `BUDGETWISE_DEV_LOG_CONVERSATIONS=1` to `.env` and restart
the app. Each turn is appended to `data/workspace/dev_conversations.jsonl`, which is excluded from Git.
The structured record includes routing, saved-data types, guided-question state, readiness changes, guardrail
blocks and latency. It does not contain uploaded CSV rows, and obvious account/card numbers are redacted.

Run `python scripts/review_conversations.py` for a quick summary of sessions, latency and questions that did
not advance. Treat the JSONL file as private test data: do not commit, publish or share it without consent.

When logging is enabled, Settings shows a **Development conversation logging is on** notice. Choose
**Archive current log** to atomically move every session in the active file into
`data/workspace/log_archive/` with a timestamp. The next logged message starts a clean active file. Archives
remain local and Git-ignored; review one later with
`python scripts/review_conversations.py --path <archived-jsonl-path>`, then delete it manually when it is no
longer needed. The developer section is hidden when logging is disabled.

## CHANGES (since M3)

M3 was submitted on **October 28, 2026**. Every change listed below was made after that date: 51 commits between
November 10 and November 13, then the evaluation runner, the results files and this measured section on
November 18. The commit history in this repository shows those dates and the work of all three team members.
Where a change is measured by the 10 evaluation cases, the number is in the **Measured** note in its row and in
the table below. Changes the 10 cases cannot see are measured by the 75 new unit tests and by the five user
testing sessions, as explained at the end of this section.

| Change                                                                                                                                                              | Why                                                                                                                        | Effect                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conversation-first React workspace** replaces the command line: Home, Activity, Plan, Settings and isolated examples                                              | M3 could only be used from a terminal, and early web prototypes felt fragmented                                            | A user can log information, ask for advice and see the current money picture in one place                                                    |
| **One server that stays running**, so the MCP server and ChromaDB load once at startup                                                                              | In M3 every question relaunched the tool server and reloaded the embedding model                                           | Startup cost is paid once (about 2 s) instead of on every question                                                                           |
| **Pre-computed snapshot** handed to the agents, and **routing done in code** instead of a handoff                                                                   | In M3 a plan question took about 11 model calls and 22,000 tokens                                                          | Simple questions need 0 or 1 tool calls. Speed depends on how busy NRP is: usually 2 to 5 s, but 11 to 38 s for questions and 35 to 47 s for plans in the Nov 18 evaluation run (see the measured results below). **Measured:** tool calls for a weekly plan 8 to 1, and for a fact question 1-2 to 0                                                 |
| **SSE response channel** with a clear loading state and safe calculated fallback                                                                                    | The M3 demo showed a long blank wait and model latency varies                                                              | The interface stays responsive and never exposes partial, unverified financial text                                                          |
| **Real data**: CSV import for most banks, plus automatic detection of recurring bills, paydays and income swings                                                    | M3 used one fixed sample file with a frozen date                                                                           | Works on a real bank export. Demo dates now follow today                                                                                     |
| **Bookkeeper agent: tell it in plain words** ("spent about $40 the last couple days", "I get paid every 2 weeks but it changes"), with a confirmation card and Undo | Most students and gig workers won't download a bank file every day, but they will type a sentence                          | The app stays current between uploads, and it works with no bank file at all                                                                 |
| **SQLite ledger** replaces JSON files: every entry records where it came from (bank, chat, check-in) and whether it's an estimate                                   | Many small saves need to be safe and undoable                                                                              | Exact bank rows replace estimates for the same dates, and re-uploading a file never double-counts                                            |
| **Available-money reconciliation** records payment method separately from spending                                                                                  | A credit-card purchase, cash gift, old bill, and checking purchase should not all change today's bank balance the same way | Spending stays complete while only verified movements change the planning pool; older activity is not double-counted after a balance check   |
| **Weekly balance and goal check-ins**                                                                                                                               | People forget automatic transactions and savings transfers                                                                 | BudgetWise periodically confirms the estimate, records cumulative goal progress, and recalculates the remaining pace without repeating setup |
| **Optional guided setup** with deterministic quick replies, skip memory and loop prevention                                                                         | Users need value quickly without being forced through a long questionnaire                                                 | The app asks one purposeful question at a time, stops after enough context and accepts any financial fact whenever the user shares it        |
| **Persistent conversation summary** and opt-in development logs                                                                                                     | Long transcripts were awkward after refresh and repeated-question failures were hard to diagnose                           | Returning users see where they left off; consented test sessions can be reviewed without committing private data                             |
| **Timestamped development-log archives** visible only when logging is enabled                                                                                       | Repeated test runs need to remain comparable without one ever-growing active file                                          | A developer can preserve a complete testing period, start a clean log, and manually remove private archives later                            |
| **30-day cash-flow safe-to-spend**: protects recurring bills, usual living costs and a cushion; daily amounts use at least a 14-day window                          | A payday tomorrow previously made nearly the whole balance look spendable                                                  | Regression cases with payday tomorrow and in 10 days no longer create a huge daily or weekly allowance. **Measured:** TC2 safe-to-spend went from $39.11 to $69.10 a day. This is the intended change that makes TC2 differ from the M3 expectation                                       |
| **Critic agent** (1-10 score; code approves at 7 or higher, otherwise one revision)                                                                                 | M3 planned this for M4 (Ch 7)                                                                                              | Each plan arrives with a score. **Measured:** both plans in the evaluation were reviewed and both scored 9/10; M3 reviewed none                                                                                                               |
| **Categorizer agent** with keyword rules first and a cache                                                                                                          | Ch 4 cost ladder: the cheapest check first                                                                                 | Most rows are sorted by rules, and only unknown store names go to the model                                                                  |
| **Prompt-injection check** and sanitizing of uploaded text                                                                                                          | Ch 8 threat model: bank descriptions are untrusted                                                                         | Blocks "ignore your instructions" attempts                                                                                                   |
| **M3 bug fixed**: a plan's category cap is never looser than last week's cap                                                                                        | Known limitation #1 in M3                                                                                                  | Covered by a unit test. **Measured:** part of the suite growing from 31 to 106 tests (+75)                                                                                                                       |
| **M3 bug fixed**: the last-week plan check now counts all 7 days of the plan week | M3 skipped the plan's first day, so it under-reported how far a category went over its cap | **Measured:** TC5 dining over its cap went from $5.38 to $45.31, which matches the sample CSV. The M3 expectation was wrong, so this is why TC5 no longer matches it |
| **M4 evaluation runner** (`tests/run_m4_eval.py`) with the results committed in `tests/results/` | M3 committed to test-driven agent development (Ch 7), so the run has to be repeatable by anyone | **Measured:** produces the 10-case results file submitted with the report: 6/10 against the M3 expectations, 9/10 against M4's intended behavior |
| Grounding check accepts whole-dollar rounding ("$27" for 27.40)                                                                                                     | People talk in round numbers                                                                                               | Wrong cents and invented amounts are still flagged. **Measured:** 0 grounding failures across all 10 evaluation cases                                                                                           |

### Measured impact on the 10 evaluation cases (M3 vs M4)

Same 10 inputs and the same fake sample data (date pinned to 2026-09-28). M3 results: `docs/m3/latest_results.md`
(Oct 27 run). M4 results: `tests/results/m4_eval_results.md` and `.csv` (Nov 18 run, made with `tests/run_m4_eval.py`).
Expected answers were not rewritten to make M4 pass.

| Measure | M3 | M4 | What it shows |
| ------- | -- | -- | ------------- |
| Cases passed | 10/10 (100%) | 6/10 (60%) | We report the drop as it is. Three of the four M4 failures (TC1, TC2, TC5) are cases where the M4 answer is correct and the M3 expectation is out of date. One (TC7) is a real wording miss in a plan |
| Tool calls for a fact question (TC1 to TC5) | 1 to 2 | 0 | The snapshot hands the numbers to the agent, so no tool call is needed |
| Tool calls for a weekly plan (TC6, TC7) | 8 | 1 | Code routing replaces the long multi-tool handoff |
| Plans reviewed before the user sees them | none | 2 of 2, both scored 9/10 by the Critic | New Critic agent |
| Automated tests that need no model | 31 | 106 | +75 tests |
| Safety cases (TC9 investing, TC10 card number) | pass | pass | Unchanged: both still blocked before any model call |
| Last-week plan check (TC5): dining over its cap | $5.38 (M3 skipped the plan's first day) | $45.31 (all 7 days counted) | M3 off-by-one fixed; M4 matches the sample CSV |
| Safe to spend per day (TC2) | $39.11 | $69.10 | Deliberate change to the money rules (30-day cash flow: expected paychecks and detected bills are counted, spread over at least 14 days). It is why TC2 does not match the M3 expectation |
| Grounding failures (wrong or invented dollar amounts) | 0 | 0 | Every dollar amount in every M4 answer matched the data |
| Speed (this run only; M3 recorded no timings) | not recorded | questions 11 to 38 s, plans 35 to 47 s | NRP was slow during the run, and TC3 needed one retry after a timeout |

Changes that the 10 cases do not cover (the purchase "How did you pay?" flow, guided setup, Undo, CSV import, the
Bookkeeper and Categorizer agents) are checked by the 75 new automated tests and by the five user sessions, not by
this table.

## Known limitations

1. **NRP response times vary, and this is our biggest weakness.** When NRP is quiet, answers take about 2 to 5 seconds. When it is busy they are far slower: in the measured Nov 18 evaluation run, questions took 11 to 38 seconds and weekly plans took 35 and 47 seconds, and one case hit the timeout and passed only on the automatic retry. After 45 seconds an agent shows the calculated numbers instead. Two user sessions also lost an answer to this.
2. **Recurring-bill detection needs history.** It needs at least two payments on a regular schedule (weekly, every 2 weeks or monthly), so upload two or three months of transactions.
3. **One person, one computer.** Data is stored in a local SQLite file, with no login or live bank connection (a weekly CSV upload is the bridge; a bank connection such as Plaid would be the next step).
4. **Estimates are only as good as the guess.** "About $40" is saved as $40.00 and marked as an estimate until a bank file replaces it.
5. **The input guardrail uses keywords**, so it can block a harmless question like "sales tax" and miss reworded ones.
6. **The model's advice text can still be generic.** The numbers are verified, but the wording of a tip isn't.
