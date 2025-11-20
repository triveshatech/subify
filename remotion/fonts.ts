const CAPTION_FONT_WEIGHTS = ["600", "700"] as const;
const DEVANAGARI_FONT_WEIGHTS = ["400", "600", "700"] as const;

type FontLoadResult = {
  fontFamily: string;
  waitUntilDone: () => Promise<void>;
};

let notoSans: FontLoadResult | null = null;
let notoSansDevanagari: FontLoadResult | null = null;
let ensurePromise: Promise<void> | null = null;

const loadFontsLazy = async () => {
  if (notoSans && notoSansDevanagari) {
    return { notoSans, notoSansDevanagari };
  }

  try {
    const [{ loadFont: loadNotoSans }, { loadFont: loadNotoSansDevanagari }] = await Promise.all([
      import("@remotion/google-fonts/NotoSans"),
      import("@remotion/google-fonts/NotoSansDevanagari"),
    ]);

    notoSans = loadNotoSans("normal", {
      weights: CAPTION_FONT_WEIGHTS.map((weight) => weight),
      subsets: ["latin", "latin-ext"],
      ignoreTooManyRequestsWarning: true,
    });

    notoSansDevanagari = loadNotoSansDevanagari("normal", {
      weights: DEVANAGARI_FONT_WEIGHTS.map((weight) => weight),
      subsets: ["devanagari"],
      ignoreTooManyRequestsWarning: true,
    });

    return { notoSans, notoSansDevanagari };
  } catch (error) {
    console.warn("Failed to load Google Fonts, using fallback fonts", error);
    // Return fallback
    return {
      notoSans: { fontFamily: "sans-serif", waitUntilDone: async () => {} },
      notoSansDevanagari: { fontFamily: "sans-serif", waitUntilDone: async () => {} },
    };
  }
};

export const ensureCaptionFonts = async () => {
  if (!ensurePromise) {
    ensurePromise = loadFontsLazy().then(async (fonts) => {
      await Promise.all([
        fonts.notoSans.waitUntilDone(),
        fonts.notoSansDevanagari.waitUntilDone(),
      ]);
    });
  }
  return ensurePromise;
};

export const getCaptionFontStack = async (): Promise<string> => {
  const fonts = await loadFontsLazy();
  return `"${fonts.notoSans.fontFamily}", "${fonts.notoSansDevanagari.fontFamily}", sans-serif`;
};

// Fallback constant for synchronous contexts
export const CAPTION_FONT_STACK = `"Noto Sans", "Noto Sans Devanagari", sans-serif`;
