---
slug: nixos-fireactions-ci-runners
title: "Containers Aren't Enough: VM Isolation for CI Pipelines"
description: Building ephemeral, isolated self-hosted CI runners using Firecracker microVMs orchestrated by NixOS for GitHub Actions, Gitea, and GitLab.
authors: [thpham]
tags: [nixos, firecracker, ci-cd, github-actions, infrastructure]
draft: true
---

Running CI workloads on shared infrastructure introduces security and isolation challenges. What if each job ran in its own ephemeral virtual machine that vanishes after execution?

<!-- truncate -->

## The Problem with Traditional CI Runners
