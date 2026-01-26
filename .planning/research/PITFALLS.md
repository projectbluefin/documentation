# Pitfalls Research: Docusaurus Technical Cleanup

**Domain:** Docusaurus static site with React 19, TypeScript, GitHub Pages deployment, and external API data fetching  
**Researched:** 2026-01-26  
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Breaking GitHub Pages Deployment Pipeline

**What goes wrong:**
Deployment pipeline stops working silently or produces 404s. Site builds locally but fails in production. Common causes:

- Incorrect `baseUrl` or `url` configuration after cleanup
- Breaking `.nojekyll` file in static directory
- Changing `trailingSlash` config without testing
- Modifying GitHub Actions workflow without understanding GitHub Pages requirements
- Breaking `organizationName` or `projectName` config

**Why it happens:**
GitHub Pages has specific requirements (trailing slashes, Jekyll bypass, base URL paths) that differ from local development. Cleanup efforts focus on code quality without testing deployment.

**How to avoid:**

1. **NEVER modify** `docusaurus.config.ts` deployment settings without testing full deployment cycle
2. **NEVER delete** `.nojekyll` file from `static/` directory
3. **Test deployment** before merging: create PR, watch GitHub Actions run, verify live URL
4. Keep `trailingSlash` config stable (currently `false` in bluefin-docs)
5. Document current working deployment config as "DO NOT MODIFY WITHOUT TESTING"

**Warning signs:**

- Build succeeds but site shows 404 or README.md
- CSS/JS assets fail to load (wrong base URL)
- GitHub Actions shows green but site doesn't update
- Links work locally but break on deployed site

**Phase to address:**
Phase 1 (Foundation) - Document current deployment config as critical infrastructure. Add deployment smoke tests.

---

### Pitfall 2: Breaking Build-Time Data Fetching

**What goes wrong:**
External API calls (GitHub releases, YouTube playlists, GitHub profiles) fail silently during build. Site builds with stale/missing data or fails entirely. Common causes:

- Rate limiting GitHub API during cleanup refactors
- Breaking fetch scripts in `scripts/` directory
- Removing `npm run fetch-data` from build pipeline
- Environment variable issues (missing `GITHUB_TOKEN`, `GH_TOKEN`)
- Network timeouts not handled gracefully

**Why it happens:**
Build-time data fetching is hidden complexity. Scripts run before Docusaurus build. Easy to break when refactoring `package.json` scripts or cleaning up "unused" code.

**How to avoid:**

1. **NEVER remove** `npm run fetch-data` from `npm run build` and `npm run start` scripts
2. **NEVER delete** files in `scripts/` directory without understanding dependencies
3. **Handle failures gracefully**: fetch scripts should warn but not break build
4. **Document API rate limits**: GitHub API has 60 req/hour without token, 5000 with token
5. **Verify all data files generate** on every build: check `static/feeds/*.json` and `static/data/*.json`
6. Add `GITHUB_TOKEN` or `GH_TOKEN` to CI/CD environment variables for rate limit increase

**Warning signs:**

- Build times suddenly much faster (scripts skipped)
- Changelogs page shows no releases
- Music playlists show placeholder data
- Contributors page missing avatars
- Build logs show fetch errors

**Phase to address:**
Phase 1 (Foundation) - Document fetch scripts as critical. Add validation that generated files exist.

---

### Pitfall 3: Swizzled Component Maintenance Hell

**What goes wrong:**
Docusaurus upgrades break swizzled components in `src/theme/`. Components stop rendering, show errors, or behave differently. Current bluefin-docs has:

- `src/theme/BlogPostItem/index.tsx` (ejected)
- `src/theme/BlogPostItem/Footer/index.tsx` (ejected)
- `src/theme/DocItem/Footer/index.tsx` (ejected)

**Why it happens:**
Swizzled components are **frozen snapshots** of theme code. When Docusaurus/theme updates, your copy doesn't. Theme internal APIs change, props change, component structure changes. "Unsafe" swizzled components are **implementation details** that will break.

