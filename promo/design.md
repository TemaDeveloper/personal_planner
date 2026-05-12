---
name: Planner Promo
colors:
  primary: "#020617"
  on-primary: "#F8FAFC"
  accent: "#22C55E"
  accent-dim: "#16A34A"
  surface: "rgba(255, 255, 255, 0.06)"
  surface-border: "rgba(255, 255, 255, 0.1)"
  muted: "#64748B"
  violet: "#A78BFA"
  blue: "#60A5FA"
  rose: "#FB7185"
  amber: "#F59E0B"
  orange: "#FB923C"
typography:
  headline:
    fontFamily: Plus Jakarta Sans
    fontSize: 4.5rem
    fontWeight: 800
    letterSpacing: -0.03em
  subheadline:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: 600
    letterSpacing: -0.02em
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: 500
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 600
    textTransform: uppercase
    letterSpacing: 0.08em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
motion:
  energy: high
  easing:
    entry: "expo.out"
    exit: "power3.in"
    ambient: "sine.inOut"
  duration:
    entrance: 0.5
    hold: 2.0
    transition: 0.4
  atmosphere:
    - glassmorphic-cards
    - accent-glow-pulses
    - floating-particles
  transition: crossfade
---

## Overview
Glassmorphism-based promo for an AI-powered personal planner app. Dark navy background with translucent frosted-glass cards, green accent, modern typography. Energy: high but refined.

## Colors
- Background: Deep navy (#020617)
- Cards: Frosted glass (rgba white 0.06) with backdrop blur
- Accent: Vibrant green (#22C55E) for CTAs and highlights
- Text: Near-white (#F8FAFC) on dark

## Typography
Plus Jakarta Sans throughout. Headlines at 800 weight, body at 500.

## Elevation
Glass cards float above the background with subtle 1px white-10% borders and backdrop-filter blur. Active states get accent glow (box-shadow with accent color at 12% opacity).

## Do's and Don'ts
- DO use glassmorphic overlays with blur(16px)
- DO animate with GSAP expo.out easing
- DO stagger card reveals for rhythm
- DON'T use flat solid backgrounds on cards
- DON'T over-animate — let content breathe
