import { OrderStatus } from './constants/status';

export type Role = 'user' | 'pro' | 'agent' | 'lab' | 'admin';
export type StaffRole = Exclude<Role, 'user'>;

export interface Person {
  _id: string;
  name: string;
  phone?: string;
  village?: string;
  address?: string;
  zone?: string;
  currentLoad?: number;

  // Agents only. `busySlots` is the scheduling rule: an agent can take another
  // pickup at a different time, but never two active pickups in the same slot.
  busy?: boolean;
  busyWith?: string[];
  busySlots?: string[];
}

export interface TestItem {
  _id: string;
  name: string;
  category?: string;
  amount: number;
  isActive: boolean;
}

export interface Order {
  _id: string;
  orderId: string;
  status: OrderStatus;
  tests: string[];
  amount: number;
  paymentMode: 'cash' | 'online';
  paymentCollected: boolean;
  patient?: Person;
  assignedAgent?: Person;
  pro?: Person;
  pickupSlot?: string;
  prescriptionUrl?: string;
  // Every page of the prescription. Old orders only have prescriptionUrl.
  prescriptionUrls?: string[];
  reportUrl?: string;
  proCalled: boolean;
  proConfirmed: boolean;
  sampleTaken: boolean;
  cashTaken: boolean;
  labTube?: 'EDTA' | 'SST' | 'FLU';
  labReceivedAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusEvent {
  _id: string;
  status: OrderStatus;
  changedByStaff?: { name: string; role: StaffRole };
  note?: string;
  timestamp: string;
}

// GET /orders/my/latest returns bare null when the patient has no orders yet.
export type LatestOrder = {
  order: Order;
  stepIndex: number;
  steps: string[];
  history: StatusEvent[];
} | null;

export interface Session {
  token: string;
  role: Role;
  name?: string;
}

export interface AdminStats {
  newPrescriptions: number;
  confirmed: number;
  inLab: number;
  reportsReady: number;
  cashCollected: number;
}
