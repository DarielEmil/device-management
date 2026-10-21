export const equipmentStatuses = ["Disponible", "Prestado"] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  status: EquipmentStatus;
  createdAt: Date;
}

export interface NewEquipment {
  code: string;
  name: string;
  type: string;
  brand: string;
  model: string;
}
