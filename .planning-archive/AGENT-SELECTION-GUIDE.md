# GSD Agent Selection Guide

**Purpose:** Help you choose the right agent for the right task to maximize efficiency and prevent context waste.

**Golden Rule:** When in doubt, start with the smallest/quickest agent that can handle the task. You can always escalate to a more powerful agent if needed.

---

## Quick Decision Tree

```
Is this a bug/error investigation?
├─ YES → gsd-debugger
└─ NO ↓

Do you know exactly what needs to be done?
├─ YES → Is it a single file or simple change?
│   ├─ YES → quick task (or do it yourself directly)
│   └─ NO → gsd-executor (with existing plan)
└─ NO ↓

Do you need to understand how to implement something?
├─ YES → gsd-researcher (then plan, then execute)
└─ NO ↓

Do you need to break down a feature into tasks?
├─ YES → gsd-planner
└─ NO → Ask yourself the questions again
```

---

## Agent Profiles

### 🔍 gsd-debugger

**Use when:** Something is broken and you don't know why

**Strengths:**

- Systematic hypothesis testing
- Root cause analysis
- Can find AND fix (or just diagnose)
- Maintains debug session state

**When to use:**

- ✅ Build failures with unclear cause
- ✅ Feature not working as expected
- ✅ Error messages you don't understand
- ✅ "It worked yesterday, now it doesn't"
- ✅ Integration issues between components

**When NOT to use:**

- ❌ You know what's broken (just fix it directly)
- ❌ Need to add new feature (use planner/researcher)
- ❌ Simple syntax error (fix yourself)

**Real example from this session:**

- Problem: "Build failing with require.resolveWeak error"
- Wrong approach: Try to fix it ourselves without understanding
- Right approach: Would have used gsd-debugger (we manually debugged this time)
- Result: Discovered `"type": "module"` was breaking Docusaurus

---

### 📚 gsd-researcher

**Use when:** You know WHAT to build but not HOW

**Strengths:**

- Explores codebase patterns
- Researches APIs and libraries
- Documents findings for planner
- Identifies implementation approaches

**When to use:**

- ✅ "How do we implement feature X in this codebase?"
- ✅ "What's the best way to add Y given our architecture?"
- ✅ Need to understand existing patterns before planning
- ✅ Evaluating multiple implementation approaches
- ✅ Learning how existing features work

**When NOT to use:**

- ❌ You already know how to implement it (use executor)
- ❌ Need to break down tasks (use planner)
- ❌ Something's broken (use debugger)
- ❌ Very simple changes (quick task)

**Real example:**

- Needed: Understand project board API before building monthly reports
- Used: gsd-researcher to explore GitHub GraphQL API patterns
- Output: RESEARCH.md documenting API structure and authentication
- Next: gsd-planner used research to create implementation plan

---

### 📋 gsd-planner

**Use when:** You know WHAT and HOW, need to break it into tasks

**Strengths:**

- Creates executable task lists
- Identifies dependencies
- Estimates complexity
- Goal-backward verification

**When to use:**

- ✅ Multi-step feature implementation
- ✅ After research phase completes
- ✅ Need to organize complex work
- ✅ Creating phase plans for milestones
- ✅ Breaking down epics into stories

**When NOT to use:**

- ❌ Don't know how to implement yet (research first)
- ❌ Single straightforward task (quick task)
- ❌ Already have a detailed plan (use executor)
- ❌ Something's broken (use debugger)

**Real example:**

- Needed: Implement monthly reports feature
- Used: gsd-planner after research completed
- Output: 3-phase plan with 15 tasks, dependencies mapped
- Next: gsd-executor implemented each phase

---

### ⚙️ gsd-executor

**Use when:** You have a clear plan and need implementation

**Strengths:**

- Executes task lists systematically
- Makes atomic commits per task
- Handles deviations with structured escalation
- Maintains checkpoint protocol

**When to use:**

- ✅ Implementing from a plan created by planner
- ✅ Multi-file changes with clear requirements
- ✅ Following documented implementation steps
- ✅ Converting design docs into code
- ✅ Systematic refactoring with known steps

**When NOT to use:**

- ❌ Don't have a clear plan (research/plan first)
- ❌ Single file edit (quick task or do it yourself)
- ❌ Investigating bugs (use debugger)
- ❌ Need to figure out approach (use researcher)

**Real example from this session:**

