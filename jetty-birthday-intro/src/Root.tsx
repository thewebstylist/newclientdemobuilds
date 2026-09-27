import React from "react";
import { Composition } from "remotion";
import { JettyBirthday } from "./JettyBirthday";
import { T } from "./timeline";

const FPS = 30;
export const Root: React.FC = () => (
  <Composition id="JettyBirthday" component={JettyBirthday}
    durationInFrames={Math.round(T.duration * FPS)} fps={FPS} width={1920} height={1080} />
);
