// @ts-check
/**
 * Expressive Code: the code look of the site (spec §7.9).
 *
 * Two themes built from the design tokens (src/styles/tokens.css): code sits
 * on --surface in --text, marked lines are tinted with the amber accent,
 * insertions with --ok. Syntax colours stay matte and desaturated (ink blue,
 * sage, bordeaux, aubergine) and are all WCAG AA on the code background;
 * tests/unit/code-theme.test.ts checks both, against the real tokens file.
 *
 * Theme switching follows the site: html[data-theme="light" | "dark"], set
 * by the head script in Base.astro. Without JavaScript (no data-theme) the
 * generated prefers-color-scheme query applies, like the tokens do.
 *
 * Frame chrome (borders, tabs, buttons) uses the CSS tokens directly, so it
 * cannot drift from the rest of the page. Only colours that Expressive Code
 * must compute with at build time (backgrounds, syntax) are hex values.
 */
import { defineEcConfig, ExpressiveCodeTheme } from "astro-expressive-code";

export const codePalettes = {
  light: {
    bg: "#ebe7de",
    fg: "#16181a",
    accent: "#975800",
    ok: "#3f8a4f",
    del: "#86313f",
    syntax: {
      comment: "#64696c",
      keyword: "#975800",
      string: "#4a6236",
      function: "#2b4a6e",
      constant: "#86313f",
      type: "#5b4778",
      punctuation: "#4c5054",
      property: "#6a4a1c",
    },
  },
  dark: {
    bg: "#161b1e",
    fg: "#ece9e2",
    accent: "#f2b544",
    ok: "#7fc98a",
    del: "#d9a0aa",
    syntax: {
      comment: "#8d9699",
      keyword: "#f2b544",
      string: "#a9c294",
      function: "#98b4d4",
      constant: "#d9a0aa",
      type: "#bbaed6",
      punctuation: "#b6b2aa",
      property: "#dcc08a",
    },
  },
};

/** @param {"light" | "dark"} type */
function theme(type) {
  const p = codePalettes[type];
  const s = p.syntax;
  /** @param {string | string[]} scope @param {string} foreground @param {string} [fontStyle] */
  const rule = (scope, foreground, fontStyle) => ({ scope, settings: { foreground, ...(fontStyle && { fontStyle }) } });
  return new ExpressiveCodeTheme({
    name: type,
    type,
    colors: {
      "editor.background": p.bg,
      "editor.foreground": p.fg,
      "terminal.background": p.bg,
      "terminal.foreground": p.fg,
      "editor.selectionBackground": `${p.accent}33`,
      "editorLineNumber.foreground": s.comment,
      focusBorder: p.accent,
    },
    settings: [
      { settings: { foreground: p.fg, background: p.bg } },
      rule(["comment", "punctuation.definition.comment", "string.comment"], s.comment, "italic"),
      rule(
        ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"],
        s.keyword,
      ),
      rule(["keyword.operator", "punctuation", "meta.brace", "meta.delimiter"], s.punctuation),
      rule(["string", "string.quoted", "string.template", "markup.inline.raw"], s.string),
      rule(["constant.character.escape", "string.regexp"], s.constant),
      rule(["entity.name.function", "support.function", "meta.function-call", "variable.function"], s.function),
      rule(
        ["constant", "constant.numeric", "constant.language", "variable.language", "support.constant"],
        s.constant,
      ),
      rule(
        ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"],
        s.type,
      ),
      rule(["entity.name.tag", "meta.tag.sgml"], s.function),
      rule(
        [
          "entity.other.attribute-name",
          "support.type.property-name",
          "meta.object-literal.key",
          "variable.other.property",
          "meta.property-name",
        ],
        s.property,
      ),
      rule(["variable", "variable.other", "variable.parameter"], p.fg),
      rule(["markup.heading", "entity.name.section"], s.keyword),
      rule(["markup.bold"], p.fg, "bold"),
      rule(["markup.italic"], p.fg, "italic"),
      rule(["markup.underline.link", "string.other.link"], s.function),
      rule(["markup.inserted", "punctuation.definition.inserted"], s.string),
      rule(["markup.deleted", "punctuation.definition.deleted"], s.constant),
    ],
  });
}

