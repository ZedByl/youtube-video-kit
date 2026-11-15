// Сгенерировано scripts/lib.ts → registerEpisodes (запускается из npm run timeline). Руками не редактировать
import type { ThumbnailProps } from "./Thumbnail";
import type { Timeline } from "./types";
import t000 from "../episodes/000/timeline.json";

export const episodes: Timeline[] = [t000 as unknown as Timeline];

// thumbnails.json: [{ "id": "A", "props": ThumbnailProps }] → Still T<видео>-<id>
type Thumb = { id: string; props: ThumbnailProps };
export const thumbnails: Thumb[] = [];