**How to avoid:**

1. **Audit all swizzled components**: Run `npm run swizzle -- --list` to see what's swizzled
2. **Delete unnecessary swizzles**: If customization can be done with CSS or wrapping, delete the ejected component
3. **Prefer wrapping over ejecting**: Wrapping is safer during upgrades
4. **Document why each swizzle exists**: Add comment at top of file explaining customization
5. **Re-swizzle after major upgrades**: Compare with fresh swizzle, migrate customizations
6. **Never swizzle "unsafe" components** unless absolutely necessary

**Warning signs:**

- TypeScript errors in `src/theme/` after Docusaurus upgrade
- Components render blank or show "Component not found"
- Props warnings in browser console
- Build breaks after dependency update

**Phase to address:**
Phase 2 (TypeScript Cleanup) - Audit swizzled components, document rationale, consider unwrapping.

---

### Pitfall 4: React 19 Ecosystem Incompatibilities

**What goes wrong:**
React 19 breaking changes cause runtime errors, hydration mismatches, or visual bugs. Common issues:

- Automatic batching changes component update timing
- New hydration errors surface previously-silent issues
- Third-party React components not React 19 compatible
- Swizzled components using deprecated React patterns
- Suspense/lazy loading behavior changes

**Why it happens:**
Bluefin-docs is on React 19 (bleeding edge). Docusaurus core is React 19 compatible, but custom components and third-party libraries may not be. Cleanup can expose hidden compatibility issues.

**How to avoid:**

1. **Test all custom components** in React 19 strict mode
2. **Watch browser console** for new hydration errors
3. **Check third-party dependencies** for React 19 support before adding
4. **Test interactivity**: Don't just verify visual rendering, test clicks/forms/state
5. **Use React DevTools Profiler** to catch batching-related bugs
6. **Document React 19 as edge dependency**: Warn contributors about compatibility

**Warning signs:**

- Hydration mismatch errors in console
- Components render differently on first load vs. navigation
- Event handlers fire unexpectedly or not at all
- State updates batched differently than expected

**Phase to address:**
Phase 2 (TypeScript Cleanup) - When fixing TypeScript errors, watch for React 19 patterns.

---

### Pitfall 5: TypeScript Strict Mode Shock

**What goes wrong:**
Enabling `strict: true` in `tsconfig.json` surfaces hundreds of errors. Cleanup stalls trying to fix them all. Common errors:

- `any` types everywhere
- Missing return types
- Null/undefined not handled
- Implicit any in callbacks
- Type assertions instead of proper types

**Why it happens:**
Project started without strict mode. Incremental strictness easier than big-bang. Docusaurus v3 uses TypeScript 5.9.2 but doesn't enforce strictness.

**How to avoid:**

1. **Don't enable strict mode all at once**: Enable individual strict flags incrementally
2. **Start with `noImplicitAny`**: Easiest strict flag to tackle
3. **Use `// @ts-expect-error` strategically**: For third-party type issues
4. **Fix one component at a time**: Don't try to fix everything in one PR
5. **Some errors can be tolerated**: `npm run build` succeeds even with TypeScript errors
6. **Document current type coverage**: Baseline before making it worse

**Warning signs:**

- PR with 50+ file changes just for types
- `any` types spreading to previously-typed code
- Type errors causing merge conflicts
- Tests passing but types failing

**Phase to address:**
Phase 2 (TypeScript Cleanup) - Incremental strict mode flags, not all at once.

---

### Pitfall 6: Breaking MDX v3 Content at Scale

**What goes wrong:**
Small MDX changes break dozens of docs/blog files. Common MDX v3 issues:

- `{` and `<` characters need escaping
- Indented code blocks no longer work
- HTML comments in MDX require `{/* */}` syntax
- Directives (`:textDirective:`) parsed differently
- Emphasis around punctuation (Japanese/CJK text)
- Component imports from wrong paths

