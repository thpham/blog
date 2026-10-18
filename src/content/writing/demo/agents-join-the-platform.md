---
title: Agents are joining the platform team
description: An outlook on agents working on infrastructure — reproducible definitions, small reviewable diffs and boring platforms become load-bearing when the author is a machine.
date: 2026-10-15
lang: en
topics:
  - Platform Engineering
  - AI
horizon: true
translationOf: agents-et-plateformes
demo: true
---

The interesting shift is not that agents write code; it is that they now
operate environments. A pull request that touches a Terraform module or an
OpenShift route is increasingly produced by a tool that never saw the
ticket, and will often be shipped by another one.

Three contracts become load-bearing when the author is a machine:

- **Reproducible definitions.** A hand-tuned environment does not survive
  being described to a tool; a declared one does. Systems like Terraform and
  Nix were built for humans, but they are exactly what a machine needs to
  check its own work.
- **Small, reviewable diffs.** The review step is where the humans keep the
  judgement. The bar for a machine-made diff is the one a good reviewer
  always had: *could this merge without a second read?*
- **Boring platforms.** An agent is only as good as the surface it acts on.
  The less bespoke the platform, the fewer places there are for the machine
  to invent a mistake of its own.

None of this says the work disappears. It says the platform side of it — the
declared state, the contracts, the diffs that get reviewed — is the part
that keeps meaning something, and the part worth strengthening first.