// Tenant and User Types
export type TenantId = 'sonelgaz' | 'saeig';

export interface Tenant {
  id: TenantId;
  name: string;
  logo: string;
  logoImage?: string;
  accentColor: string;
  accentColorDark: string;
}

export type UserRole = 'super_admin' | 'operator' | 'support';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: TenantId;
}

// Station Types
export type StationStatus = 'available' | 'charging' | 'offline' | 'fault';
export type ConnectorType = 'CCS2' | 'CHAdeMO' | 'Type 2';

export interface Station {
  id: string;
  name: string;
  city: string;
  address: string;
  connectorType: ConnectorType;
  power: number; // kW - CCS2: 240kW, CHAdeMO: 60kW, Type 2: varies (7-22kW)
  status: StationStatus;
  tenantId: TenantId;
  latitude: number;
  longitude: number;
  activeConnectors: number;
  totalConnectors: number;
  currentTariff: number;
}

// Session Types
export type SessionStatus = 'active' | 'completed' | 'stopped' | 'error';

export interface Session {
  id: string;
  stationName: string;
  connector: string;
  userIdentifier: string;
  startTime: Date;
  duration: number;
  energyKwh: number;
  cost: number;
  status: SessionStatus;
  tenantId: TenantId;
}

// Ticket Types
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  stationName: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenantId: TenantId;
  slaDeadline: Date;
}

export interface TicketActivity {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
  details: string;
}

// Billing Types
export type PaymentStatus = 'paid' | 'unpaid' | 'refund';
export type PaymentMethod = 'rfid_card' | 'cib' | 'epayment';

export interface BillingRecord {
  id: string;
  invoiceNumber: string;
  stationName: string;
  sessions: number;
  energyKwh: number;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  processingTime?: number; // in seconds
  failed?: boolean; // if transaction failed
  date: Date;
  tenantId: TenantId;
}

export interface PaymentMethodStats {
  method: PaymentMethod;
  totalRevenue: number;
  percentage: number;
  successRate: number;
  failedCount: number;
  avgProcessingTime: number;
  transactionCount: number;
}

// KPI Types
export interface KPIData {
  activeStations: number;
  activeSessions: number;
  totalEnergy: number;
  totalRevenue: number;
  faults: number;
  activeStationsTrend: number;
  activeSessionsTrend: number;
  totalEnergyTrend: number;
  totalRevenueTrend: number;
  faultsTrend: number;
}

// Alert Types
export type AlertSeverity = 'info' | 'warning' | 'error';

export interface Alert {
  id: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  stationName?: string;
}