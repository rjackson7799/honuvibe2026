import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  // DM Serif Display — headings (weight 400 only, per design system)
  Font.register({
    family: 'DM Serif Display',
    src: 'https://fonts.gstatic.com/s/dmseridisplay/v15/rnCQoNPgdFfcIBimDVrMsKJCel3A3A.ttf',
    fontWeight: 400,
  });

  // DM Sans — EN body text
  Font.register({
    family: 'DM Sans',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwA.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwArl0a9WjuJA.ttf',
        fontWeight: 600,
      },
      {
        src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAl10a9WjuJA.ttf',
        fontWeight: 700,
      },
    ],
  });

  // Noto Sans JP — JP body text
  Font.register({
    family: 'Noto Sans JP',
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi756c0rw-oME.ttf',
        fontWeight: 700,
      },
    ],
  });

  fontsRegistered = true;
}
