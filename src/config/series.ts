// Copyright (c) 2026 Project Bluefin contributors.
// SPDX-License-Identifier: MIT

export interface SeriesPart {
  part: number;
  title: string;
  slug: string;
  date: string;
  published: boolean;
}

export interface BlogSeriesConfig {
  id: string;
  parts: SeriesPart[];
}

export const blogSeries: Record<string, BlogSeriesConfig> = {
  "bluefin-spring-2026": {
    id: "bluefin-spring-2026",
    parts: [
      {
        part: 1,
        title: "Bluefin Spring 2026: Fedora 44",
        slug: "bluefin-spring-2026",
        date: "May 12, 2026",
        published: false,
      },
      {
        part: 2,
        title: "Bluefin Spring 2026: Part of a Growing Ecosystem",
        slug: "bluefin-spring-2026-2",
        date: "May 13, 2026",
        published: false,
      },
      {
        part: 3,
        title: "Making Our Own Fate: Dakota Alpha 2",
        slug: "making-our-own-fate",
        date: "May 14, 2026",
        published: false,
      },
    ],
  },
};