/** @param {{ theme: { type: string } }} ctx @param {(p: typeof codePalettes.light) => string} pick */
const per = (ctx, pick) => pick(codePalettes[ctx.theme.type === "dark" ? "dark" : "light"]);

export default defineEcConfig({
  themes: [theme("light"), theme("dark")],
  themeCssSelector: (t) => `[data-theme="${t.type}"]`,
  useDarkModeMediaQuery: true,
  // The palette is AA by construction (checked by a unit test); keep its
  // exact colours instead of letting Expressive Code shift them to 5.5:1.
  minSyntaxHighlightingColorContrast: 4.5,
  defaultProps: {
    wrap: false,
  },
  styleOverrides: {
    borderRadius: "var(--radius)",
    borderWidth: "1px",
    borderColor: "var(--line)",
    codeFontFamily: "var(--font-mono)",
    codeFontSize: "0.8125rem",
    codeLineHeight: "1.7",
    codePaddingBlock: "1rem",
    codePaddingInline: "1.25rem",
    uiFontFamily: "var(--font-mono)",
    uiFontSize: "0.6875rem",
    uiLineHeight: "1.4",
    uiPaddingBlock: "0.55rem",
    uiPaddingInline: "1.25rem",
    focusBorder: "var(--accent)",
    scrollbarThumbColor: "color-mix(in srgb, var(--muted) 35%, transparent)",
    scrollbarThumbHoverColor: "color-mix(in srgb, var(--muted) 60%, transparent)",
    frames: {
      shadowColor: "transparent",
      frameBoxShadowCssValue: "none",
      editorTabBarBackground: "var(--bg)",
      editorTabBarBorderColor: "var(--line)",
      editorTabBarBorderBottomColor: "var(--line)",
      editorActiveTabBackground: (ctx) => per(ctx, (p) => p.bg),
      editorActiveTabForeground: "var(--text)",
      editorActiveTabBorderColor: "transparent",
      editorActiveTabIndicatorHeight: "1px",
      editorActiveTabIndicatorTopColor: "var(--accent)",
      editorActiveTabIndicatorBottomColor: "transparent",
      editorTabBorderRadius: "0",
      terminalTitlebarBackground: "var(--bg)",
      terminalTitlebarForeground: "var(--muted)",
      terminalTitlebarBorderBottomColor: "var(--line)",
      terminalTitlebarDotsForeground: "var(--line)",
      terminalTitlebarDotsOpacity: "1",
      terminalBackground: (ctx) => per(ctx, (p) => p.bg),
      inlineButtonForeground: "var(--muted)",
      inlineButtonBackground: "var(--text)",
      inlineButtonBorder: "var(--line)",
      inlineButtonBorderOpacity: "1",
      tooltipSuccessBackground: "var(--text)",
      tooltipSuccessForeground: "var(--bg)",
    },
    textMarkers: {
      lineMarkerAccentWidth: "2px",
      inlineMarkerBorderWidth: "1px",
      inlineMarkerBorderRadius: "2px",
      markBackground: (ctx) => per(ctx, (p) => `${p.accent}1f`),
      markBorderColor: (ctx) => per(ctx, (p) => p.accent),
      insBackground: (ctx) => per(ctx, (p) => `${p.ok}1f`),
      insBorderColor: (ctx) => per(ctx, (p) => p.ok),
      insDiffIndicatorColor: (ctx) => per(ctx, (p) => p.ok),
      delBackground: (ctx) => per(ctx, (p) => `${p.del}1c`),
      delBorderColor: (ctx) => per(ctx, (p) => p.del),
      delDiffIndicatorColor: (ctx) => per(ctx, (p) => p.del),
    },
  },
});
