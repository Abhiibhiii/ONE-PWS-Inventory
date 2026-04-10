export const getRowColorClass = (color?: string) => {
  switch (color) {
    case 'Red': return '!bg-red-100 dark:!bg-red-900/40 hover:!bg-red-200 dark:hover:!bg-red-900/50';
    case 'Violet': return '!bg-violet-100 dark:!bg-violet-900/40 hover:!bg-violet-200 dark:hover:!bg-violet-900/50';
    case 'Green': return '!bg-emerald-100 dark:!bg-emerald-900/40 hover:!bg-emerald-200 dark:hover:!bg-emerald-900/50';
    default: return 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
  }
};

export const getColumnColorClass = (color?: string) => {
  switch (color) {
    case 'Red': return 'bg-red-50 dark:bg-red-900/20';
    case 'Violet': return 'bg-violet-50 dark:bg-violet-900/20';
    case 'Green': return 'bg-emerald-50 dark:bg-emerald-900/20';
    default: return '';
  }
};

export const getAssetValue = (asset: any, key: string) => {
  if (!asset) return undefined;
  
  const isInvalid = (val: any) => 
    val === undefined || 
    val === null || 
    String(val).trim() === '' || 
    String(val).toLowerCase() === 'na' || 
    String(val).toLowerCase() === 'n/a';

  // 1. Try direct access (case sensitive)
  if (!isInvalid(asset[key])) return asset[key];
  
  // 2. Try additionalFields (case sensitive)
  if (!isInvalid(asset.additionalFields?.[key])) return asset.additionalFields[key];
  
  // 3. Fuzzy match (case insensitive, ignore spaces/dots/dashes)
  const normalize = (s: string) => s.toLowerCase().replace(/[\s._-]/g, '');
  const target = normalize(key);
  
  // Check top level keys
  const topKeys = Object.keys(asset);
  for (const k of topKeys) {
    if (normalize(k) === target) {
      if (!isInvalid(asset[k])) return asset[k];
    }
  }
  
  // Check additionalFields keys
  if (asset.additionalFields) {
    const fieldKeys = Object.keys(asset.additionalFields);
    for (const k of fieldKeys) {
      if (normalize(k) === target) {
        if (!isInvalid(asset.additionalFields[k])) return asset.additionalFields[k];
      }
    }
  }

  // 4. Special aliases for common fields
  const aliases: Record<string, string[]> = {
    name: ['systemname', 'assetname', 'username', 'employeename', 'accountname', 'servicename', 'projectname', 'softwarename', 'empname', 'full name', 'display name'],
    sysSlNo: ['serialno', 'sn', 'slno', 'serial', 'servicetag', 'accountid', 'id', 'projectid', 'syssn', 'systemserial', 'assetsn', 'assetserial'],
    model: ['devicemodel', 'modelno', 'laptopmodel', 'systemmodel', 'productmodel'],
    ipAddress: ['ip', 'networkip', 'ipaddr', 'ipv4'],
    invoiceNo: ['billno', 'invoiceno', 'receiptno', 'docno'],
    invoiceDate: ['purchasedate', 'date', 'invoicedate', 'billdate', 'receiptdate']
  };

  if (aliases[key]) {
    for (const alias of aliases[key]) {
      const val = getAssetValue(asset, alias);
      if (!isInvalid(val)) return val;
    }
  }
  
  return undefined;
};
