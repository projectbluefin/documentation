/**
 * Satori card template matching the OsReleaseCard on docs.projectbluefin.io/changelogs.
 * Returns a plain element tree (no JSX needed — Satori accepts plain objects).
 */

export const W = 800;
export const H = 300;

const THEMES = {
  light: {
    bg: "#ffffff",
    border: "#e5e7eb",
    text: "#374151",
    textMuted: "#6b7280",
    textStrong: "#111827",
    primaryStable: "#2f74b5",
    primaryLts: "#d97706",
    primaryDakota: "#7c3aed",
    chipBg: "#f3f4f6",
    chipBorder: "#e5e7eb",
    chipLabel: "#4b5563",
    chipValue: "#111827",
    tagColor: "#6b7280",
    baseBg: "#f3f4f6",
    baseBorder: "#e5e7eb",
    baseText: "#6b7280",
    dxLabelColor: "#9ca3af",
    footerText: "#9ca3af",
    footerBorder: "#e5e7eb",
  },
  dark: {
    bg: "#1e2235",
    border: "#374151",
    text: "#d1d5db",
    textMuted: "#9ca3af",
    textStrong: "#f1f5f9",
    primaryStable: "#5b9bd5",
    primaryLts: "#f59e0b",
    primaryDakota: "#a78bfa",
    chipBg: "#2d3348",
    chipBorder: "#4b5563",
    chipLabel: "#9ca3af",
    chipValue: "#f1f5f9",
    tagColor: "#9ca3af",
    baseBg: "#2d3348",
    baseBorder: "#4b5563",
    baseText: "#9ca3af",
    dxLabelColor: "#6b7280",
    footerText: "#6b7280",
    footerBorder: "#374151",
  },
};

function primary(stream, colors) {
  if (stream === "lts") return colors.primaryLts;
  if (stream === "dakota") return colors.primaryDakota;
  return colors.primaryStable;
}

function h(type, props, ...children) {
  const flat = children.flat(Infinity).filter(Boolean);
  return {
    type,
    props: {
      ...props,
      children:
        flat.length === 0 ? undefined : flat.length === 1 ? flat[0] : flat,
    },
  };
}

function versionChip(name, version, colors, prevVersion) {
  const changed = Boolean(prevVersion);
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        background: changed ? "rgba(234,179,8,0.10)" : colors.chipBg,
        border: `1px solid ${changed ? "rgba(234,179,8,0.40)" : colors.chipBorder}`,
        borderRadius: "6px",
        padding: "3px 9px",
        fontSize: "13px",
      },
    },
    h(
      "span",
      { style: { fontWeight: 700, color: colors.chipLabel, fontSize: "12px" } },
      name
    ),
    h(
      "span",
      {
        style: {
          color: colors.chipValue,
          fontFamily: "Inter",
          fontSize: "12px",
        },
      },
      version
    ),
    changed
      ? h(
          "span",
          {
            style: {
              color: "#d97706",
              fontSize: "10px",
              fontWeight: 700,
              lineHeight: "1",
            },
          },
          "↑"
        )
      : null
  );
}

/**
 * @param {object} release  – ParsedOsRelease-shaped object
 * @param {string} stream   – "stable" | "lts" | "dakota"
 * @param {number} dateMs   – epoch ms (0 = no date)
 * @param {"light"|"dark"} theme
 * @param {string} mascotDataUri – PNG as data URI
 * @returns Satori element tree
 */
