---
title: 월간 보고서
slug: /about-reports
---

# 월간 보고서

월간 보고서는 설정된 공개 소스에서 완료된 작업, 활성 기여자, 그리고 프로젝트 동력의 투명하고 데이터 기반 스냅샷을 제공합니다.

## 월간 보고서는 무엇입니까?

월간 보고서는 매달 자동으로 생성되며, 다음을 요약합니다:

- **완료된 작업:** 저장소별로 분류되고 작업 유형별로 공개적으로 측정 가능한 병합된 작업
- **기여자:** 기간 동안 기여한 모든 사람, 첫 번째 기여자에 대한 특별한 인정
- **봇 활동:** 자동화된 의존성 업데이트와 유지보수 작업
- **프로젝트 상태:** 공개 소스가 사용 가능할 때 게시 레인 및 생태계 측정

보고서는 매달 이전 달의 활동을 커버하여 게시됩니다.

## ChillOps 철학

Bluefin은 "ChillOps" 개발 철학을 따릅니다:

- **인공적인 긴장감 없음:** 작업은 지속 가능한 속도로 진행됩니다
- **속도보다 품질:** 사려 깊은 개발은 재촉된 릴리스를 이깁니다
- **커뮤니티 주도:** 기여자들은 자신들의 관심사에 대해 작업합니다
- **투명:** 모든 작업이 공개 프로젝트 보드에 표시됩니다

프로젝트 영역이 보고서에서 "Status: ChillOps"를 보이면, 압력이나 번아웃 없이 꾸준히 작업이 진행됨을 의미합니다.

## 보고서 섹션 설명

### 요약

핵심 지표와 빠른 개요:

- 커버된 ISO 주 번호
- 총 완료 항목
- 기여자 수
- 이번 기간의 새 기여자

### 프로젝트 영역

시스템 영역별로 분류된 작업:

- **Desktop:** GNOME, Aurora, Bling (시각적 개선)
- **Development:** 개발자 경험 (DX) 개선
- **Ecosystem:** Homebrew, Flatpak, 시스템 도구
- **Hardware:** 디바이스 지원, NVIDIA 드라이버
- **Infrastructure:** 빌드 시스템, 테스트, 자동화

각 영역은 상태 배지와 GitHub 링크로 완료된 항목을 표시합니다.

### 작업 유형

작업의 성격별로 분류된 항목:

- **Bug Fixes:** 해결된 이슈
- **Enhancements:** 새 기능과 개선
- **Documentation:** 문서 업데이트와 가이드
- **Tech Debt:** 리팩토링과 정리
- **Automation:** CI/CD와 도구

## Changelog의 Supply Chain 노트

Changelog 카드는 이제 릴리스가 SBOM, attestations, 또는 provenance 도구 업데이트와 관련된 커밍 주제를 포함할 때 **Supply Chain** 블록을 포함합니다.

- 신호는 릴리스 커밍 항목에서 파생됩니다 (예: SBOM 생성, attest 워크플로우, `cosign`, `oras`, 또는 `syft` 변경에 대한 참조).
- 이것은 모든 커밍 라인을 읽지 않고 릴리스 무결성 변경을 추적하는 사용자를 위한 빠른 지표로 설계되었습니다.
- 카드는 이제 GitHub에서 일치하는 GHCR 패키지 태그 뷰에 대한 직접 링크를 포함하는데, 이는 서명과 관련 supply-chain 아티팩트를 검사하는 가장 쉬운 경로입니다.
- 전체 릴리스 컨텍스트를 위해, 각 changelog 카드에서 연결된 릴리스와 커밍 세부 정보를 여세요.

### 봇 활동

봇이 수행한 자동화된 유지보수 작업:

- 의존성 업데이트 (Dependabot, Renovate)
- 자동화된 빌드와 테스트
- 버전 업

인간 기여와 별도로 표시되어 커뮤니티 작업을 강조합니다.

### 기여자

기여한 모든 사랄의 대한 인정:

- 프로필 링크가 있는 GitHub 사용자 이름
- 프로필 카드로 강조된 첫 번째 기여자
- 모든 Bluefin 저장소에 걸쳐 추적됩니다

## 보고서가 Changelogs와 Blog와 어떻게 다른가

콘텐츠 유형 이해하기:

| Content Type   | Purpose                           | Frequency   | Source                         |
| -------------- | --------------------------------- | ----------- | ------------------------------ |
| **Changelogs** | 패키지 버전이 있는 OS 릴리스 노트 | Per release | GitHub Releases                |
| **Blog Posts** | 심층 분석, 발표, 튜토리얼         | Ad-hoc      | Manual authoring               |
| **Reports**    | immutable 프로젝트 활동 스냅샷    | Monthly     | Public-source report generator |

**changelogs를 사용하여** 특정 OS 릴리스에서 무엇이 변경되었는지 확인하세요.
이제 릴리스 커밍에서 사용할 수 있을 때 supply-chain 관련 하이라이트도 포함합니다.
**blog posts를 사용하여** 상세한 설명과 가이드를 확인하세요.
**reports를 사용하여** 프로젝트 동력과 기여자 활동을 추적하세요.

## 보고서를 찾는 곳

- **Website:** [Bluefin Blog](/blog/tags/monthly-report/)에서 모든 보고서를 조회하세요
- **RSS Feed:** [Blog RSS Feed](pathname:///blog/rss.xml)를 구독하세요
- **Blog Tag:** [`#monthly-report`](/blog/tags/monthly-report/)로 모든 월간 게시물을 필터하세요

## 자동화된 생성

보고서는 설정된 공개 소스에서 자동으로 생성됩니다:

1. 매달 첫 번째 월요일 10:00 UTC에
2. GitHub Actions 워크플로우가 보고서 입력과 프로젝트 활동을 가져옵니다
3. 스크립트는 version-two 스냅샷을 조립하고 완료된 항목을 분류합니다
4. 블로그 게시물, 보고서 기록, 기여자 캐시, 그리고 Countme 기록이 병합됩니다
5. 사이트가 재빌드되고 자동으로 배포됩니다

보고서 섹션은 누락된 측정을 0으로 변환하는 대신 사용 불가능한 소스 상태를 유지합니다. 릴리스별 패키지 노트는 Changelogs 표면에만 남습니다.

## 더 알아보기

- **Project Board:** [todo.projectbluefin.io](https://todo.projectbluefin.io)
- **이슈 제보:** [GitHub Issues](https://github.com/projectbluefin/common/issues/new)
- **개발자 문서:** 기술적 세부 정보는 documentation 저장소의 AGENTS.md를 확인하세요

---

_보고서는 Bluefin의 개발 과정에 대한 투명성을 제공합니다. OS 릴리스 세부 정보는 [Changelogs](/changelogs)를 확인하세요. 발표와 튜토리얼은 우리의 [Blog](/blog)를 읽으세요._
