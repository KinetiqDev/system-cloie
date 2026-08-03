# Program Head Selected Program Context

Program Head authority remains the complete set of active `ProgramHeadAssignment` records for the account. A Program Head may have zero, one, or multiple active assignments, and no assignment is primary or default.

Program Head management selects exactly one Program through the canonical route. The server validates that requested Program against the current active assignment set on every request, and sensitive writes revalidate the assignment inside their transaction. A remembered preference, route value, client state, or JWT metadata cannot establish authority.

This preserves the single-role account invariant from ADR 0001 while making management scope deliberate and linkable. A primary/default Program field was rejected because the domain has no ranking rule and a fallback would recreate the authorization ambiguity this decision removes.
