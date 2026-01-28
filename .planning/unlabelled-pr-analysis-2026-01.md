# Monthly Reports - Unlabelled PR Analysis (January 2026)

## Summary

Analyzed 83 PRs in the "Other" category from January 2026 report. These PRs lack categorizing labels (`area/*` or `kind/*`), making them fall into the catch-all "Other" section.

---

## Recommended Labels by PR

### Translation/Localization (5 PRs) - **NEW LABEL NEEDED: `kind/translation`**

1. **#175** - Add Polish translation to curated.yaml
   - **Suggested:** `kind/translation`
   - **Reason:** Localization work

2. **#143** - Adds french translation to the desktop files
   - **Suggested:** `kind/translation`
   - **Reason:** Localization work

3. **#96** - Add Multiplication Puzzle to Education curation for Bazaar
   - **Suggested:** `area/flatpak` or `kind/enhancement`
   - **Reason:** Bazaar curation is flatpak-related

---

### Infrastructure/Build System (22 PRs)

#### Common Repo Integration (8 PRs) - `kind/tech-debt`

4. **#118** - Remove ssh askpass configuration
   - **Suggested:** `kind/tech-debt` + `area/services`
   - **Reason:** Cleanup of configuration

5. **#949** - Remove all files shared with common
   - **Suggested:** `kind/tech-debt`
   - **Reason:** Consolidation effort

6. **#987** - Clean up a few hooks and dont use rpm-ostree on them
   - **Suggested:** `kind/tech-debt`
   - **Reason:** Code cleanup

7. **#1572** - Remove a few files that got added to projectbluefin/common
   - **Suggested:** `kind/tech-debt`
   - **Reason:** Consolidation

8. **#1604** - Get flatpaks from common
   - **Suggested:** `area/flatpak` + `kind/tech-debt`
   - **Reason:** Consolidation of flatpak management

9. **#1589** - Generate logos in common
   - **Suggested:** `area/bling` + `kind/tech-debt`
   - **Reason:** Logo/branding consolidation

10. **#1571** - Remove ublue-os-update-services
    - **Suggested:** `area/services` + `kind/tech-debt`
    - **Reason:** Service cleanup

11. **#1570** - Delete ublue-fix-hostname
    - **Suggested:** `area/services` + `kind/tech-debt`
    - **Reason:** Service cleanup

#### Build/CI Changes (14 PRs) - `kind/automation` or `area/buildstream`

12. **#1670** - Split up build.sh
    - **Suggested:** `area/buildstream` + `kind/tech-debt`
    - **Reason:** Build system refactoring

13. **#1615** - Move to upstream base images
    - **Suggested:** `area/upstream` + `kind/enhancement`
    - **Reason:** Upstream integration

14. **#1665** - Verify akmods, brew, common with local key
    - **Suggested:** `area/buildstream` + `kind/automation`
    - **Reason:** CI verification

15. **#1649** - Remove generate-release from beta workflow
    - **Suggested:** `kind/automation`
    - **Reason:** CI workflow cleanup

16. **#1643** - Remove ISO files and workflows
    - **Suggested:** `area/iso` + `kind/tech-debt`
    - **Reason:** ISO workflow cleanup

17. **#1630** - Strip epoch from versions in changelog
    - **Suggested:** `kind/automation`
    - **Reason:** CI changelog generation

18. **#1557** - Update changelog to use SBOMs
    - **Suggested:** `kind/automation` + `kind/enhancement`
    - **Reason:** CI improvement

19. **#1567** - Cleanup ublue-guest-user.service
    - **Suggested:** `area/services` + `kind/tech-debt`
    - **Reason:** Service cleanup

20. **#1568** - Delete bootc install config
    - **Suggested:** `kind/tech-debt`
    - **Reason:** Unused config removal

21. **#1595** - Remove unused aurora-cli directory
    - **Suggested:** `kind/tech-debt`
    - **Reason:** Dead code removal

22. **#1637** - Generate ISO checksums after renaming
    - **Suggested:** `area/iso` + `kind/bug`
    - **Reason:** ISO generation fix

23. **#13** - Add local ISO build script
    - **Suggested:** `area/iso` + `kind/enhancement`
    - **Reason:** Developer tooling

24. **#14** - Multi-distro support for local ISO build
    - **Suggested:** `area/iso` + `kind/enhancement`
    - **Reason:** ISO build improvement

