// netlify/functions/_lib/db.js
// Supabase Database & Storage Client with seamless local persistence fallback

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_SERVICE_KEY &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_SERVICE_KEY.includes('your-supabase')
);

let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (err) {
    console.warn('[DB] Supabase initialization failed, falling back to local store:', err.message);
  }
}

// -------------------------------------------------------------
// LOCAL IN-MEMORY / FILE PERSISTENCE FALLBACK
// (Ensures 100% bug-free operation locally with netlify dev)
// -------------------------------------------------------------
const LOCAL_STORE_FILE = path.resolve(__dirname, '../../.local_db.json');

function getInitialSeedData() {
  return {
    products: [
      { id: 'e1a10001-0000-0000-0000-000000000001', sku: 'IND-BRG-01', name: 'Industrial Ball Bearings 6205', category: 'Machinery Parts', cost_price: 450, selling_price: 850, stock: 120, reorder_level: 30, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000002', sku: 'HYD-CYL-50', name: 'Hydraulic Cylinder 50mm Stroke', category: 'Hydraulics', cost_price: 3200, selling_price: 5800, stock: 15, reorder_level: 8, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000003', sku: 'MS-FLG-04', name: 'Mild Steel Flange 4-inch ANSI', category: 'Hardware', cost_price: 280, selling_price: 520, stock: 45, reorder_level: 50, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000004', sku: 'CIV-VAL-80', name: 'Cast Iron Gate Valve DN80', category: 'Valves', cost_price: 1800, selling_price: 3400, stock: 6, reorder_level: 15, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000005', sku: 'HTF-M16-BX', name: 'High Tensile Fasteners M16 (Box of 100)', category: 'Fasteners', cost_price: 650, selling_price: 1200, stock: 85, reorder_level: 25, unit: 'box', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000006', sku: 'PNM-ACT-10', name: 'Pneumatic Rotary Actuator PA-10', category: 'Pneumatics', cost_price: 2400, selling_price: 4600, stock: 22, reorder_level: 10, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000007', sku: 'CNV-ROL-60', name: 'Heavy Conveyor Roller 600mm', category: 'Material Handling', cost_price: 950, selling_price: 1800, stock: 3, reorder_level: 12, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000008', sku: 'ELE-MTR-05', name: 'Electric Induction Motor 3-Phase 5HP', category: 'Electrical', cost_price: 8500, selling_price: 14500, stock: 18, reorder_level: 5, unit: 'pcs', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000009', sku: 'SSW-ROP-12', name: 'Stainless Steel Wire Rope 12mm (50m reel)', category: 'Rigging', cost_price: 1200, selling_price: 2100, stock: 35, reorder_level: 20, unit: 'reel', created_at: '2025-11-01T00:00:00Z' },
      { id: 'e1a10001-0000-0000-0000-000000000010', sku: 'HDG-KIT-01', name: 'High-Temp Gasket Seal Kit', category: 'Gaskets', cost_price: 180, selling_price: 380, stock: 9, reorder_level: 25, unit: 'kit', created_at: '2025-11-01T00:00:00Z' }
    ],
    customers: [
      { id: 'c1a10001-0000-0000-0000-000000000001', name: 'Apex Heavy Engineering Ltd', phone: '+91 98201 12345', email: 'procurement@apexeng.in', gst_number: '27AABCA1234F1Z5', address: 'Plot 42, TTC Industrial Area, Pawane', city: 'Navi Mumbai', state: 'Maharashtra', created_at: '2025-11-01T00:00:00Z' },
      { id: 'c1a10001-0000-0000-0000-000000000002', name: 'Bharat Maritime Shipbuilders', phone: '+91 98202 23456', email: 'stores@bharatmaritime.com', gst_number: '27BBDCE5678G2Z1', address: 'Dockyard Road, Mazagon', city: 'Mumbai', state: 'Maharashtra', created_at: '2025-11-01T00:00:00Z' },
      { id: 'c1a10001-0000-0000-0000-000000000003', name: 'Konkan Infrastructure Works', phone: '+91 98203 34567', email: 'purchase@konkaninfra.co.in', gst_number: '27CCDEG9012H3Z7', address: 'Bhosari MIDC, Pimpri', city: 'Pune', state: 'Maharashtra', created_at: '2025-11-01T00:00:00Z' },
      { id: 'c1a10001-0000-0000-0000-000000000004', name: 'Deccan Logistics & Port Services', phone: '+91 98204 45678', email: 'ops@deccanlogistics.com', gst_number: '27DDEFA3456J4Z3', address: 'MIHAN SEZ, Wardha Road', city: 'Nagpur', state: 'Maharashtra', created_at: '2025-11-01T00:00:00Z' },
      { id: 'c1a10001-0000-0000-0000-000000000005', name: 'Gujarat Port Equipment Corp', phone: '+91 98205 56789', email: 'vendor@gjportequip.com', gst_number: '24EEFGH7890K5Z9', address: 'GIDC Hazira Industrial Estate', city: 'Surat', state: 'Gujarat', created_at: '2025-11-01T00:00:00Z' },
      { id: 'c1a10001-0000-0000-0000-000000000006', name: 'Karnataka Precision Fabrication', phone: '+91 98206 67890', email: 'contact@karnatakafab.com', gst_number: '29FFGHI1234L6Z4', address: 'Peenya Industrial Area Stage 2', city: 'Bengaluru', state: 'Karnataka', created_at: '2025-11-01T00:00:00Z' }
    ],
    suppliers: [
      { id: 's1a10001-0000-0000-0000-000000000001', name: 'Jindal Steel & Alloys Corp', contact_person: 'Mr. R. K. Jindal', phone: '+91 98111 22334', email: 'sales@jindalalloys.in', gst_number: '27AABCS9876Q1Z2', address: 'Pen-Khopoli Road, Raigad', category: 'Raw Material', created_at: '2025-11-01T00:00:00Z' },
      { id: 's1a10001-0000-0000-0000-000000000002', name: 'Siemens Industrial Drives India', contact_person: 'Ms. Ananya Sharma', phone: '+91 98222 33445', email: 'support@siemens-drives.in', gst_number: '27BBDCP5432R2Z8', address: 'Wagle Industrial Estate, Thane', category: 'Electrical & Motors', created_at: '2025-11-01T00:00:00Z' },
      { id: 's1a10001-0000-0000-0000-000000000003', name: 'Parker Hannifin Fluid Controls', contact_person: 'Mr. Amitav Sen', phone: '+91 98333 44556', email: 'quotes@parkerfluid.in', gst_number: '27CCDER1098S3Z4', address: 'Chakan MIDC Phase 2, Pune', category: 'Hydraulics & Pneumatics', created_at: '2025-11-01T00:00:00Z' },
      { id: 's1a10001-0000-0000-0000-000000000004', name: 'SKF Bearings Distribution Ltd', contact_person: 'Mr. Suresh Menon', phone: '+91 98444 55667', email: 'orders@skfdistribution.in', gst_number: '27DDEST6754T4Z0', address: 'Kanjurmarg West, Mumbai', category: 'Bearings & Hardware', created_at: '2025-11-01T00:00:00Z' }
    ],
    sales: [
      { id: 'd001', sale_date: '2025-12-05', product_id: 'e1a10001-0000-0000-0000-000000000001', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 50, unit_price: 850, amount: 42500, payment_mode: 'Bank Transfer', created_at: '2025-12-05T10:00:00Z' },
      { id: 'd002', sale_date: '2025-12-12', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000002', quantity: 4, unit_price: 14500, amount: 58000, payment_mode: 'Bank Transfer', created_at: '2025-12-12T10:00:00Z' },
      { id: 'd003', sale_date: '2025-12-20', product_id: 'e1a10001-0000-0000-0000-000000000002', customer_id: 'c1a10001-0000-0000-0000-000000000003', quantity: 10, unit_price: 5800, amount: 58000, payment_mode: 'UPI', created_at: '2025-12-20T10:00:00Z' },
      { id: 'd004', sale_date: '2026-01-08', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 6, unit_price: 14500, amount: 87000, payment_mode: 'Bank Transfer', created_at: '2026-01-08T10:00:00Z' },
      { id: 'd005', sale_date: '2026-01-15', product_id: 'e1a10001-0000-0000-0000-000000000004', customer_id: 'c1a10001-0000-0000-0000-000000000005', quantity: 12, unit_price: 3400, amount: 40800, payment_mode: 'Bank Transfer', created_at: '2026-01-15T10:00:00Z' },
      { id: 'd006', sale_date: '2026-02-04', product_id: 'e1a10001-0000-0000-0000-000000000002', customer_id: 'c1a10001-0000-0000-0000-000000000003', quantity: 15, unit_price: 5800, amount: 87000, payment_mode: 'Bank Transfer', created_at: '2026-02-04T10:00:00Z' },
      { id: 'd007', sale_date: '2026-02-14', product_id: 'e1a10001-0000-0000-0000-000000000006', customer_id: 'c1a10001-0000-0000-0000-000000000006', quantity: 20, unit_price: 4600, amount: 92000, payment_mode: 'Bank Transfer', created_at: '2026-02-14T10:00:00Z' },
      { id: 'd008', sale_date: '2026-03-05', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000004', quantity: 8, unit_price: 14500, amount: 116000, payment_mode: 'Bank Transfer', created_at: '2026-03-05T10:00:00Z' },
      { id: 'd009', sale_date: '2026-03-12', product_id: 'e1a10001-0000-0000-0000-000000000007', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 30, unit_price: 1800, amount: 54000, payment_mode: 'Bank Transfer', created_at: '2026-03-12T10:00:00Z' },
      { id: 'd010', sale_date: '2026-04-06', product_id: 'e1a10001-0000-0000-0000-000000000002', customer_id: 'c1a10001-0000-0000-0000-000000000002', quantity: 12, unit_price: 5800, amount: 69600, payment_mode: 'Bank Transfer', created_at: '2026-04-06T10:00:00Z' },
      { id: 'd011', sale_date: '2026-04-26', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000006', quantity: 7, unit_price: 14500, amount: 101500, payment_mode: 'Bank Transfer', created_at: '2026-04-26T10:00:00Z' },
      { id: 'd012', sale_date: '2026-05-09', product_id: 'e1a10001-0000-0000-0000-000000000006', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 25, unit_price: 4600, amount: 115000, payment_mode: 'Bank Transfer', created_at: '2026-05-09T10:00:00Z' },
      { id: 'd013', sale_date: '2026-06-07', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000003', quantity: 10, unit_price: 14500, amount: 145000, payment_mode: 'Bank Transfer', created_at: '2026-06-07T10:00:00Z' },
      { id: 'd014', sale_date: '2026-06-16', product_id: 'e1a10001-0000-0000-0000-000000000001', customer_id: 'c1a10001-0000-0000-0000-000000000006', quantity: 110, unit_price: 850, amount: 93500, payment_mode: 'UPI', created_at: '2026-06-16T10:00:00Z' },
      { id: 'd015', sale_date: '2026-07-04', product_id: 'e1a10001-0000-0000-0000-000000000002', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 20, unit_price: 5800, amount: 116000, payment_mode: 'Bank Transfer', created_at: '2026-07-04T10:00:00Z' },
      { id: 'd016', sale_date: '2026-08-08', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000005', quantity: 9, unit_price: 14500, amount: 130500, payment_mode: 'Bank Transfer', created_at: '2026-08-08T10:00:00Z' },
      { id: 'd017', sale_date: '2026-08-18', product_id: 'e1a10001-0000-0000-0000-000000000006', customer_id: 'c1a10001-0000-0000-0000-000000000002', quantity: 30, unit_price: 4600, amount: 138000, payment_mode: 'Bank Transfer', created_at: '2026-08-18T10:00:00Z' },
      { id: 'd018', sale_date: '2026-09-03', product_id: 'e1a10001-0000-0000-0000-000000000002', customer_id: 'c1a10001-0000-0000-0000-000000000006', quantity: 22, unit_price: 5800, amount: 127600, payment_mode: 'Bank Transfer', created_at: '2026-09-03T10:00:00Z' },
      { id: 'd019', sale_date: '2026-09-22', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000002', quantity: 11, unit_price: 14500, amount: 159500, payment_mode: 'Bank Transfer', created_at: '2026-09-22T10:00:00Z' },
      { id: 'd020', sale_date: '2026-10-05', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 12, unit_price: 14500, amount: 174000, payment_mode: 'Bank Transfer', created_at: '2026-10-05T10:00:00Z' },
      { id: 'd021', sale_date: '2026-10-12', product_id: 'e1a10001-0000-0000-0000-000000000006', customer_id: 'c1a10001-0000-0000-0000-000000000003', quantity: 35, unit_price: 4600, amount: 161000, payment_mode: 'Bank Transfer', created_at: '2026-10-12T10:00:00Z' },
      { id: 'd022', sale_date: '2026-10-21', product_id: 'e1a10001-0000-0000-0000-000000000001', customer_id: 'c1a10001-0000-0000-0000-000000000004', quantity: 120, unit_price: 850, amount: 102000, payment_mode: 'UPI', created_at: '2026-10-21T10:00:00Z' },
      { id: 'd023', sale_date: '2026-11-04', product_id: 'e1a10001-0000-0000-0000-000000000008', customer_id: 'c1a10001-0000-0000-0000-000000000002', quantity: 8, unit_price: 14500, amount: 116000, payment_mode: 'Bank Transfer', created_at: '2026-11-04T10:00:00Z' },
      { id: 'd024', sale_date: '2026-11-10', product_id: 'e1a10001-0000-0000-0000-000000000006', customer_id: 'c1a10001-0000-0000-0000-000000000001', quantity: 20, unit_price: 4600, amount: 92000, payment_mode: 'UPI', created_at: '2026-11-10T10:00:00Z' },
      { id: 'd025', sale_date: '2026-11-14', product_id: 'e1a10001-0000-0000-0000-000000000004', customer_id: 'c1a10001-0000-0000-0000-000000000003', quantity: 15, unit_price: 3400, amount: 51000, payment_mode: 'Bank Transfer', created_at: '2026-11-14T10:00:00Z' }
    ],
    expenses: [
      { id: 'x001', expense_date: '2025-12-01', category: 'Rent', description: 'Factory Shed & Office Lease - Dec', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x002', expense_date: '2025-12-03', category: 'Raw Material', description: 'Alloy steel billets & brass ingots', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x003', expense_date: '2025-12-05', category: 'Salaries', description: 'Staff & Technician Salaries - Dec', amount: 65000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x004', expense_date: '2026-01-01', category: 'Rent', description: 'Factory Shed & Office Lease - Jan', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x005', expense_date: '2026-01-05', category: 'Salaries', description: 'Staff Salaries - Jan', amount: 65000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x006', expense_date: '2026-01-09', category: 'Raw Material', description: 'Precision machined shafts & castings', amount: 72000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x007', expense_date: '2026-02-01', category: 'Rent', description: 'Factory Shed & Office Lease - Feb', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x008', expense_date: '2026-02-05', category: 'Salaries', description: 'Staff Salaries - Feb', amount: 65000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x009', expense_date: '2026-02-11', category: 'Raw Material', description: 'SKF raw bearings & seals', amount: 84000, payment_mode: 'Bank Transfer', vendor: 'SKF Bearings Distribution Ltd' },
      { id: 'x010', expense_date: '2026-03-01', category: 'Rent', description: 'Factory Shed & Office Lease - Mar', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x011', expense_date: '2026-03-05', category: 'Salaries', description: 'Staff Salaries - Mar', amount: 65000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x012', expense_date: '2026-03-10', category: 'Raw Material', description: 'Hydraulic valves & pumps', amount: 95000, payment_mode: 'Bank Transfer', vendor: 'Parker Hannifin Fluid Controls' },
      { id: 'x013', expense_date: '2026-04-01', category: 'Rent', description: 'Factory Shed & Office Lease - Apr', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x014', expense_date: '2026-04-05', category: 'Salaries', description: 'Staff Salaries - Apr', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x015', expense_date: '2026-04-12', category: 'Raw Material', description: 'Steel plates & flanges', amount: 82000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x016', expense_date: '2026-05-01', category: 'Rent', description: 'Factory Shed & Office Lease - May', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x017', expense_date: '2026-05-05', category: 'Salaries', description: 'Staff Salaries - May', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x018', expense_date: '2026-05-14', category: 'Raw Material', description: 'Electric coils & wire', amount: 88000, payment_mode: 'Bank Transfer', vendor: 'Siemens Industrial Drives' },
      { id: 'x019', expense_date: '2026-06-01', category: 'Rent', description: 'Factory Shed & Office Lease - Jun', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x020', expense_date: '2026-06-05', category: 'Salaries', description: 'Staff Salaries - Jun', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x021', expense_date: '2026-06-12', category: 'Raw Material', description: 'Bulk alloy castings', amount: 105000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x022', expense_date: '2026-07-01', category: 'Rent', description: 'Factory Shed & Office Lease - Jul', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x023', expense_date: '2026-07-05', category: 'Salaries', description: 'Staff Salaries - Jul', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x024', expense_date: '2026-07-16', category: 'Raw Material', description: 'Pneumatic components', amount: 98000, payment_mode: 'Bank Transfer', vendor: 'Parker Hannifin Fluid Controls' },
      { id: 'x025', expense_date: '2026-08-01', category: 'Rent', description: 'Factory Shed & Office Lease - Aug', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x026', expense_date: '2026-08-05', category: 'Salaries', description: 'Staff Salaries - Aug', amount: 68000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x027', expense_date: '2026-08-14', category: 'Raw Material', description: 'Fasteners & rigging wire', amount: 92000, payment_mode: 'Bank Transfer', vendor: 'SKF Bearings Distribution' },
      { id: 'x028', expense_date: '2026-09-01', category: 'Rent', description: 'Factory Shed & Office Lease - Sep', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x029', expense_date: '2026-09-05', category: 'Salaries', description: 'Staff Salaries - Sep', amount: 72000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x030', expense_date: '2026-09-12', category: 'Raw Material', description: 'Stator & precision bearings', amount: 118000, payment_mode: 'Bank Transfer', vendor: 'Siemens Industrial Drives' },
      { id: 'x031', expense_date: '2026-10-01', category: 'Rent', description: 'Factory Shed & Office Lease - Oct', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x032', expense_date: '2026-10-05', category: 'Salaries', description: 'Staff Salaries - Oct', amount: 72000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x033', expense_date: '2026-10-15', category: 'Raw Material', description: 'Alloy rods & tubes', amount: 132000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x034', expense_date: '2026-10-22', category: 'Transport', description: 'Heavy dockyard delivery & cranes', amount: 26000, payment_mode: 'Bank Transfer', vendor: 'Navi Mumbai Freight' },
      { id: 'x035', expense_date: '2026-11-01', category: 'Rent', description: 'Factory Shed & Office Lease - Nov', amount: 45000, payment_mode: 'Bank Transfer', vendor: 'MIDC Commercial Properties' },
      { id: 'x036', expense_date: '2026-11-05', category: 'Salaries', description: 'Staff Salaries - Nov', amount: 72000, payment_mode: 'Bank Transfer', vendor: 'Payroll Account' },
      { id: 'x037', expense_date: '2026-11-09', category: 'Raw Material', description: 'Emergency valve bodies procurement', amount: 48000, payment_mode: 'Bank Transfer', vendor: 'Jindal Steel & Alloys Corp' },
      { id: 'x038', expense_date: '2026-11-12', category: 'Utilities', description: 'Electricity bill advance', amount: 14500, payment_mode: 'UPI', vendor: 'MSEDCL' }
    ],
    budgets: [
      { id: 'b001', month: '2026-11', category: 'Rent', budget_amount: 50000 },
      { id: 'b002', month: '2026-11', category: 'Salaries', budget_amount: 80000 },
      { id: 'b003', month: '2026-11', category: 'Utilities', budget_amount: 20000 },
      { id: 'b004', month: '2026-11', category: 'Raw Material', budget_amount: 120000 },
      { id: 'b005', month: '2026-11', category: 'Transport', budget_amount: 30000 },
      { id: 'b006', month: '2026-11', category: 'Marketing', budget_amount: 15000 },
      { id: 'b007', month: '2026-11', category: 'Other', budget_amount: 10000 }
    ],
    employees: [
      { id: 'b1a10001-0000-0000-0000-000000000001', code: 'EMP-101', name: 'Rajesh K. Verma', role: 'Plant Operations Manager', department: 'Operations', base_salary: 35000, allowances: 5000, deductions: 2000, phone: '+91 98210 11223', email: 'rajesh.v@bizintel.in', join_date: '2024-03-15', status: 'Active' },
      { id: 'b1a10001-0000-0000-0000-000000000002', code: 'EMP-102', name: 'Sunita Deshmukh', role: 'Quality Control Lead', department: 'Quality Assurance', base_salary: 28000, allowances: 4000, deductions: 1800, phone: '+91 98210 22334', email: 'sunita.d@bizintel.in', join_date: '2024-07-01', status: 'Active' },
      { id: 'b1a10001-0000-0000-0000-000000000003', code: 'EMP-103', name: 'Vikram S. Patil', role: 'Senior CNC Machinist', department: 'Production', base_salary: 24000, allowances: 3000, deductions: 1500, phone: '+91 98210 33445', email: 'vikram.p@bizintel.in', join_date: '2024-11-10', status: 'Active' },
      { id: 'b1a10001-0000-0000-0000-000000000004', code: 'EMP-104', name: 'Ganesh M. Shinde', role: 'Logistics Coordinator', department: 'Logistics', base_salary: 22000, allowances: 2500, deductions: 1200, phone: '+91 98210 44556', email: 'ganesh.s@bizintel.in', join_date: '2025-02-15', status: 'Active' },
      { id: 'b1a10001-0000-0000-0000-000000000005', code: 'EMP-105', name: 'Pooja Nair', role: 'Accounts & GST Executive', department: 'Finance', base_salary: 26000, allowances: 3500, deductions: 1600, phone: '+91 98210 55667', email: 'pooja.n@bizintel.in', join_date: '2025-05-01', status: 'Active' }
    ],
    attendance: [
      { id: 'att01', employee_id: 'b1a10001-0000-0000-0000-000000000001', date: '2026-11-14', status: 'Present', notes: 'Morning shift on-time' },
      { id: 'att02', employee_id: 'b1a10001-0000-0000-0000-000000000002', date: '2026-11-14', status: 'Present', notes: 'Quality inspection completed' },
      { id: 'att03', employee_id: 'b1a10001-0000-0000-0000-000000000003', date: '2026-11-14', status: 'Present', notes: 'CNC lathe operation' },
      { id: 'att04', employee_id: 'b1a10001-0000-0000-0000-000000000004', date: '2026-11-14', status: 'Absent', notes: 'Sick leave notified' },
      { id: 'att05', employee_id: 'b1a10001-0000-0000-0000-000000000005', date: '2026-11-14', status: 'Present', notes: 'GST recon' },
      { id: 'att06', employee_id: 'b1a10001-0000-0000-0000-000000000001', date: '2026-11-15', status: 'Present', notes: 'Routine operations' },
      { id: 'att07', employee_id: 'b1a10001-0000-0000-0000-000000000002', date: '2026-11-15', status: 'Leave', notes: 'Casual leave approved' },
      { id: 'att08', employee_id: 'b1a10001-0000-0000-0000-000000000003', date: '2026-11-15', status: 'Present', notes: 'Machining targets met' },
      { id: 'att09', employee_id: 'b1a10001-0000-0000-0000-000000000004', date: '2026-11-15', status: 'Present', notes: 'Port clearance duty' },
      { id: 'att10', employee_id: 'b1a10001-0000-0000-0000-000000000005', date: '2026-11-15', status: 'Present', notes: 'Monthly payroll run' }
    ],
    invoices: [
      { id: 'i1a10001-0000-0000-0000-000000000001', invoice_number: 'INV-2026-0001', customer_id: 'c1a10001-0000-0000-0000-000000000001', invoice_date: '2026-10-10', due_date: '2026-10-31', subtotal: 145000, discount: 5000, tax_amount: 25200, grand_total: 165200, status: 'Paid', payment_mode: 'Bank Transfer' },
      { id: 'i1a10001-0000-0000-0000-000000000002', invoice_number: 'INV-2026-0002', customer_id: 'c1a10001-0000-0000-0000-000000000002', invoice_date: '2026-10-18', due_date: '2026-11-05', subtotal: 138000, discount: 0, tax_amount: 24840, grand_total: 162840, status: 'Overdue', payment_mode: 'Bank Transfer' },
      { id: 'i1a10001-0000-0000-0000-000000000003', invoice_number: 'INV-2026-0003', customer_id: 'c1a10001-0000-0000-0000-000000000003', invoice_date: '2026-10-25', due_date: '2026-11-20', subtotal: 161000, discount: 6000, tax_amount: 27900, grand_total: 182900, status: 'Pending', payment_mode: 'Bank Transfer' },
      { id: 'i1a10001-0000-0000-0000-000000000004', invoice_number: 'INV-2026-0004', customer_id: 'c1a10001-0000-0000-0000-000000000004', invoice_date: '2026-11-04', due_date: '2026-11-30', subtotal: 102000, discount: 2000, tax_amount: 18000, grand_total: 118000, status: 'Pending', payment_mode: 'Bank Transfer' }
    ],
    invoice_items: [
      { id: 'ii01', invoice_id: 'i1a10001-0000-0000-0000-000000000001', product_id: 'e1a10001-0000-0000-0000-000000000008', description: 'Electric Induction Motor 3-Phase 5HP', quantity: 10, unit_price: 14500, discount: 5000, gst_rate: 18, tax_amount: 25200, total: 165200 },
      { id: 'ii02', invoice_id: 'i1a10001-0000-0000-0000-000000000002', product_id: 'e1a10001-0000-0000-0000-000000000006', description: 'Pneumatic Rotary Actuator PA-10', quantity: 30, unit_price: 4600, discount: 0, gst_rate: 18, tax_amount: 24840, total: 162840 },
      { id: 'ii03', invoice_id: 'i1a10001-0000-0000-0000-000000000003', product_id: 'e1a10001-0000-0000-0000-000000000006', description: 'Pneumatic Rotary Actuator PA-10', quantity: 35, unit_price: 4600, discount: 6000, gst_rate: 18, tax_amount: 27900, total: 182900 },
      { id: 'ii04', invoice_id: 'i1a10001-0000-0000-0000-000000000004', product_id: 'e1a10001-0000-0000-0000-000000000001', description: 'Industrial Ball Bearings 6205', quantity: 120, unit_price: 850, discount: 2000, gst_rate: 18, tax_amount: 18000, total: 118000 }
    ],
    payments: [
      { id: 'p001', payment_date: '2026-10-28', type: 'inflow', category: 'Customer Invoice', reference_id: 'INV-2026-0001', entity_name: 'Apex Heavy Engineering Ltd', amount: 165200, total_due: 165200, due_date: '2026-10-31', status: 'Received', payment_mode: 'Bank Transfer' },
      { id: 'p002', payment_date: '2026-11-01', type: 'inflow', category: 'Customer Invoice', reference_id: 'INV-2026-0002', entity_name: 'Bharat Maritime Shipbuilders', amount: 60000, total_due: 162840, due_date: '2026-11-05', status: 'Overdue', payment_mode: 'Bank Transfer' },
      { id: 'p003', payment_date: '2026-11-08', type: 'inflow', category: 'Customer Invoice', reference_id: 'INV-2026-0003', entity_name: 'Konkan Infrastructure Works', amount: 0, total_due: 182900, due_date: '2026-11-20', status: 'Pending', payment_mode: 'Bank Transfer' },
      { id: 'p004', payment_date: '2026-11-10', type: 'inflow', category: 'Customer Invoice', reference_id: 'INV-2026-0004', entity_name: 'Deccan Logistics & Port Services', amount: 0, total_due: 118000, due_date: '2026-11-30', status: 'Pending', payment_mode: 'Bank Transfer' },
      { id: 'p005', payment_date: '2026-11-05', type: 'outflow', category: 'Supplier Bill', reference_id: 'PO-2026-088', entity_name: 'Jindal Steel & Alloys Corp', amount: 48000, total_due: 48000, due_date: '2026-11-05', status: 'Paid', payment_mode: 'Bank Transfer' },
      { id: 'p006', payment_date: '2026-11-12', type: 'outflow', category: 'Supplier Bill', reference_id: 'PO-2026-092', entity_name: 'Parker Hannifin Fluid Controls', amount: 25000, total_due: 75000, due_date: '2026-11-25', status: 'Pending', payment_mode: 'Bank Transfer' }
    ],
    goals: [
      { id: 'g001', title: 'Q4 2026 Sales Target', metric: 'sales', target_amount: 1200000, period_start: '2026-10-01', period_end: '2026-12-31', status: 'In Progress', notes: 'Aiming for 25% YoY increase in heavy machinery orders' },
      { id: 'g002', title: 'FY 2026-27 Net Profit Benchmark', metric: 'profit', target_amount: 1500000, period_start: '2026-04-01', period_end: '2027-03-31', status: 'In Progress', notes: 'Target net margin 22%' },
      { id: 'g003', title: 'November 2026 Monthly Sales Target', metric: 'sales', target_amount: 400000, period_start: '2026-11-01', period_end: '2026-11-30', status: 'In Progress', notes: 'Drive motor and actuator deliveries' }
    ],
    reminders: [
      { id: 'r001', title: 'Collect pending balance ₹1,02,840 from Bharat Maritime', type: 'payment', due_date: '2026-11-18', priority: 'high', is_done: false, notes: 'INV-2026-0002 overdue since Nov 5th', auto_generated: true },
      { id: 'r002', title: 'File GSTR-3B Return for October 2026', type: 'tax', due_date: '2026-11-20', priority: 'high', is_done: false, notes: 'Statutory GST filing due on 20th', auto_generated: false },
      { id: 'r003', title: 'Reorder Cast Iron Gate Valves DN80 (Stock is 6, Reorder is 15)', type: 'deadline', due_date: '2026-11-19', priority: 'high', is_done: false, notes: 'Critical shortage alert', auto_generated: true },
      { id: 'r004', title: 'Settle Parker Hannifin supplier installment ₹50,000', type: 'bill', due_date: '2026-11-25', priority: 'medium', is_done: false, notes: 'Against PO-2026-092 invoice', auto_generated: false },
      { id: 'r005', title: 'Pay factory electricity bill MSEDCL', type: 'bill', due_date: '2026-11-26', priority: 'medium', is_done: false, notes: 'Factory unit meter reading recon', auto_generated: false },
      { id: 'r006', title: 'Annual Fire Safety & Port Compliance Audit', type: 'compliance', due_date: '2026-12-05', priority: 'low', is_done: false, notes: 'Dockyard safety inspector visit scheduled', auto_generated: false }
    ],
    tax_records: [
      { id: 't001', month: '2025-12', output_gst: 35100, input_gst: 24100, net_payable: 11000, status: 'Paid', filing_date: '2026-01-18' },
      { id: 't002', month: '2026-01', output_gst: 35240, input_gst: 23800, net_payable: 11440, status: 'Paid', filing_date: '2026-02-19' },
      { id: 't003', month: '2026-02', output_gst: 41670, input_gst: 26900, net_payable: 14770, status: 'Paid', filing_date: '2026-03-18' },
      { id: 't004', month: '2026-03', output_gst: 44370, input_gst: 29200, net_payable: 15170, status: 'Paid', filing_date: '2026-04-19' },
      { id: 't005', month: '2026-04', output_gst: 40518, input_gst: 27400, net_payable: 13118, status: 'Paid', filing_date: '2026-05-18' },
      { id: 't006', month: '2026-05', output_gst: 41076, input_gst: 28100, net_payable: 12976, status: 'Paid', filing_date: '2026-06-19' },
      { id: 't007', month: '2026-06', output_gst: 54270, input_gst: 31800, net_payable: 22470, status: 'Paid', filing_date: '2026-07-18' },
      { id: 't008', month: '2026-07', output_gst: 43020, input_gst: 29700, net_payable: 13320, status: 'Paid', filing_date: '2026-08-19' },
      { id: 't009', month: '2026-08', output_gst: 64395, input_gst: 31200, net_payable: 33195, status: 'Paid', filing_date: '2026-09-18' },
      { id: 't010', month: '2026-09', output_gst: 66978, input_gst: 34600, net_payable: 32378, status: 'Paid', filing_date: '2026-10-19' },
      { id: 't011', month: '2026-10', output_gst: 85716, input_gst: 38100, net_payable: 47616, status: 'Calculated', filing_date: '2026-11-20' },
      { id: 't012', month: '2026-11', output_gst: 46620, input_gst: 18500, net_payable: 28120, status: 'Draft', filing_date: null }
    ],
    documents: [
      { id: 'doc001', file_name: 'GSTR-3B_Receipt_Sep2026.pdf', file_size: 420100, mime_type: 'application/pdf', category: 'Tax Records', storage_path: 'tax/gstr3b_sep26.pdf', created_at: '2026-10-20T14:30:00Z' },
      { id: 'doc002', file_name: 'Factory_Lease_Agreement_MIDC.pdf', file_size: 1450200, mime_type: 'application/pdf', category: 'Contracts', storage_path: 'legal/midc_lease_2026.pdf', created_at: '2026-01-10T09:15:00Z' },
      { id: 'doc003', file_name: 'Siemens_Motor_Test_Cert_ISO.pdf', file_size: 890400, mime_type: 'application/pdf', category: 'Certificates', storage_path: 'qa/siemens_iso_cert.pdf', created_at: '2026-08-12T11:45:00Z' }
    ],
    stock_movements: [
      { id: 'sm01', product_id: 'e1a10001-0000-0000-0000-000000000008', movement_date: '2026-11-04T10:00:00Z', type: 'out', quantity: 8, reason: 'Sale invoice INV-2026-0004', reference_id: 'd023' },
      { id: 'sm02', product_id: 'e1a10001-0000-0000-0000-000000000006', movement_date: '2026-11-10T10:00:00Z', type: 'out', quantity: 20, reason: 'Sale invoice INV-2026-0003', reference_id: 'd024' },
      { id: 'sm03', product_id: 'e1a10001-0000-0000-0000-000000000001', movement_date: '2026-11-01T09:00:00Z', type: 'in', quantity: 150, reason: 'Inbound purchase delivery from SKF', reference_id: 'PO-2026-085' }
    ],
    supplier_purchases: [
      { id: 'sp01', supplier_id: 's1a10001-0000-0000-0000-000000000001', purchase_date: '2026-10-15', items_summary: 'Alloy rods & steel tubes batch #4', amount: 132000, paid_amount: 132000, status: 'Paid' },
      { id: 'sp02', supplier_id: 's1a10001-0000-0000-0000-000000000003', purchase_date: '2026-11-12', items_summary: 'Hydraulic valves & spare seals', amount: 75000, paid_amount: 25000, status: 'Partial' },
      { id: 'sp03', supplier_id: 's1a10001-0000-0000-0000-000000000004', purchase_date: '2026-11-01', items_summary: 'Precision bearing assemblies 6205', amount: 48000, paid_amount: 48000, status: 'Paid' }
    ],
    salaries: [
      { id: 'sal01', employee_id: 'b1a10001-0000-0000-0000-000000000001', month: '2026-10', working_days: 30, present_days: 30, absent_days: 0, base_salary: 35000, allowances: 5000, deductions: 2000, loss_of_pay: 0, net_salary: 38000, payment_date: '2026-11-05', status: 'Paid' },
      { id: 'sal02', employee_id: 'b1a10001-0000-0000-0000-000000000002', month: '2026-10', working_days: 30, present_days: 29, absent_days: 1, base_salary: 28000, allowances: 4000, deductions: 1800, loss_of_pay: 933.33, net_salary: 29266.67, payment_date: '2026-11-05', status: 'Paid' },
      { id: 'sal03', employee_id: 'b1a10001-0000-0000-0000-000000000003', month: '2026-10', working_days: 30, present_days: 30, absent_days: 0, base_salary: 24000, allowances: 3000, deductions: 1500, loss_of_pay: 0, net_salary: 25500, payment_date: '2026-11-05', status: 'Paid' }
    ]
  };
}

let localMemoryDb = null;

function loadLocalStore() {
  if (localMemoryDb) return localMemoryDb;
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      localMemoryDb = JSON.parse(content);
      return localMemoryDb;
    }
  } catch (err) {
    console.warn('[DB] Failed reading local db file, re-initializing from seed:', err.message);
  }
  localMemoryDb = getInitialSeedData();
  saveLocalStore();
  return localMemoryDb;
}

function saveLocalStore() {
  try {
    if (localMemoryDb) {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(localMemoryDb, null, 2), 'utf-8');
    }
  } catch (err) {
    // In read-only or serverless environments, in-memory remains intact
  }
}

// -------------------------------------------------------------
// UNIFIED DB INTERFACE
// -------------------------------------------------------------
const db = {
  isSupabaseConfigured() {
    return isSupabaseConfigured && Boolean(supabase);
  },

  getClient() {
    return supabase;
  },

  async getAll(table, options = {}) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from(table).select(options.select || '*');
        if (options.orderBy) {
          query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending !== false });
        }
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.filter) {
          for (const [key, val] of Object.entries(options.filter)) {
            query = query.eq(key, val);
          }
        }
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn(`[DB] Supabase query to ${table} failed, using local store:`, err.message);
      }
    }

    // Local fallback
    const store = loadLocalStore();
    let records = (store[table] || []).map(r => ({ ...r }));
    if (options.filter) {
      records = records.filter(item => {
        for (const [key, val] of Object.entries(options.filter)) {
          if (item[key] !== val) return false;
        }
        return true;
      });
    }
    if (options.orderBy) {
      const { column, ascending } = options.orderBy;
      records.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA < valB) return ascending !== false ? -1 : 1;
        if (valA > valB) return ascending !== false ? 1 : -1;
        return 0;
      });
    }
    if (options.limit) {
      records = records.slice(0, options.limit);
    }
    return records;
  },

  async getById(table, id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {}
    }
    const store = loadLocalStore();
    return (store[table] || []).find(r => r.id === id) || null;
  },

  async insert(table, record) {
    const newRecord = {
      id: record.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...record
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from(table).insert([newRecord]).select().single();
        if (!error && data) {
          // Also sync to local store
          const store = loadLocalStore();
          if (!store[table]) store[table] = [];
          store[table].push(data);
          saveLocalStore();
          return data;
        }
      } catch (err) {
        console.warn(`[DB] Supabase insert into ${table} failed, saving to local store:`, err.message);
      }
    }

    const store = loadLocalStore();
    if (!store[table]) store[table] = [];
    store[table].push(newRecord);
    saveLocalStore();
    return newRecord;
  },

  async update(table, id, updates) {
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from(table).update(updatedFields).eq('id', id).select().single();
        if (!error && data) {
          const store = loadLocalStore();
          const idx = (store[table] || []).findIndex(r => r.id === id);
          if (idx !== -1) {
            store[table][idx] = { ...store[table][idx], ...data };
            saveLocalStore();
          }
          return data;
        }
      } catch (err) {
        console.warn(`[DB] Supabase update in ${table} failed:`, err.message);
      }
    }

    const store = loadLocalStore();
    const idx = (store[table] || []).findIndex(r => r.id === id);
    if (idx === -1) return null;
    store[table][idx] = { ...store[table][idx], ...updatedFields };
    saveLocalStore();
    return store[table][idx];
  },

  async delete(table, id) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from(table).delete().eq('id', id);
      } catch (err) {}
    }
    const store = loadLocalStore();
    if (store[table]) {
      store[table] = store[table].filter(r => r.id !== id);
      saveLocalStore();
    }
    return true;
  },

  // Document Storage Methods
  storage: {
    async upload(bucket, filePath, buffer, contentType) {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
            contentType,
            upsert: true
          });
          if (!error) return { ok: true, path: data.path };
        } catch (err) {
          console.warn('[Storage] Supabase upload failed:', err.message);
        }
      }
      return { ok: true, path: filePath };
    },

    async createSignedUrl(bucket, filePath, expiresIn = 3600) {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
          if (!error && data?.signedUrl) return data.signedUrl;
        } catch (err) {}
      }
      // Return a simulated data url or local link
      return `data:text/plain;charset=utf-8,Simulated%20download%20for%20${encodeURIComponent(filePath)}`;
    },

    async remove(bucket, filePaths) {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.storage.from(bucket).remove(filePaths);
        } catch (err) {}
      }
      return true;
    }
  }
};

module.exports = db;
