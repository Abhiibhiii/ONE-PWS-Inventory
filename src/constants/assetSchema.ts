import { AssetSubcategory } from '../types';

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  headers?: string[];
}

export const ASSET_SCHEMA: Record<AssetSubcategory, FieldDefinition[]> = {
  // Hardware
  System: [
    { key: 'name', label: 'Name', type: 'text', required: true, headers: ['name', 'asset name', 'user name', 'employee name'] },
    { key: 'sysSlNo', label: 'System Serial No.', type: 'text', required: true, headers: ['serial', 's/n', 'sl no', 'sys sl no', 'system serial', 'service tag', 'serial number'] },
    { key: 'model', label: 'Model', type: 'text', headers: ['model', 'model no', 'device model'] },
    { key: 'processor', label: 'Processor', type: 'text', headers: ['processor', 'cpu', 'chipset'] },
    { key: 'ramMb', label: 'RAM (MB)', type: 'number', headers: ['ram', 'memory', 'ram mb', 'ram gb'] },
    { key: 'hddGb', label: 'HDD (GB)', type: 'number', headers: ['hdd', 'ssd', 'storage', 'disk', 'hdd gb'] },
    { key: 'os', label: 'Operating System', type: 'text', headers: ['os', 'windows', 'operating system'] },
    { key: 'ipAddress', label: 'IP Address', type: 'text', headers: ['ip', 'ip address', 'network ip'] },
    { key: 'systemName', label: 'System Name', type: 'text', headers: ['system name', 'hostname', 'pc name', 'sys name'] },
    { key: 'monitor', label: 'Monitor', type: 'text', headers: ['monitor', 'screen', 'display'] },
    { key: 'monitorSn', label: 'Monitor S/N', type: 'text', headers: ['monitor sn', 'monitor serial'] },
    { key: 'keyboard', label: 'Keyboard', type: 'text' },
    { key: 'mouse', label: 'Mouse', type: 'text' },
  ],
  Printer: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'ipAddress', label: 'IP Address', type: 'text' },
  ],
  Laptop: [
    { key: 'name', label: 'Name', type: 'text', required: true, headers: ['name', 'user', 'employee'] },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true, headers: ['serial', 's/n', 'sl no', 'service tag'] },
    { key: 'model', label: 'Model', type: 'text', headers: ['model', 'laptop model'] },
    { key: 'processor', label: 'Processor', type: 'text', headers: ['cpu', 'processor'] },
    { key: 'ramMb', label: 'RAM (MB)', type: 'number', headers: ['ram', 'memory'] },
    { key: 'hddGb', label: 'HDD (GB)', type: 'number', headers: ['hdd', 'ssd', 'storage'] },
    { key: 'os', label: 'Operating System', type: 'text', headers: ['os', 'windows'] },
  ],
  Networking: [
    { key: 'name', label: 'Device Name', type: 'text', required: true },
    { key: 'ipAddress', label: 'IP Address', type: 'text' },
    { key: 'macAddress', label: 'MAC Address', type: 'text' },
    { key: 'port', label: 'Port / Rack', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  Display: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  Others: [
    { key: 'name', label: 'Asset Name', type: 'text', required: true },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text' },
  ],

  // Software
  Mail: [
    { key: 'name', label: 'Account Name', type: 'text', required: true },
    { key: 'assignedEmail', label: 'Email ID', type: 'text' },
    { key: 'licenseType', label: 'License Type', type: 'text' },
    { key: 'sysSlNo', label: 'Account ID', type: 'text', required: true },
  ],
  'Password Sheet': [
    { key: 'name', label: 'Service Name', type: 'text', required: true },
    { key: 'username', label: 'Username', type: 'text' },
    { key: 'password', label: 'Password', type: 'text' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'sysSlNo', label: 'ID', type: 'text', required: true },
  ],
  'Master Sheet': [
    { key: 'name', label: 'Asset Name', type: 'text', required: true },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  'Project': [
    { key: 'name', label: 'Project Name', type: 'text', required: true },
    { key: 'client', label: 'Client', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'sysSlNo', label: 'Project ID', type: 'text', required: true },
  ],
  AutoCAD: [
    { key: 'name', label: 'Software Name', type: 'text', required: true },
    { key: 'licenseKey', label: 'License Key', type: 'text' },
    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { key: 'assignedUser', label: 'Assigned User', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  'Adobe Acrobat': [
    { key: 'name', label: 'Software Name', type: 'text', required: true },
    { key: 'licenseKey', label: 'License Key', type: 'text' },
    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { key: 'assignedUser', label: 'Assigned User', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  'Microsoft Office': [
    { key: 'name', label: 'Software Name', type: 'text', required: true },
    { key: 'licenseType', label: 'License Type', type: 'text' },
    { key: 'licenseKey', label: 'License Key', type: 'text' },
    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { key: 'assignedEmail', label: 'Assigned Email', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
  SAP: [
    { key: 'name', label: 'Software Name', type: 'text', required: true },
    { key: 'licenseKey', label: 'License Key', type: 'text' },
    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { key: 'assignedUser', label: 'Assigned User', type: 'text' },
    { key: 'sysSlNo', label: 'Serial No.', type: 'text', required: true },
  ],
};

export const COMMON_FIELDS: FieldDefinition[] = [
  { key: 'department', label: 'Department', type: 'text', headers: ['dept', 'department', 'section'] },
  { key: 'location', label: 'Location', type: 'text', headers: ['location', 'site', 'office', 'branch', 'workspace'] },
  { key: 'invoiceNo', label: 'Invoice No', type: 'text', headers: ['invoice', 'bill no', 'invoice no'] },
  { key: 'invoiceDate', label: 'Invoice Date', type: 'date', headers: ['date', 'invoice date', 'purchase date'] },
  { key: 'vendor', label: 'Vendor', type: 'text', headers: ['vendor', 'supplier', 'seller'] },
  { key: 'warrantyDurationMonths', label: 'Warranty (Months)', type: 'number', headers: ['warranty', 'warranty months', 'duration'] },
  { key: 'value', label: 'Value', type: 'number', headers: ['value', 'cost', 'price', 'amount'] },
  { key: 'remarks', label: 'Remarks', type: 'text', headers: ['remarks', 'notes', 'comment'] },
];
