import { Asset, Activity, Alert, AssetSubcategory, AssetStatus } from '../types';
import { subDays, addDays, format } from 'date-fns';

const categories: Asset['category'][] = ['Hardware', 'Software'];
const hardwareSubcategories: AssetSubcategory[] = ['System', 'Printer', 'Laptop', 'Networking', 'Display', 'Others', 'Vacant Systems (IT Stock)'];
const softwareSubcategories: AssetSubcategory[] = ['Mail', 'AutoCAD', 'Adobe Acrobat', 'Microsoft Office', 'SAP', 'Password Sheet', 'Master Sheet', 'Project'];
const statuses: AssetStatus[] = ['Active', 'In Repair', 'Move to E-Waste', 'Replaced', 'In IT Stock'];
const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Engineering'];

const generateMockAssets = (count: number): Asset[] => {
  return Array.from({ length: count }, (_, i) => {
    const purchaseDate = subDays(new Date(), Math.floor(Math.random() * 1000));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const category = categories[i % categories.length];
    const subcategory = category === 'Hardware' 
      ? hardwareSubcategories[i % hardwareSubcategories.length]
      : softwareSubcategories[i % softwareSubcategories.length];
    
    const maintenanceHistory = Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => ({
      id: `MAINT-${i}-${j}`,
      date: format(subDays(new Date(), Math.floor(Math.random() * 300)), 'yyyy-MM-dd'),
      description: ['Routine Checkup', 'Battery Replacement', 'Software Update', 'Screen Repair'][Math.floor(Math.random() * 4)],
      performedBy: ['Tech Support', 'External Vendor', 'IT Admin'][Math.floor(Math.random() * 3)],
      cost: Math.floor(Math.random() * 500),
      createdAt: format(subDays(new Date(), 300), 'yyyy-MM-dd HH:mm:ss'),
    }));

    return {
      id: `ASSET-${1000 + i}`,
      name: `${subcategory} ${100 + i}`,
      ipAddress: `192.168.1.${10 + i}`,
      systemName: `SYS-${100 + i}`,
      sysSlNo: `SN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      model: `Model-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      processor: ['Intel i5', 'Intel i7', 'AMD Ryzen 5', 'AMD Ryzen 7'][Math.floor(Math.random() * 4)],
      ramMb: [8192, 16384, 32768][Math.floor(Math.random() * 3)],
      hddGb: [256, 512, 1024][Math.floor(Math.random() * 3)],
      monitor: 'Dell 24"',
      monitorSn: `MON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      keyboard: 'Logitech K120',
      mouse: 'Logitech M100',
      os: 'Windows 11 Pro',
      licenseType: 'OEM',
      invoiceNo: `INV-${2000 + i}`,
      invoiceDate: format(purchaseDate, 'yyyy-MM-dd'),
      remarks: 'Mock asset for testing',
      category,
      subcategory,
      status: status as Asset['status'],
      assignedTo: Math.random() > 0.3 ? { userId: `user-${i % 20}`, name: `User ${i % 20}`, email: `user${i % 20}@example.com` } : null,
      department: departments[i % departments.length],
      location: `Office ${1 + (i % 5)}`,
      value: 500 + Math.floor(Math.random() * 5000),
      maintenanceHistory,
      uid: 'mock-user-id',
      createdAt: format(purchaseDate, 'yyyy-MM-dd HH:mm:ss'),
      additionalFields: {},
      warrantyDurationMonths: 12,
    };
  });
};

export const mockAssets: Asset[] = generateMockAssets(120);

export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'Create',
    message: 'New Laptop added to inventory',
    timestamp: format(subDays(new Date(), 0), 'yyyy-MM-dd HH:mm'),
    user: 'Admin User',
  },
  {
    id: '2',
    type: 'Assignment',
    message: 'Asset ASSET-1024 assigned to John Doe',
    timestamp: format(subDays(new Date(), 1), 'yyyy-MM-dd HH:mm'),
    user: 'Admin User',
  },
  {
    id: '3',
    type: 'Import',
    message: 'Bulk import of 50 assets completed',
    timestamp: format(subDays(new Date(), 2), 'yyyy-MM-dd HH:mm'),
    user: 'System',
  },
  {
    id: '4',
    type: 'Update',
    message: 'Warranty updated for ASSET-1005',
    timestamp: format(subDays(new Date(), 3), 'yyyy-MM-dd HH:mm'),
    user: 'Admin User',
  },
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'Warranty',
    severity: 'High',
    message: '15 Assets have warranties expiring in 30 days',
    suggestion: 'Initiate renewal process or plan for replacement.',
    status: 'ACTIVE',
    createdAt: new Date(),
    uid: 'mock-user-id'
  },
  {
    id: '2',
    type: 'Unassigned',
    severity: 'Medium',
    message: '8 High-value assets are currently unassigned',
    suggestion: 'Verify if these are in storage or need to be assigned to new hires.',
    status: 'ACTIVE',
    createdAt: new Date(),
    uid: 'mock-user-id'
  },
  {
    id: '3',
    type: 'Maintenance',
    severity: 'Low',
    message: 'Server SRV-001 requires routine maintenance',
    suggestion: 'Schedule maintenance window during off-peak hours.',
    status: 'ACTIVE',
    createdAt: new Date(),
    uid: 'mock-user-id'
  },
];