export function renderCard(release, stream, dateMs, theme, mascotDataUri) {
  const colors = THEMES[theme];
  const accentColor = primary(stream, colors);

  const title =
    stream === "lts"
      ? "Bluefin LTS"
      : stream === "dakota"
      ? "Bluefin Dakota"
      : "Bluefin";

  const dateStr =
    dateMs > 0
      ? new Date(dateMs).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })
      : null;

  // Which packages to show as header chips (matching HEADER_CHIP_NAMES in OsReleaseCard)
  const HEADER_NAMES = [
    "Kernel", "HWE Kernel", "Gnome", "Mesa", "Podman",
    "Nvidia", "bootc", "systemd", "pipewire", "flatpak",
    "sudo-rs", "uutils-coreutils",
  ];

  const headerChips = HEADER_NAMES.flatMap((name) => {
    const pkg = (release.majorPackages ?? []).find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (pkg) return [{ name: pkg.name, version: pkg.version }];
    return [];
  });

  const dxChips = (release.dxPackages ?? []).slice(0, 6);
  const gdxChips = (release.gdxPackages ?? []).slice(0, 4);

  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: `${W}px`,
        height: `${H}px`,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "12px",
        overflow: "hidden",
        fontFamily: "Inter",
        position: "relative",
      },
    },

    // Mascot (top-right)
    mascotDataUri
      ? h("img", {
          src: mascotDataUri,
          width: 120,
          height: 120,
          style: {
            position: "absolute",
            right: "14px",
            top: "12px",
            width: "120px",
            height: "120px",
            objectFit: "contain",
            objectPosition: "right top",
            opacity: "0.9",
          },
        })
      : null,

    // Content
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: "1",
          padding: "18px 22px 14px 26px",
          gap: "0",
        },
      },

      // ── Title
      h("div", {
        style: {
          fontSize: "24px",
          fontWeight: 700,
          color: accentColor,
          lineHeight: "1.2",
          marginBottom: "5px",
          paddingRight: "135px",
        },
      }, title),

      // ── Meta row: tag + date + Fedora chip
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
            paddingRight: "135px",
          },
        },
        h("span", {
          style: {
            fontFamily: "Inter",
            fontSize: "13px",
            color: colors.tagColor,
          },
        }, release.tag),
        dateStr
          ? h("span", {
              style: { fontSize: "12px", color: colors.textMuted },
            }, dateStr)
          : null,
        release.fedoraVersion
          ? h("span", {
              style: {
                fontSize: "11px",
                color: colors.baseText,
                background: colors.baseBg,
                border: `1px solid ${colors.baseBorder}`,
                borderRadius: "4px",
                padding: "1px 7px",
              },
            }, `Fedora ${release.fedoraVersion}`)
          : null,
        release.centosVersion
          ? h("span", {
              style: {
                fontSize: "11px",
                color: colors.baseText,
                background: colors.baseBg,
                border: `1px solid ${colors.baseBorder}`,
                borderRadius: "4px",
                padding: "1px 7px",
              },
            }, `CentOS ${release.centosVersion}`)
          : null
      ),

      // ── Header chips
      headerChips.length > 0
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: dxChips.length > 0 || gdxChips.length > 0 ? "8px" : "0",
                paddingRight: "135px",
              },
            },
            ...headerChips.map((p) => versionChip(p.name, p.version, colors, p.prevVersion))
          )
        : null,

      // ── DX row
      dxChips.length > 0
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px",
                marginBottom: gdxChips.length > 0 ? "6px" : "0",
                paddingRight: "135px",
              },
            },
            h("span", {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: colors.dxLabelColor,
                flexShrink: 0,
              },
            }, "DX"),
            ...dxChips.map((p) => versionChip(p.name, p.version, colors, p.prevVersion))
          )
        : null,

      // ── GDX row
      gdxChips.length > 0
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px",
                paddingRight: "135px",
              },
            },
            h("span", {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: colors.dxLabelColor,
                flexShrink: 0,
              },
            }, "GDX"),
            ...gdxChips.map((p) => versionChip(p.name, p.version, colors, p.prevVersion))
          )
        : null,

      // ── Footer
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: "auto",
            paddingTop: "10px",
            borderTop: `1px solid ${colors.footerBorder}`,
          },
        },
        h("span", {
          style: { fontSize: "12px", color: colors.footerText },
        }, "docs.projectbluefin.io/changelogs")
      )
    )
  );
}
