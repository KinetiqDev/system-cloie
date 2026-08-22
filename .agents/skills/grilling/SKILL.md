---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Write the question and its choices in plain language, the way you would explain the plan to a friend outside the project. The jargon in this skill is for the agent, not the user: say "the questions you can ask right now" instead of *frontier*, "the map of your plan's decisions" instead of *design tree*, and spell out any term a choice depends on in a short clause instead of leaving the user to guess.

Example:

❓ **Q1** - **Who uses it**: You plan an app the school opens every day. Two groups will use it — the students who answer, and the staff who read. A *persona* is just a made-up character standing in for one group of real users. Which persona is this plan for? (a) the student, (b) the staff, (c) both.

➡️ Both: logins and notifications hinge on who's on the other end, so settle it in the first round.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
