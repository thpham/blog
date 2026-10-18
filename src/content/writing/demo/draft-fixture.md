---
title: Draft fixture — must never ship
description: A draft entry that exists only so the production build tests can prove drafts ship nowhere.
date: 2026-10-18
lang: en
topics:
  - Meta
status: draft
demo: true
---

This entry is a fixture, not a post: it exists so that a test can assert,
mechanically, that a draft reaches no production build at all — no page, no
feed, no sitemap, no llms.txt, no search index, no OG image. It can be
deleted once real, published writing exists to guard against regressions.