- Needed: Convert CommonJS scripts to ES modules
- Had: Clear plan of what files to change and how
- Used: gsd-executor (ourselves, following executor principles)
- Result: Systematic conversion with clear commit message

---

### ⚡ quick task

**Use when:** Simple, isolated, obvious changes

**Strengths:**

- Fast startup/completion
- Low overhead
- Direct action without ceremony
- Perfect for one-off tasks

**When to use:**

- ✅ Single file edits
- ✅ Documentation updates
- ✅ Configuration tweaks
- ✅ Adding comments or logs
- ✅ Renaming variables
- ✅ Fixing obvious typos
- ✅ < 30 minutes of work

**When NOT to use:**

- ❌ Multi-file changes requiring coordination
- ❌ Need to understand codebase first
- ❌ Bug investigation required
- ❌ Feature implementation (even small ones)
- ❌ Changes requiring testing strategy

**Real example:**

- Needed: Update AGENTS.md with new contributor highlighting docs
- Used: quick task
- Why: Single file, clear change, no investigation needed
- Result: Done in 5 minutes

---

### 🔄 general agent

**Use when:** None of the specialized agents fit

**Strengths:**

- Flexible, can handle various tasks
- Good for mixed work (research + implement)
- Can spawn other agents if needed

**When to use:**

- ✅ Exploratory work with unclear scope
- ✅ Multiple unrelated small tasks
- ✅ Ad-hoc requests
- ✅ Prototyping/experimentation

**When NOT to use:**

- ❌ When a specialized agent clearly fits (use that instead)

---

## Red Flags: Wrong Agent Chosen

### 🚩 You're using gsd-executor but...

- You keep pausing to research how things work → **Switch to gsd-researcher**
- Tasks keep revealing unknowns → **Step back to gsd-planner**
- Following a plan but it doesn't work → **Switch to gsd-debugger**
- Only editing one file → **Too heavyweight, use quick task**

### 🚩 You're using gsd-planner but...

- You don't understand how to implement → **Step back to gsd-researcher**
- The "plan" is just 1-2 obvious steps → **Too heavyweight, use quick task or executor**
- Something's broken and needs fixing first → **Use gsd-debugger first**

### 🚩 You're using gsd-researcher but...

- You already know how to do this → **Skip to gsd-planner or gsd-executor**
- Something's broken and you're researching why → **Use gsd-debugger**
- Research keeps going in circles → **Narrow scope or define specific questions**

### 🚩 You're using gsd-debugger but...

- You know what's broken, just need to fix it → **Use quick task or executor**
- It's not actually broken, just incomplete → **Use executor to finish it**
- Debugging a design decision (not a bug) → **Use researcher or planner**

### 🚩 You're using quick task but...

- Changes span multiple files with dependencies → **Use gsd-executor**
- You don't know what needs to change → **Use gsd-researcher or gsd-debugger**
- Task is taking > 30 minutes → **Should have used a bigger agent**

---

## Common Patterns

### Pattern 1: New Feature (Research → Plan → Execute)

```
User: "Add monthly reports feature"
├─ gsd-researcher: How do GitHub Projects V2 API work?
├─ gsd-planner: Break down into phases with tasks
└─ gsd-executor: Implement phase 1, then phase 2, etc.
```

### Pattern 2: Bug Fix (Debug → Fix)

```
User: "Build is failing"
├─ gsd-debugger: Find root cause (type: module breaking Docusaurus)
└─ gsd-debugger: Apply fix and verify
```

### Pattern 3: Simple Change (Quick Task)

```
User: "Update the README to mention new feature"
└─ quick task: Edit README.md
```

### Pattern 4: Refactoring (Research → Plan → Execute)

```
User: "Refactor authentication module"
├─ gsd-researcher: Understand current auth patterns
├─ gsd-planner: Create refactoring strategy
└─ gsd-executor: Systematic refactoring with tests
```

### Pattern 5: Investigation (Research)

```
User: "How does the build system work?"
└─ gsd-researcher: Explore and document build process
   (No further agents needed - user will decide next steps)
```

---

## Anti-Patterns to Avoid

### ❌ Using gsd-executor without a plan

**Problem:** Agent keeps asking "what should I do next?"
**Fix:** Use gsd-planner first to create the plan

### ❌ Using gsd-planner for single-file changes

**Problem:** Overhead of planning for trivial work
**Fix:** Use quick task or just do it directly

### ❌ Using gsd-researcher when you know the implementation

**Problem:** Wastes time researching what you already know
**Fix:** Go straight to gsd-executor or quick task

