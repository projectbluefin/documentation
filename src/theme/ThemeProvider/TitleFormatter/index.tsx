import React from "react";
import { TitleFormatterProvider } from "@docusaurus/theme-common/internal";
import type { Props } from "@theme/ThemeProvider/TitleFormatter";

type FormatterParam = Parameters<
  NonNullable<React.ComponentProps<typeof TitleFormatterProvider>["formatter"]>
>[0];

const formatter = (params: FormatterParam): string => {
  const trimmedTitle = params.title?.trim();
  if (!trimmedTitle || trimmedTitle === params.siteTitle) {
    return params.siteTitle;
  }
  return trimmedTitle;
};

export default function ThemeProviderTitleFormatter({
  children,
}: Props): React.ReactElement {
  return (
    <TitleFormatterProvider formatter={formatter}>
      {children}
    </TitleFormatterProvider>
  );
}
