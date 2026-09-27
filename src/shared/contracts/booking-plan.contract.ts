export interface BookingPlanCreateCommandInput {
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  photo_count: number;
  retouched_photo_count: number;
  features?: string[];
}

export interface BookingPlanUpdateCommandInput {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  duration_minutes?: number;
  photo_count?: number;
  retouched_photo_count?: number;
  features?: string[];
  is_active?: boolean;
}

export interface BookingPlanRemoveCommandInput {
  id: string;
}

export type BookingPlanMeQueryInput = Record<string, never>;

export interface BookingPlanListQueryInput {
  id: string;
}
