/**
 * Swizzled to show the language menu on docs pages only.
 *
 * Translated builds carry the core docs and nothing else (see
 * docs/skills/translations.md). On the blog and `src/pages` routes the other
 * locales have no counterpart, so every entry in the menu would lead to a 404.
 */
import React from "react";
import LocaleDropdownNavbarItem from "@theme-original/NavbarItem/LocaleDropdownNavbarItem";
import type LocaleDropdownNavbarItemType from "@theme/NavbarItem/LocaleDropdownNavbarItem";
import useRouteContext from "@docusaurus/useRouteContext";
import type { WrapperProps } from "@docusaurus/types";

type Props = WrapperProps<typeof LocaleDropdownNavbarItemType>;

function useIsDocsRoute(): boolean {
  // Routes outside any plugin (the 404 page) have no route context and throw.
  try {
    return useRouteContext().plugin.name === "docusaurus-plugin-content-docs";
  } catch {
    return false;
  }
}

export default function LocaleDropdownNavbarItemWrapper(
  props: Props,
): React.ReactElement | null {
  return useIsDocsRoute() ? <LocaleDropdownNavbarItem {...props} /> : null;
}
