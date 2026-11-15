import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Episode } from "./Episode";
import { episodes, thumbnails } from "./episodes";
import { Subscribe } from "./scenes/Subscribe";
import { Thumbnail } from "./Thumbnail";
import type { SubscribeProps } from "./types";

// Список видео и превью — src/episodes.ts, его пересобирает `npm run timeline -- <id>`. Руками сюда ничего добавлять не нужно
export const Root: React.FC = () => (
  <>
    <Folder name="Episodes">
      {episodes.map((t) => (
        <Composition
          key={t.id}
          id={`E${t.id}`}
          component={Episode}
          durationInFrames={t.durationInFrames}
          fps={t.fps}
          width={t.width}
          height={t.height}
          defaultProps={{ timeline: t }}
        />
      ))}
    </Folder>
    <Folder name="Thumbnails">
      {thumbnails.map((th) => (
        <Still key={th.id} id={th.id} component={Thumbnail} width={1280} height={720} defaultProps={th.props} />
      ))}
    </Folder>
    {/* Вставки для любого ролика: прозрачный фон, рендер с альфой — npm run render:cta */}
    <Folder name="Overlays">
      <Composition id="CTA-Mid" component={Subscribe} durationInFrames={150} fps={30} width={1920} height={1080} defaultProps={{ variant: "mid" } as SubscribeProps} />
      <Composition id="CTA-End" component={Subscribe} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{ variant: "end" } as SubscribeProps} />
    </Folder>
  </>
);
