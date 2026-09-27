# Jetty birthday intro (Remotion)

5-second 1920x1080 intro: a polaroid collage on a white tile floor peels away print by
print while the top-down camera rises, revealing a red/white/blue painted mural
"HAPPY BIRTHDAY JETTY!!" with balloons, cakes and a confetti burst.

- Photos go in `public/photos/p1.jpg … p5.jpg` (900x900 squares; not committed).
- Captions, layout and fly order: `src/timeline.ts`. Colors/easing: `src/theme.ts`.
- Render: `npx remotion render src/index.ts JettyBirthday out/jetty_birthday_intro.mp4 --codec h264 --crf 16`
  (in the cloud sandbox add `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`).
