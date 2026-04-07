export type AssetCategory = 'Hardware' | 'Software' | 'E-Waste';
export type AssetSubcategory = 
  | 'System' | 'Printer' | 'Laptop' | 'Networking' | 'Display' | 'Others'
  | 'Mail' | 'AutoCAD' | 'Adobe Acrobat' | 'Microsoft Office' | 'SAP' | 'Password Sheet' | 'Master Sheet' | 'Project' | string;
export type AssetStatus = 'Active' | 'In Repair' | 'Replaced' | 'Move to E-Waste' | 'E-Waste' | 'Inactive' | 'In IT Stock';
export type UserRole = 'Super Admin' | 'Admin' | 'Viewer';

export interface GatePassItem {
  srNo: number;
  materialCode: string;
  itemDescription: string;
  hsn: string;
  qty: number;
  unit: string;
  remark: string;
}

export interface GatePass {
  id: string;
  gatePassNo: string;
  createDate: string;
  plantName: string;
  transporter: string;
  receiverCode: string;
  reason: string;
  receiverName: string;
  receiverAddress: string;
  vehicleNo: string;
  gstNo: string;
  lrNo: string;
  requestedBy: string;
  deptName: string;
  remark: string;
  items: GatePassItem[];
  status: 'Pending' | 'Returned';
  createdAt: any;
  createdBy: {
    uid: string;
    name: string;
    role: string;
  };
  assetId: string;
  assetName: string;
  // Legacy fields for compatibility
  vendor?: string;
  dateOut?: string;
  expectedReturn?: string;
  actualReturnDate?: string;
  contactPerson?: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  performedBy: string;
  cost?: number;
}

export interface Asset {
  id: string;
  name: string;
  ipAddress?: string;
  dynamicIp?: string;
  systemName?: string;
  sysSlNo: string;
  model: string;
  processor?: string;
  ramMb?: number;
  hddGb?: number;
  monitor?: string;
  monitorSn?: string;
  keyboard?: string;
  mouse?: string;
  os?: string;
  licenseType?: string;
  productKey?: string;
  department?: string;
  location?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  vendor?: string;
  warrantyDurationMonths?: number;
  usbStatus?: string;
  remarks?: string;
  category: AssetCategory;
  subcategory: AssetSubcategory;
  additionalFields?: Record<string, any>;
  status: AssetStatus;
  peripheralStatus?: {
    monitor?: AssetStatus;
    keyboard?: AssetStatus;
    mouse?: AssetStatus;
  };
  assignedTo?: {
    userId: string;
    name: string;
    email?: string;
  } | null;
  value: number;
  maintenanceHistory?: MaintenanceRecord[];
  gatePassHistory?: GatePass[];
  rowColor?: 'White' | 'Red' | 'Violet' | 'Green';
  createdAt?: any;
  updatedAt?: any;
  uid: string;
}

export interface GlobalSettings {
  id: string;
  hardwareWarranty: Record<string, number>;
  softwareWarranty: Record<string, number>;
  notificationsEnabled: boolean;
  customSchemas?: Record<string, FieldDefinition[]>;
  gatePassHeaders?: Record<string, string>;
  gatePassCounter?: number;
  uid: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  headers?: string[];
  showInTable?: boolean;
  isManual?: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  alertTypes: {
    high: boolean;
    warranty: boolean;
    system: boolean;
  };
}

export interface UserStats {
  alertsHandled: number;
  actionsPerformed: number;
  lastLogin: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  joinedAt: string;
  preferences?: NotificationPreferences;
  stats?: UserStats;
}

export interface Activity {
  id: string;
  type: 'Create' | 'Update' | 'Delete' | 'Import' | 'Assignment';
  message: string;
  timestamp: string;
  user: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  actionType: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  performedByName: string;
  timestamp: any;
}

export type AlertActionType = 'CREATED' | 'ACTION_TAKEN' | 'RESOLVED' | 'AUTO_RESOLVED' | 'UPDATED';

export interface AlertAuditLog {
  id: string;
  alertId: string;
  actionType: AlertActionType;
  description: string;
  performedBy: string; // userId or 'SYSTEM'
  timestamp: any;
  metadata?: any;
}

export interface Alert {
  id: string;
  type: 'Warranty' | 'Unassigned' | 'Maintenance';
  severity: 'Low' | 'Medium' | 'High';
  message: string;
  suggestion: string;
  assetId?: string;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: any;
  resolvedAt?: any;
  actionTaken?: string;
  uid: string;
  updatedAt?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High';
  timestamp: any;
  read: boolean;
  type: 'Alert' | 'System';
  link?: string;
  uid: string;
}
