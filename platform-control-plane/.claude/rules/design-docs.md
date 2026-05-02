## Design Document Compliance

### Before ANY implementation:

1. **Read design docs first** — always check `./docs/` folder for architecture decision records
2. **Follow exact architecture** — implement what's specified, no deviations (exceptions require explicit approval)
3. **No re-invention** — don't create alternative solutions unless explicitly asked
4. **Verify compliance** — check implementation against design docs before proceeding

### How to use ADRs:
- ADRs define the "why" and "what" — they are the source of truth for architectural decisions
- Read the full ADR before starting, not just the title or summary
- Pay attention to the "Decision" and "Consequences" sections — they constrain your implementation
- If an ADR specifies a technology, library, or approach, use exactly that — don't substitute
- If an ADR lists rejected alternatives, never implement those alternatives without explicit approval
- ADRs may reference each other — follow the chain to understand the full context

### When multiple ADRs apply:
- Later ADRs supersede earlier ones on the same topic (check dates)
- If ADRs conflict, raise it with the user before proceeding
- Implement the intersection of all applicable constraints, not just one ADR

### What to do when ADRs are ambiguous or incomplete:
- If the ADR doesn't cover a specific implementation detail, ask before assuming
- If the ADR is silent on a topic, follow the code guidelines and Go idioms — but flag it
- Never fill gaps with over-engineering. Prefer the simplest approach that satisfies the ADR

### On deviation:
- If implementation doesn't match design docs: stop and ask for clarification
- Don't assume you know better than the design docs
- Don't implement "simpler" alternatives to specified architecture
- Any deviation requires explicit user approval before proceeding
- When proposing a deviation, explain what the ADR says, why you think it should change, and what the tradeoffs are

### After implementation:
- Verify the implementation satisfies all constraints in the relevant ADRs
- If the implementation revealed that an ADR needs updating (e.g., missing edge case, outdated assumption), flag it to the user