### ❌ Using quick task for multi-file coordinated changes

**Problem:** Changes are incomplete or create inconsistencies
**Fix:** Use gsd-executor with a clear task list

### ❌ Using gsd-debugger for "how to implement" questions

**Problem:** Nothing is broken, you just need guidance
**Fix:** Use gsd-researcher instead

### ❌ Jumping to gsd-executor when approach is unclear

**Problem:** Implementation keeps hitting walls
**Fix:** Step back to gsd-researcher or gsd-planner

---

## Real Session Example: The Module System Disaster

**What happened:** Added `"type": "module"` to fix report scripts, broke entire build.

**What we should have done:**

1. **gsd-debugger**: Investigate why report scripts need ES modules
   - Would have discovered: new scripts use `import`, package.json needs `type: module` OR `.mjs` extension
   - Would have tested: impact of `type: module` on existing scripts
   - Would have found: breaks fetch scripts AND Docusaurus
   - Would have recommended: use `.mjs` extension instead

**What we actually did:**

1. Manually added `"type": "module"` without investigation
2. PR build failed (caught the fetch script breakage)
3. Converted all fetch scripts to ES modules (wrong solution)
4. Build still failed (Docusaurus webpack issue)
5. Finally discovered: should use `.mjs` instead
6. Reverted everything and used `.mjs` properly

**Lessons:**

- 🔴 Don't make infrastructure changes without testing impact
- 🟢 Use gsd-debugger for "why does this require X?" questions
- 🟢 Test build after ANY package.json changes
- 🟢 When breaking changes are needed, investigate alternatives first

**What would have been different with gsd-debugger:**

- Agent would have tested both approaches (`.mjs` vs `type: module`)
- Would have discovered Docusaurus incompatibility before committing
- Would have recommended `.mjs` from the start
- Saved 1-2 hours of debugging and multiple failed builds

---

## Tips for Effective Agent Use

### 1. Start Small, Escalate if Needed

- Try quick task first for simple things
- Escalate to executor if it grows
- Escalate to debugger if something breaks

### 2. Be Explicit About Mode/Goal

When spawning agents, specify:

- `goal: find_root_cause_only` (for debugger in diagnosis mode)
- `goal: find_and_fix` (for debugger to fix after finding cause)
- `symptoms_prefilled: true` (when you've already gathered symptoms)

### 3. Chain Agents Properly

- Research → Plan → Execute (for new features)
- Debug → Execute (for bug fixes with solutions)
- Plan → Execute (when you know the approach)

### 4. Don't Over-Engineer

- Documentation update? Just do it (or quick task)
- Single config change? Just do it
- Multi-file refactoring? Use executor

### 5. Trust the Agent Specialization

- Debuggers are better at debugging than executors
- Researchers are better at exploration than planners
- Executors are better at implementation than researchers

---

## Summary Cheat Sheet

| Task Type                  | Agent                                        | Why                              |
| -------------------------- | -------------------------------------------- | -------------------------------- |
| Bug investigation          | gsd-debugger                                 | Systematic root cause analysis   |
| "How do I implement X?"    | gsd-researcher                               | Explores patterns and approaches |
| Break down epic into tasks | gsd-planner                                  | Creates executable plans         |
| Implement from clear plan  | gsd-executor                                 | Systematic execution             |
| Single file edit           | quick task                                   | Fast, low overhead               |
| Build failing              | gsd-debugger                                 | Find and fix root cause          |
| Documentation update       | quick task                                   | Simple, isolated change          |
| Multi-step feature         | researcher → planner → executor              | Full cycle                       |
| Refactoring                | researcher → planner → executor              | Understand, plan, execute        |
| Config change              | quick task                                   | Direct action                    |
| "Something broke"          | gsd-debugger                                 | Investigation required           |
| "Add new feature"          | researcher (if unclear) → planner → executor | Full feature cycle               |

---

## When to Just Do It Yourself

Sometimes the fastest path is direct action, no agent needed:

✅ **Do it yourself when:**

- You know exactly what to change (one file, obvious fix)
- It's faster to do than explain
- Testing is trivial
- No research or planning needed
- < 5 minutes of work

❌ **Use an agent when:**

- Multiple files involved
- Need to understand codebase first
- Could break something
- Need systematic approach
- > 15 minutes of work
- Want clear commit trail

**Remember:** Agents are tools to amplify your work, not replacements for common sense. Use them when they add value, skip them when they add overhead.
