declare module "@/exhibition-lab/src/ExhibitionLab" {
  import type { ComponentType } from "react";

  type ExhibitionLabProps = {
    photoUrls?: string[];
    photosEndpoint?: string;
    pollMs?: number;
    homeHref?: string;
    secondaryHref?: string;
    tertiaryHref?: string;
    logoSrc?: string;
    maxTiles?: number;
    hideChrome?: boolean;
  };

  const ExhibitionLab: ComponentType<ExhibitionLabProps>;
  export default ExhibitionLab;
}

declare module "@/exhibition-lab/src/exlabSound" {
  export function stopExlabAmbient(): void;
  export function unlockExlabAudio(): Promise<void> | void;
  export function startExlabAmbient(): void;
  export function setExlabAmbientMuted(muted: boolean): void;
  export function isExlabAmbientOn(): boolean;
}