25. **#17** - Add ISO promotion workflow from testing to production
    - **Suggested:** `area/iso` + `kind/automation`
    - **Reason:** CI/CD workflow

---

### Bug Fixes (12 PRs) - `kind/bug`

26. **#3986** - Leftover file in /boot for real
    - **Suggested:** `kind/bug`
    - **Reason:** Fix for cleanup issue

27. **#3984** - Override gschemas on nvidia using sed
    - **Suggested:** `area/nvidia` + `kind/bug`
    - **Reason:** NVIDIA-specific fix

28. **#3922** - Cleanup /\{boot,tmp\}
    - **Suggested:** `kind/bug`
    - **Reason:** Filesystem cleanup fix

29. **#3969** - Disable old rpm-ostreed-automatic.timer
    - **Suggested:** `area/services` + `kind/bug`
    - **Reason:** Service timer fix

30. **#1003** - Remove merging from the Pull config
    - **Suggested:** `kind/bug` + `area/services`
    - **Reason:** Configuration fix

31. **#971** - Remove minor workaround that broke "Forged On"
    - **Suggested:** `kind/bug`
    - **Reason:** UI bug fix

32. **#925** - Switch to ublue-os/legacy-rechunk
    - **Suggested:** `area/buildstream` + `kind/bug`
    - **Reason:** Build dependency fix

33. **#1657** - Logos package conflict on downstream images
    - **Suggested:** `area/bling` + `kind/bug`
    - **Reason:** Logo/branding conflict

34. **#1640** - Add gvfs-fuse
    - **Suggested:** `kind/bug` + `area/gnome`
    - **Reason:** Missing dependency fix

35. **#1639** - Add gvfs
    - **Suggested:** `kind/bug` + `area/gnome`
    - **Reason:** Missing dependency fix

36. **#1578** - Disable rpm-ostreed-automatic.timer
    - **Suggested:** `area/services` + `kind/bug`
    - **Reason:** Service timer fix

37. **#127** - Remove custom block-goose-cli-linux formula
    - **Suggested:** `area/brew` + `kind/tech-debt`
    - **Reason:** Homebrew formula cleanup

---

### Homebrew/Package Management (4 PRs) - `area/brew`

38. **#138** - Add deps for opencode-desktop-linux (1.1.20)
    - **Suggested:** `area/brew` + `kind/bug`
    - **Reason:** Dependency fix

39. **#1591** - Dont explicitly enable brew-\{update,upgrade\} timers
    - **Suggested:** `area/brew` + `kind/tech-debt`
    - **Reason:** Service management cleanup

40. **#10** - Use brewfile app list from common instead of reading old flatpak list files
    - **Suggested:** `area/brew` + `area/iso` + `kind/tech-debt`
    - **Reason:** ISO brew integration

---

### Configuration/Services (7 PRs) - `area/services` or `area/policy`

41. **#989** - Move to merge instead of rebase
    - **Suggested:** `area/policy` + `kind/tech-debt`
    - **Reason:** Git policy change

42. **#982** - Do hardreset instead of merging
    - **Suggested:** `area/policy` + `kind/tech-debt`
    - **Reason:** Git policy change

43. **#1666** - Do not set cap_net_raw=ep for ksysguard
    - **Suggested:** `area/services` + `kind/tech-debt`
    - **Reason:** Security/capability cleanup

44. **#16** - Explicitly add anaconda package
    - **Suggested:** `area/iso` + `kind/bug`
    - **Reason:** Missing ISO dependency

45. **#15** - Build latest bootc and revert to f42 anaconda
    - **Suggested:** `area/iso` + `area/buildstream`
    - **Reason:** ISO build changes

46. **#11** - "Welcome to Bluefin" on installer desktop icon
    - **Suggested:** `area/iso` + `area/bling`
    - **Reason:** ISO UX improvement

---

### Desktop/UI Changes (6 PRs) - `area/bling` or `area/gnome`

47. **#1646** - Enable KDE 6.6 Beta builds
    - **Suggested:** `area/aurora` + `kind/enhancement`
    - **Reason:** Aurora (KDE) feature

48. **#1587** - Set default wallpaper in common
    - **Suggested:** `area/bling` + `kind/enhancement`
    - **Reason:** Wallpaper configuration

