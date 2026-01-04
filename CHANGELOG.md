# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/GraysonCAdams/eclosion-for-monarch/compare/v1.0.0...v1.1.0) (2026-01-03)

> Major update with enhanced security scanning, comprehensive documentation, demo mode for trying the app without setup, and a new burndown chart for visualizing monthly savings progress.

### Features

* add BurndownChart component for monthly savings visualization ([e3fb5ec](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/e3fb5ecdcb35fc332d8c04218ab2ec3f181d0122))
* add comprehensive GitHub repository setup guide for community readiness and deployment compatibility ([8ecf9e3](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/8ecf9e3955662772a6b69441fafdc5dccd0876ab))
* Add conditional Docs link for minimal header on landing page ([f16bebc](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/f16bebcb6f454bfba9b318f7057b3319b4df0b4e))
* Add HeartHandshake icon and update corresponding feature icon ([a1cc290](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/a1cc2906c5dcb4b198755bc39fd3a216c381b532))
* Add RollupConfigStep and WelcomeStep components for setup wizard ([5038d2b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5038d2b826c26163e90a53eca76b8c11c1633e86))
* Add security headers for Permissions Policy and Cross-Origin-Opener-Policy in API response ([2091574](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/2091574e0f0010c899e88490340c0d82142cdda8))
* Add security scanning workflow with CodeQL, dependency scanning, and container scanning ([ab3d8b5](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/ab3d8b5215df914102290549f86f0dde73d82b38))
* Add VSCode settings for Python formatting and linting; update various functions for type hints and error handling ([4566df3](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/4566df38af4fa6cb4dcfa4e8f6593118e40309ba))
* Add warning for Spectre Vulnerability in ZAP rules configuration ([5250f1b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5250f1bb332682b62e17b7db0b28c3b94a7229f7))
* Create comprehensive documentation pages ([acea992](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/acea9921de1aa3332312be08a7f615f6f59a1bfd))
* Define and manage feature data structure ([acea992](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/acea9921de1aa3332312be08a7f615f6f59a1bfd))
* Enhance changelog handling with AI-generated summaries and improved display ([f0ddb80](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/f0ddb804c637410626b924b95232da06dca8cc32))
* Enhance CI workflows to include file change detection for frontend, backend, and Docker builds ([9b37a47](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/9b37a4758de2bd207ed7ea8534fbddbf22500443))
* Enhance container health check with detailed logging and timeout handling ([1dde0da](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/1dde0da778d1fc189252aa88a175a9b9d9727ccb))
* Enhance marketing site detection ([acea992](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/acea9921de1aa3332312be08a7f615f6f59a1bfd))
* Enhance security in ZAP rules and add DAST testing script ([919e677](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/919e67750f9212821ddf228a05a878cbca4cd053))
* Enhance security measures by validating backup paths, sanitizing log values, and improving error handling ([ad2b386](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/ad2b386e7dd22574073875376cbfd761f4b138fb))
* Enhance security measures in workflows and API; add documentation for backup management ([94e48f8](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/94e48f84c3ee3763ba496cb861649b03bc2e6741))
* Implement demo mode context and hooks for demo functionality ([acea992](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/acea9921de1aa3332312be08a7f615f6f59a1bfd))
* Include Dockerfile in CI workflow file change detection ([3d4b0da](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/3d4b0da5b3c765122b2d999bfdda9f02fc849e0b))
* Refactor Dockerfile for multi-stage builds and enhance Python dependency management; add input sanitization utilities ([cf606dd](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/cf606dd20d5cb87040aa773647e2d899a8c486b2))
* Remove session secret file and update AppRouter to support marketing site routing ([d9c5254](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/d9c52548a37670c12ad1dd3c9b959bb9aa470520))
* Revise README for clarity and enhance feature descriptions ([d73163a](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/d73163ae305cfdb3cf685ae71c5ff80642c80781))
* Update CI workflow to remove paths-ignore for markdown and documentation files; add LICENSE file with MIT license ([5007c12](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5007c120d1744d153557c9b8ecb4333736bea785))
* Update CI workflows to support manual triggers, remove unused Docker job, and enhance security scanning ([91f1e40](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/91f1e408e835bb9cc400de69204a53c051fd39ae))
* Update CodeQL action to v4 and enhance security permissions; upgrade flask-cors dependency ([223c36a](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/223c36ab683e553c577155e56a36a15fe2c7b7ca))
* Update project overview and enhance z-index hierarchy in guidelines ([348e02f](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/348e02f6bf32b57701bc0b05044e1cefd59d64d7))
* Update release workflow to use dynamic PR head branch reference ([33fad81](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/33fad811af59ce25ce905b9c6824415a17f9e7ea))


