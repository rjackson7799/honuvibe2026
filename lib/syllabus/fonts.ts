import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  // DM Serif Display — headings (weight 400 only, per design system)
  Font.register({
    family: 'DM Serif Display',
    src: 'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf',
    fontWeight: 400,
  });

  // DM Sans — EN body text
  Font.register({
    family: 'DM Sans',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf',
        fontWeight: 600,
      },
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf',
        fontWeight: 700,
      },
    ],
  });

  // Noto Sans JP — JP body text
  Font.register({
    family: 'Noto Sans JP',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf',
        fontWeight: 700,
      },
    ],
  });

  fontsRegistered = true;
}