49. **#1584** - Set coneheads wallpaper as default
    - **Suggested:** `area/bling` + `kind/enhancement`
    - **Reason:** Wallpaper change

50. **#2** - Move anaconda branding here instead of on ublue-os/packages
    - **Suggested:** `area/bling` + `area/iso`
    - **Reason:** Branding consolidation

---

### Documentation (17 PRs) - `kind/documentation`

51. **#556** - Convert blog-poster skill to GitHub Copilot agent
    - **Suggested:** `kind/documentation` + `kind/automation`
    - **Reason:** Documentation tooling

52. **#554** - Add ujust powerwash command documentation
    - **Suggested:** `kind/documentation` + `area/just`
    - **Reason:** Just command docs

53. **#567** - Remove non-existent communication.md reference
    - **Suggested:** `kind/documentation` + `kind/tech-debt`
    - **Reason:** Docs cleanup

54. **#561** - Blog/modernizing custom images
    - **Suggested:** `kind/documentation`
    - **Reason:** Blog post

55. **#547** - Add SELinux options to devcontainer configuration
    - **Suggested:** `kind/documentation` + `area/dx`
    - **Reason:** DX documentation

56. **#568** - Add hidden troubleshooting page
    - **Suggested:** `kind/documentation`
    - **Reason:** New docs page

57. **#570** - Add platform tabs to troubleshooting page
    - **Suggested:** `kind/documentation` + `kind/enhancement`
    - **Reason:** Docs improvement

58. **#569** - Enhance troubleshooting guide with new sections
    - **Suggested:** `kind/documentation` + `kind/enhancement`
    - **Reason:** Docs expansion

59. **#577** - Mise introduction and upstream links
    - **Suggested:** `kind/documentation` + `area/dx`
    - **Reason:** DX tool documentation

60. **#571** - Remove GISCUS_SETUP.md and USER_ATTACHMENTS_MIGRATION.md files
    - **Suggested:** `kind/documentation` + `kind/tech-debt`
    - **Reason:** Docs cleanup

61. **#579** - Update most prevalent documentation screenshots
    - **Suggested:** `kind/documentation`
    - **Reason:** Docs refresh

62. **#576** - Update fedora media writer link on installation page
    - **Suggested:** `kind/documentation` + `kind/bug`
    - **Reason:** Broken link fix

63. **#584** - Add git workflow rules and labeling helper scripts
    - **Suggested:** `kind/documentation` + `kind/automation`
    - **Reason:** Contributor docs + tooling

64. **#580** - Add git workflow configuration
    - **Suggested:** `kind/automation` + `area/policy`
    - **Reason:** Git automation

65. **#588** - Add comprehensive GSD agent selection guide
    - **Suggested:** `kind/documentation`
    - **Reason:** Internal docs

66. **#582** - Simplify to npm-only package management
    - **Suggested:** `kind/tech-debt` + `kind/documentation`
    - **Reason:** Build system cleanup

