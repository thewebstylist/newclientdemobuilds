import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { theme } from "../theme";

const FILES: Record<string, string> = {
  [theme.fonts.display]: "fonts/LuckiestGuy.woff2",
  [theme.fonts.hand]: "fonts/PermanentMarker.woff2",
};

export const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      Object.entries(FILES).map(async ([family, file]) => {
        const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`);
        await face.load();
        document.fonts.add(face);
      }),
    ).then(() => continueRender(handle));
  }, [handle]);
};