### Bug Fixes

* Add workflow paths to security scan triggers ([#25](https://github.com/GraysonCAdams/eclosion-for-monarch/issues/25)) ([59f8e91](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/59f8e91b940561b82a2e37cfc86b0b3ce5dcf048))
* Clarify login security statement in DeploymentContent ([5a79a37](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5a79a3732a7504e0ec0bc968eed652404cb6cbb6))
* Create state directory with proper permissions for Chainguard nonroot user ([2560c20](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/2560c20e6375ea9ddffb18244be681f1f63e4109))
* Enhance error handling utilities ([5038d2b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5038d2b826c26163e90a53eca76b8c11c1633e86))
* Expand security workflow path filters ([#26](https://github.com/GraysonCAdams/eclosion-for-monarch/issues/26)) ([f52c83b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/f52c83b403344665fc6485af312247b593236424))
* Override default entrypoint to use virtual environment Python ([0fb0c99](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/0fb0c99ebc31c3725ce33c25408a254cb37a9966))
* Remove INSTANCE_SECRET environment variable from DAST container setup ([80878c5](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/80878c549509246c564101749c5e1314bc2a02c4))
* Simplify CMD instruction in Dockerfile for Chainguard Python image ([debedb4](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/debedb47763d913891a2e31e32a637637635f270))
* Update test case for SavingsCalculator to reflect current_balance change ([3949020](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/3949020f594c061c23b27841c42ddbd82ac787e5))
* Use COPY --chown for state dir (distroless has no shell) ([318ee60](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/318ee6000c590b7d15c9d70d03fb6b65f3a3640b))


### Code Refactoring

* Improve code readability by formatting long lines and simplifying error messages ([61ffc76](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/61ffc767ff4e3bbae5b450818e33ab13f98e86b6))
* Update ActionsDropdown, CategoryGroupDropdown, and RecurringRow to use new Tooltip path ([ca49467](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/ca494678d0ff94201f7df7f432e01b101890cae1))
* update components to use new icon imports and improve accessibility attributes ([2342641](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/2342641bdf92c78e884cfe2b4559f551b6d4b809))
* Update DocsPage and LandingPage to utilize unified FeatureGrid ([ca49467](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/ca494678d0ff94201f7df7f432e01b101890cae1))
* update dropdown z-index classes and improve button hover effects ([a5883b5](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/a5883b5e629c07492c19d6d734b72bc09f1325e1))
* Update ThemeContext and ToastContext for better structure ([5038d2b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5038d2b826c26163e90a53eca76b8c11c1633e86))
* update ThemeContext tests for clearer theme toggling and improve ToastContext tests for styling and dismissal behavior ([8ecf9e3](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/8ecf9e3955662772a6b69441fafdc5dccd0876ab))
* Update Tooltip import path and remove unused components ([ca49467](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/ca494678d0ff94201f7df7f432e01b101890cae1))


### Documentation

* Add compliance analysis for Monarch Money integration ([acea992](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/acea9921de1aa3332312be08a7f615f6f59a1bfd))


### Miscellaneous

* Add new hooks for improved functionality ([5038d2b](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/5038d2b826c26163e90a53eca76b8c11c1633e86))
* Configure grouped Dependabot updates ([567e620](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/567e6205ab57702c0906e646946e8c3b7cb326b7))
* **deps:** bump the github-actions-all group across 1 directory with 7 updates ([#24](https://github.com/GraysonCAdams/eclosion-for-monarch/issues/24)) ([62186a3](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/62186a3a751f379ee7b373407ab139e0cf697adc))
* **deps:** bump the python-all group with 5 updates ([#18](https://github.com/GraysonCAdams/eclosion-for-monarch/issues/18)) ([57ca530](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/57ca530cddbda204a5d49fd192d8e12185628606))
* Update CI workflow configuration for improved efficiency ([a8e5bef](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/a8e5befd4a7846fd390037f54bde5c7af8505c77))
* Update Dockerfile for improved build efficiency and security ([11b5c2a](https://github.com/GraysonCAdams/eclosion-for-monarch/commit/11b5c2a7c4ddef324726c76e829517bf4e203b65))

## [Unreleased]

## [1.0.0] - 2025-01-15

> Initial release of Eclosion for Monarch Money with recurring expense tracking, smart savings calculations, encrypted credential storage, and PWA support.

### Added
- Initial release of Eclosion for Monarch Money
- Recurring expense tracking with automatic category creation
- Target group configuration for budget categories
- Rollup category feature for consolidating small subscriptions
- Encrypted credential storage with passphrase protection
- PWA support with offline capability
- Auto-sync option for new recurring items
- Category emoji customization
- Mobile-responsive dashboard design