**Why it happens:**
Docusaurus 3.8.1 uses MDX v3. Content written for v1/v2 breaks. Each file may have multiple issues. 28 docs + 21 blog posts = 49 files to audit.

**How to avoid:**

1. **Run `npx docusaurus-mdx-checker`** before starting cleanup
2. **Test builds after every content change**: `npm run build` catches MDX errors
3. **Use MDX playground** (mdxjs.com/playground) to debug tricky syntax
4. **Fix files incrementally**: One doc at a time, not batch find/replace
5. **Keep MDX v1 compat options** until content migration complete
6. **Watch for visual regressions**: Build succeeds ≠ renders correctly

**Warning signs:**

- Build errors in `docs/` or `blog/` files
- Content renders as plain text instead of HTML
- Components not rendering
- Code blocks showing as paragraphs
- Unintended `<p>` tags around JSX

**Phase to address:**
Phase 3 (MDX Cleanup) - Dedicated phase for content migration.

---

### Pitfall 7: Committing Auto-Generated Files

**What goes wrong:**
Large auto-generated JSON files committed to git:

- `static/feeds/bluefin-releases.json`
- `static/feeds/bluefin-lts-releases.json`
- `static/data/playlist-metadata.json`
- `static/data/github-profiles.json`
- `static/data/github-repos.json`

Creates merge conflicts, git bloat, outdated data in repo.

**Why it happens:**
Files generated by `npm run fetch-data` before build. Easy to accidentally `git add .` and commit. CI regenerates anyway.

**How to avoid:**

1. **Verify `.gitignore`** contains these paths (already present in bluefin-docs)
2. **Remove from history** if accidentally committed: `git rm --cached <file>`
3. **Document in AGENTS.md**: "DO NOT COMMIT" warning
4. **Add pre-commit hook**: Reject commits containing these files
5. **Check git status** before every commit

**Warning signs:**

- Git diffs showing large JSON changes
- Merge conflicts in `static/feeds/` or `static/data/`
- PR with "update playlist data" commits
- Git history size growing rapidly

**Phase to address:**
Phase 1 (Foundation) - Verify gitignore, document, check for existing commits.

---

## Moderate Pitfalls

### Pitfall 8: Theme CSS Customization Overreach

**What goes wrong:**
Custom CSS in `src/css/custom.css` breaks on Docusaurus theme updates. Too much customization makes upgrades painful.

**How to avoid:**

- Use CSS variables provided by theme
- Prefer component wrapping over global CSS
- Document why each CSS rule exists
- Test with `yarn run build && yarn run serve`

**Phase to address:**
Phase 4 (CSS Cleanup) - Audit custom CSS, use theme variables.

---

### Pitfall 9: Plugin Configuration Drift

**What goes wrong:**
Docusaurus plugins update with new options. Old config still works but uses deprecated patterns. Eventually breaks.

**How to avoid:**

- Review plugin docs when upgrading Docusaurus
- Check for deprecation warnings in build output
- Test new features before using in production

**Phase to address:**
Phase 1 (Foundation) - Audit plugin configs against Docusaurus 3.8.1 docs.

---

### Pitfall 10: Development Server Reliability Issues

**What goes wrong:**
Dev server starts but crashes, hangs, or shows stale content. Common causes:

- Data fetching failures during `npm start`
- Port 3000 already in use
- Cache corruption in `.docusaurus/`
- Hot reload not working after swizzle changes

**How to avoid:**

- Always use detached mode: `npm start 2>&1 | tee /tmp/docusaurus-server.log &`
- Clear cache if issues: `npm run clear`
- Check logs: `tail -f /tmp/docusaurus-server.log`
- Restart after swizzle changes

**Phase to address:**
Phase 1 (Foundation) - Document reliable dev server workflow.

---

## Minor Pitfalls

### Pitfall 11: Package Manager Inconsistency

