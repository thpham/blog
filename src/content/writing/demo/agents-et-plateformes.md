---
title: Les agents rejoignent l'équipe plateforme
description: Un regard sur les agents qui travaillent sur l'infrastructure — définitions reproductibles, diffs relisibles et plateformes « tranquilles » deviennent structurants quand l'auteur est une machine.
date: 2026-10-15
lang: fr
topics:
  - IA
  - Plateformes
horizon: false
translationOf: agents-join-the-platform
demo: true
---

Le changement intéressant n'est pas que les agents écrivent du code ; c'est
qu'ils se mettent à opérer des environnements. Une pull request qui touche
un module Terraform ou une route OpenShift est de plus en plus produite par
un outil qui n'a jamais vu le ticket, et souvent expédiée par un autre.

Trois contrats deviennent structurants quand l'auteur est une machine :

- **Des définitions reproductibles.** Un environnement réglé à la main ne
  survit pas à une description dans le contexte d'un outil ; un environnement
  déclaré, oui. Terraform ou Nix ont été conçus pour des humains, mais c'est
  exactement ce dont une machine a besoin pour relire son propre travail.
- **Des diffs petits et relisibles.** La relecture est l'endroit où les
  humains gardent le jugement. La barre d'un diff écrit par une machine est
  celle d'un bon relecteur : *pourrait-il être fusionné sans deuxième
  lecture ?*
- **Des plateformes « tranquilles ».** Un agent ne vaut que la surface sur
  laquelle il agit. Moins la plateforme est singulière, moins il y a
  d'endroits où la machine peut inventer sa propre erreur.

Rien de tout cela ne fait disparaître le métier. Cela veut dire que la
partie plateforme du travail — l'état déclaré, les contrats, les diffs
relus — reste ce qui compte, et qu'elle vaut la peine d'être renforcée en
premier.