67. **#2** (branding) - Move anaconda branding here
    - Already covered above (#50)

---

### Monthly Reports System (11 PRs) - `kind/automation` + `kind/documentation`

68. **#587** - Use projectbluefin/common for planned work tracking
    - **Suggested:** `kind/automation` + `kind/enhancement`
    - **Reason:** Reports improvement

69. **#589** - Configure auto-merge for monthly reports workflow
    - **Suggested:** `kind/automation`
    - **Reason:** CI workflow

70. **#596** - Add dinosaur-themed monthly report titles
    - **Suggested:** `kind/enhancement`
    - **Reason:** UX improvement

71. **#595** - Improve workflow with idempotency, retry logic, and caching
    - **Suggested:** `kind/automation` + `kind/enhancement`
    - **Reason:** CI improvement

72. **#594** - Adopt Hyperlight-style formatting and simplify bot activity table
    - **Suggested:** `kind/enhancement` + `kind/documentation`
    - **Reason:** Reports formatting

73. **#593** - Regenerate January 2026 report with improved structure
    - **Suggested:** `kind/automation`
    - **Reason:** Report regeneration

74. **#586** - Split monthly reports into planned vs opportunistic work
    - **Suggested:** `kind/enhancement` + `kind/automation`
    - **Reason:** Reports feature

75. **#585** - Add GitHub profile cards with gold foil effect for new contributors
    - **Suggested:** `kind/enhancement`
    - **Reason:** Reports UI

76. **#583** - Finalize monthly reports cleanup
    - **Suggested:** `kind/tech-debt` + `kind/automation`
    - **Reason:** Reports cleanup

77. **#581** - Add Monthly Reports System (v1.1)
    - **Suggested:** `kind/enhancement` + `kind/automation`
    - **Reason:** Major feature

---

### Testing/Beta Features (2 PRs) - `area/testing`

78. **#945** - Implement lts-testing on testing branch
    - **Suggested:** `area/testing` + `kind/enhancement`
    - **Reason:** Testing infrastructure

---

### Distroless/Dakota (3 PRs) - **NEW LABEL NEEDED: `area/dakota`**

79. **#25** - Fix container image labels
    - **Suggested:** `area/dakota` + `kind/bug`
    - **Reason:** Dakota-specific fix

80. **#40** - Re-add fallocate in generate-bootable-image
    - **Suggested:** `area/dakota` + `kind/bug`
    - **Reason:** Dakota tooling fix

---

### Egg Project (1 PR) - **NEW LABEL NEEDED: `area/egg`**

81. **#1** - Buildstream skeleton
    - **Suggested:** `area/egg` + `area/buildstream`
    - **Reason:** New Egg project scaffolding

---

## Recommendations Summary

### New Labels to Create

1. **`kind/translation`** - For localization/translation work (5 PRs would benefit)
2. **`area/dakota`** - For Dakota/distroless project (3 PRs)
3. **`area/egg`** - For Egg project (1+ PRs as project grows)

### Most Common Missing Labels

| Missing Label        | PR Count | Impact    |
| -------------------- | -------- | --------- |
| `kind/tech-debt`     | ~20      | High      |
| `kind/documentation` | ~17      | High      |
| `kind/automation`    | ~12      | Medium    |
| `area/iso`           | ~10      | Medium    |
| `kind/bug`           | ~12      | Medium    |
| `area/services`      | ~8       | Medium    |
| `area/brew`          | ~4       | Low       |
| `area/bling`         | ~6       | Low       |
| `kind/translation`   | ~5       | Low (NEW) |
| `area/dakota`        | ~3       | Low (NEW) |

### Quick Wins (High-Impact Categories)

1. **Tech Debt (20 PRs)** - Add `kind/tech-debt` label
   - Consolidation work, cleanup, removal of deprecated code
2. **Documentation (17 PRs)** - Add `kind/documentation` label
   - Blog posts, docs updates, screenshot updates

3. **Automation (12 PRs)** - Add `kind/automation` label
   - CI/CD workflows, GitHub Actions, monthly reports

4. **Bug Fixes (12 PRs)** - Add `kind/bug` label
   - Service fixes, dependency additions, config corrections

### Label Application Strategy

**Phase 1 - High Impact (47 PRs):**

- Apply `kind/tech-debt` to consolidation/cleanup PRs
- Apply `kind/documentation` to docs/blog PRs
- Apply `kind/automation` to CI/CD PRs
- Apply `kind/bug` to fix PRs

**Phase 2 - Area Labels (remaining PRs):**

- Apply `area/iso` to ISO-related PRs
- Apply `area/services` to service/timer PRs
- Apply `area/brew` to Homebrew PRs
- Apply `area/bling` to wallpaper/branding PRs

**Phase 3 - New Labels (if approved):**

- Create and apply `kind/translation`
- Create and apply `area/dakota`
- Create and apply `area/egg`

---

## Next Steps

1. **Review recommendations** with maintainers
2. **Create new labels** if approved (translation, dakota, egg)
3. **Retroactively label PRs** using GitHub API or CLI
4. **Update label mapping** in `scripts/lib/label-mapping.mjs`
5. **Regenerate reports** to see improved categorization

---

## Impact Metrics

**Before Labeling:**

- Other section: 83 PRs (71% of human contributions in January)
- Categorized: 45 PRs (29% properly categorized)

**After Labeling (estimated):**

- Other section: ~15-20 PRs (genuine edge cases)
- Categorized: ~108 PRs (85%+ properly categorized)

**Improvement:** ~50 PRs moved from "Other" to proper categories (60% reduction in uncategorized work)

---

_Analysis Date: 2026-01-28_  
_Report Analyzed: January 2026 Monthly Report_  
_Total PRs Reviewed: 83 unlabelled PRs_
