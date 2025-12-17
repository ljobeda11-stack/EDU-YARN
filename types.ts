export interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export enum AppMode {
  HOME = 'HOME',
  LIVE_ASSISTANT = 'LIVE_ASSISTANT',
  TTS_STUDIO = 'TTS_STUDIO'
}

export interface AudioDeviceConfig {
  sampleRate: number;
}
