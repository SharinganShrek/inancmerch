export type CampaignStatus = "pending" | "active" | "locked" | "frozen" | "failed";
export type LineStatus = "waitlist" | "committed" | "overflow" | "forfeited";

export type Product = {
  id: string;
  slug: string;
  name: string;
  short: string;
  image: string;
  cost100: number;
  sizes: string[];
  seedDemand: number;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Line = {
  id: string;
  userId: string;
  productId: string;
  size: string;
  qty: number;
  status: LineStatus;
  maxPrice: number | null;
  paidAt: string | null;
  payBy: string | null;
  createdAt: string;
};

export type Store = {
  users: User[];
  items: Line[];
  locks: Record<string, string>;
  productImages: Record<string, { mime: string; v: number }>;
};

export type CampaignView = {
  demand: number;
  overflow: number;
  status: CampaignStatus;
  currentPrice: number | null;
  priceAt70: number;
  priceAt100: number;
  neededForActivation: number;
  neededForMin: number;
  paymentOpen: boolean;
  payBy: string | null;
};

export type CatalogProduct = Product &
  CampaignView & {
    mine: Line[];
  };
