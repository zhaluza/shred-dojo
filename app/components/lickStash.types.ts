export interface Lick {
  id: string;
  title: string;
  description: string;
  file: string;
}

export interface LickPack {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  licks: Lick[];
  available: boolean;
}
