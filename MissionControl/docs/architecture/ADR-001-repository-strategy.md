ADR-001: Repository Strategy
Status
Accepted

Context
MissionControl will have multiple mobile apps (employee, manager, admin)
that share code like the design system, auth and networking.

Decision
Use a monorepo: apps/ for applications, packages/ for shared code.

Why
Multiple apps share the same packages
One organization, one set of tools
Changes across apps and packages happen in one commit
Alternatives considered
Single repo (one app only)
Multi-repo (separate repo per package)
Trade-offs
Good: easier sharing, one CI/CD setup, atomic changes
Cost: bigger repo, needs clear dependency rules and build tooling