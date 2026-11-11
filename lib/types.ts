export type ProductStatus = "open" | "closed" | "soldout";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  short: string;
  image: string;
  sizes: string[];
  demand: number;
  batch1: number;
  batch2: number;
  priceAt70: number;
  priceAt100: number;
  status: ProductStatus;
  stock: number;
};

export type DemandItem = {
  productId: string;
  productName: string;
  image: string;
  size: string;
  qty: number;
  batch: 1 | 2;
  unitPrice: number | null;
  priceAt70: number;
  priceAt100: number;
  batchCount: number;
};

export type Demand = {
  id: string;
  createdAt: string;
  requesterName: string;
  role: string;
  delivery: "okul" | "kargo" | null;
  items: DemandItem[];
};