**What goes wrong:**
Project uses npm locally but CI uses bun. Lock files drift. Dependencies resolve differently.

**How to avoid:**

- Pick one package manager and stick with it
- Update AGENTS.md to specify which to use
- Consider adding `.npmrc` with `engine-strict=true`

**Phase to address:**
Phase 1 (Foundation) - Document package manager policy.

---

### Pitfall 12: Prettier Configuration Wars

**What goes wrong:**
Prettier doesn't support MDX v3 yet. Formatting MDX files breaks them. Many existing files have warnings.

**How to avoid:**

- Use `{/* prettier-ignore */}` for problematic MDX
- Consider disabling MDX formatting in `.prettierignore`
- Don't enforce prettier on MDX until v3 support
- Accept existing prettier warnings

**Phase to address:**
Phase 4 (Cleanup) - Add `.prettierignore` for `*.mdx` files.

---

### Pitfall 13: Search Index Staleness

**What goes wrong:**
Algolia search shows outdated content after cleanup. Users can't find new docs.

**How to avoid:**

- Understand Algolia crawler schedule
- Manually trigger recrawl after major content changes
- Test search after deployment

**Phase to address:**
Not applicable to cleanup - operational concern.

---

## Technical Debt Patterns

| Shortcut                            | Immediate Benefit   | Long-term Cost                      | When Acceptable                                             |
| ----------------------------------- | ------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Using `any` type                    | Compiles faster     | Type safety lost, errors at runtime | External library with bad types (use `// @ts-expect-error`) |
| Ejecting unsafe components          | Full customization  | Breaks on theme updates             | Only if wrapping impossible                                 |
| Skipping TypeScript strict mode     | Fewer errors to fix | Bugs slip through                   | Incrementally enable strict flags                           |
| Inline styles instead of CSS files  | Quick fixes         | Hard to maintain                    | One-off component, not reused                               |
| Hardcoding data instead of fetching | No API dependencies | Stale data                          | Truly static data that never changes                        |
| Keeping MDX v1 compat on            | Old content works   | Can't use new MDX features          | During migration phase only                                 |

## Performance Traps

| Trap                             | Symptoms                | Prevention                  | When It Breaks              |
| -------------------------------- | ----------------------- | --------------------------- | --------------------------- |
| Large auto-generated JSON in git | Slow clones, large repo | Gitignore data files        | Always bad, fix immediately |
| Fetching too much API data       | Build timeouts          | Cache responses, limit data | 100+ GitHub repos           |
| Too many swizzled components     | Slow dev server         | Delete unnecessary swizzles | 10+ swizzled components     |
| No build caching in CI           | Every build is slow     | Use GitHub Actions cache    | Always beneficial           |
| Missing `--frozen-lockfile`      | Inconsistent builds     | Add flag to CI              | Production builds           |

## "Looks Done But Isn't" Checklist

- [ ] **Build succeeds** - Verify GitHub Pages deployment URL actually works
- [ ] **Dev server starts** - Verify it stays running, doesn't crash after 5 minutes
- [ ] **TypeScript compiles** - Some errors tolerated, but verify site actually works
- [ ] **Data fetches** - Check `static/feeds/` and `static/data/` files exist and have recent data
- [ ] **Links work** - Test internal docs links, external links, blog pagination
- [ ] **Mobile responsive** - Test on phone, not just desktop
- [ ] **Search works** - Verify Algolia index updated
- [ ] **Dark mode** - Theme switcher works, no contrast issues

## Recovery Strategies

