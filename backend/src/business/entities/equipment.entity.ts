export const EquipmentStatus = {
  Available: "available",
  Loaned: "loaned",
} as const;
export type EquipmentStatus =
  (typeof EquipmentStatus)[keyof typeof EquipmentStatus];

export const EquipmentType = {
  Laptop: "Laptop",
  Monitor: "Monitor",
  Peripheral: "Periférico",
  Tablet: "Tablet",
} as const;
export type EquipmentType = (typeof EquipmentType)[keyof typeof EquipmentType];

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: EquipmentType;
  brand: string;
  model: string;
  status: EquipmentStatus;
  createdAt: Date;
}

export interface EquipmentInput {
  code: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
}
