# Concepts Master (`concepts.selfserved.ai`)

The canonical self-hosted showcase and directory for public concepts under `selfserved.ai`.

## Production Architecture & Deployment

- **Canonical URL:** `https://concepts.selfserved.ai/`
- **Origin Server:** Hostinger VPS `srv1491669.hstgr.cloud` (`187.77.156.249`, Project: `concepts-master`, VM ID `1491669`).
- **Container Stack:** Docker Compose running `nginx:alpine` reverse-proxied by Traefik with automated Let's Encrypt TLS certificate issuance.
- **Continuous Sync:** Automated 60-second Git pull daemon running on the VPS tracking `main` of `https://github.com/rickpmpers/concepts-master`.
- **Edge Routing:** Cloudflare DNS proxied A record with Cloudflare Access Zero Trust authentication.

## Published Concepts & Showcases

1. **[Quantitative AI Risk Modeling](quantitative-ai-risk-modeling/)**: Open-source diagnostic telemetry, FAIR loss engine, 50,000-iteration Monte Carlo Beta-PERT distributions, and capped policy limits powering the [AIRM](https://airm.selfserved.ai) platform.
2. **[Sovereign Personal AI Stack](sovereign-ai-stack/)**: Local autonomous agent harness blueprint.

## Canonical Concept Mappings (External Showcases)
- **[Project SUN](https://sun.selfserved.ai)**: Decentralized solar-powered edge AI mesh with multi-family domestic hot water thermal recapture.
- **[Meeting Bot](https://meetingbot.selfserved.ai)**: Autonomous multi-persona collaborative meeting intelligence bot (PM, Architect, Engineer).
- **[AIRM](https://airm.selfserved.ai)**: Evidence-based AI risk scoring and closed-loop insurance underwriting guide.
- **[AI Dynamic Quiz](https://signaldb.selfserved.ai)**: Dynamic AI evaluation engine with authored Markdown questions, web-sourced prompts, and multi-dimensional breadth/depth scoring.
- **[Mexo-Ind](https://mexo-ind.selfserved.ai)**: Indian flavor systems, fusion recipes, brand identities, and launch playbooks designed specifically for Mexican street food and mobile kitchens.