| Pitfall                        | Recovery Cost | Recovery Steps                                                                     |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| Broke deployment               | MEDIUM        | Revert commit, redeploy, test locally with `npm run serve`                         |
| Broke data fetching            | LOW           | Check `scripts/` files unchanged, verify GitHub token, re-run `npm run fetch-data` |
| Broke swizzled components      | HIGH          | Re-swizzle from theme, re-apply customizations, test thoroughly                    |
| React 19 incompatibility       | HIGH          | Downgrade dependency or rewrite component, may require ejecting                    |
| TypeScript strict mode cascade | MEDIUM        | Revert strict flag, fix errors incrementally, use `@ts-expect-error`               |
| MDX v3 content breaks          | MEDIUM        | Use MDX playground to debug, escape special chars, test each file                  |
| Committed generated files      | LOW           | `git rm --cached`, add to `.gitignore`, force push if needed                       |

## Pitfall-to-Phase Mapping

| Pitfall                           | Prevention Phase      | Verification                                                |
| --------------------------------- | --------------------- | ----------------------------------------------------------- |
| Breaking GitHub Pages deployment  | Phase 1 (Foundation)  | Create test PR, watch CI, verify deployed URL               |
| Breaking build-time data fetching | Phase 1 (Foundation)  | Run `npm run build`, verify JSON files exist, check content |
| Swizzled component maintenance    | Phase 2 (TypeScript)  | Run `npm run swizzle -- --list`, document each one          |
| React 19 incompatibilities        | Phase 2 (TypeScript)  | Open browser console, test all interactive components       |
| TypeScript strict mode shock      | Phase 2 (TypeScript)  | Enable one strict flag at a time, measure error count       |
| Breaking MDX v3 content           | Phase 3 (MDX Cleanup) | Run `npx docusaurus-mdx-checker`, fix files one by one      |
| Committing auto-generated files   | Phase 1 (Foundation)  | Check `.gitignore`, scan git history, document              |
| Theme CSS overreach               | Phase 4 (CSS Cleanup) | Audit `custom.css`, prefer theme variables                  |
| Plugin configuration drift        | Phase 1 (Foundation)  | Review plugin docs, check deprecation warnings              |
| Dev server reliability            | Phase 1 (Foundation)  | Test detached mode, document in AGENTS.md                   |
| Package manager inconsistency     | Phase 1 (Foundation)  | Pick npm or bun, document choice                            |
| Prettier + MDX conflict           | Phase 4 (Cleanup)     | Add `*.mdx` to `.prettierignore`                            |
| Search index staleness            | N/A (Operational)     | Test search after major content changes                     |

## Sources

**HIGH CONFIDENCE:**

- [Docusaurus v3 Migration Guide](https://docusaurus.io/docs/migration/v3) - Official breaking changes documentation
- [Docusaurus TypeScript Support](https://docusaurus.io/docs/typescript-support) - Official TypeScript setup guide
- [Docusaurus Swizzling](https://docusaurus.io/docs/swizzling) - Official swizzling safety guidelines
- [Docusaurus Deployment](https://docusaurus.io/docs/deployment) - GitHub Pages setup and pitfalls
- [MDX v2 Migration](https://mdxjs.com/migrating/v2/) - Breaking changes in MDX
- [MDX v3 Release](https://mdxjs.com/blog/v3/) - Additional breaking changes
- Project AGENTS.md - Current deployment and build configuration
- Project package.json - React 19, Docusaurus 3.8.1, TypeScript 5.9.2 versions
- Project git history - Recent fixes showing common issues (data fetching, MDX syntax, deployment)

**MEDIUM CONFIDENCE:**

- React 19 upgrade guide patterns (referenced in Docusaurus docs)
- TypeScript 5.x strict mode best practices

**Patterns observed from bluefin-docs codebase:**

- Multiple swizzled components in `src/theme/`
- Build-time data fetching from external APIs (GitHub, YouTube)
- React 19 on bleeding edge (most projects still on 18)
- Complex build pipeline with multiple fetch steps
- GitHub Pages deployment with custom domain support

---

_Pitfalls research for: Docusaurus technical cleanup (bluefin-docs)_  
_Researched: 2026-01-26_  
_Confidence: HIGH - Based on official Docusaurus v3 migration docs, project codebase analysis, and git history_
