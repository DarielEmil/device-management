export const equipmentStatuses = ["Disponible", "Prestado"] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

// Catálogo de tipos que maneja el frontend. El tipo recibido se normaliza a
// uno de estos valores (ver rules/equipment.ts).
export const equipmentTypes = [
  "Laptop",
  "Monitor",
  "Periférico",
  "Tablet",
] as const;
export type EquipmentType = (typeof equipmentTypes)[number];

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
