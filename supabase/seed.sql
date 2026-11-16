-- AI Business Intelligence System - Seed Data
-- 12+ Months of realistic business data (spanning late 2025 through late 2026)

-- 1. SEED PRODUCTS
INSERT INTO products (id, sku, name, category, cost_price, selling_price, stock, reorder_level, unit) VALUES
('e1a10001-0000-0000-0000-000000000001', 'IND-BRG-01', 'Industrial Ball Bearings 6205', 'Machinery Parts', 450.00, 850.00, 120, 30, 'pcs'),
('e1a10001-0000-0000-0000-000000000002', 'HYD-CYL-50', 'Hydraulic Cylinder 50mm Stroke', 'Hydraulics', 3200.00, 5800.00, 15, 8, 'pcs'),
('e1a10001-0000-0000-0000-000000000003', 'MS-FLG-04', 'Mild Steel Flange 4-inch ANSI', 'Hardware', 280.00, 520.00, 45, 50, 'pcs'), -- Low Stock
('e1a10001-0000-0000-0000-000000000004', 'CIV-VAL-80', 'Cast Iron Gate Valve DN80', 'Valves', 1800.00, 3400.00, 6, 15, 'pcs'), -- Critical Low Stock
('e1a10001-0000-0000-0000-000000000005', 'HTF-M16-BX', 'High Tensile Fasteners M16 (Box of 100)', 'Fasteners', 650.00, 1200.00, 85, 25, 'box'),
('e1a10001-0000-0000-0000-000000000006', 'PNM-ACT-10', 'Pneumatic Rotary Actuator PA-10', 'Pneumatics', 2400.00, 4600.00, 22, 10, 'pcs'),
('e1a10001-0000-0000-0000-000000000007', 'CNV-ROL-60', 'Heavy Conveyor Roller 600mm', 'Material Handling', 950.00, 1800.00, 3, 12, 'pcs'), -- Critical Low Stock
('e1a10001-0000-0000-0000-000000000008', 'ELE-MTR-05', 'Electric Induction Motor 3-Phase 5HP', 'Electrical', 8500.00, 14500.00, 18, 5, 'pcs'),
('e1a10001-0000-0000-0000-000000000009', 'SSW-ROP-12', 'Stainless Steel Wire Rope 12mm (50m reel)', 'Rigging', 1200.00, 2100.00, 35, 20, 'reel'),
('e1a10001-0000-0000-0000-000000000010', 'HDG-KIT-01', 'High-Temp Gasket Seal Kit', 'Gaskets', 180.00, 380.00, 9, 25, 'kit') -- Critical Low Stock
ON CONFLICT (id) DO NOTHING;

-- 2. SEED CUSTOMERS
INSERT INTO customers (id, name, phone, email, gst_number, address, city, state) VALUES
('c1a10001-0000-0000-0000-000000000001', 'Apex Heavy Engineering Ltd', '+91 98201 12345', 'procurement@apexeng.in', '27AABCA1234F1Z5', 'Plot 42, TTC Industrial Area, Pawane', 'Navi Mumbai', 'Maharashtra'),
('c1a10001-0000-0000-0000-000000000002', 'Bharat Maritime Shipbuilders', '+91 98202 23456', 'stores@bharatmaritime.com', '27BBDCE5678G2Z1', 'Dockyard Road, Mazagon', 'Mumbai', 'Maharashtra'),
('c1a10001-0000-0000-0000-000000000003', 'Konkan Infrastructure Works', '+91 98203 34567', 'purchase@konkaninfra.co.in', '27CCDEG9012H3Z7', 'Bhosari MIDC, Pimpri', 'Pune', 'Maharashtra'),
('c1a10001-0000-0000-0000-000000000004', 'Deccan Logistics & Port Services', '+91 98204 45678', 'ops@deccanlogistics.com', '27DDEFA3456J4Z3', 'MIHAN SEZ, Wardha Road', 'Nagpur', 'Maharashtra'),
('c1a10001-0000-0000-0000-000000000005', 'Gujarat Port Equipment Corp', '+91 98205 56789', 'vendor@gjportequip.com', '24EEFGH7890K5Z9', 'GIDC Hazira Industrial Estate', 'Surat', 'Gujarat'),
('c1a10001-0000-0000-0000-000000000006', 'Karnataka Precision Fabrication', '+91 98206 67890', 'contact@karnatakafab.com', '29FFGHI1234L6Z4', 'Peenya Industrial Area Stage 2', 'Bengaluru', 'Karnataka')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED SUPPLIERS
INSERT INTO suppliers (id, name, contact_person, phone, email, gst_number, address, category) VALUES
('s1a10001-0000-0000-0000-000000000001', 'Jindal Steel & Alloys Corp', 'Mr. R. K. Jindal', '+91 98111 22334', 'sales@jindalalloys.in', '27AABCS9876Q1Z2', 'Pen-Khopoli Road, Raigad', 'Raw Material'),
('s1a10001-0000-0000-0000-000000000002', 'Siemens Industrial Drives India', 'Ms. Ananya Sharma', '+91 98222 33445', 'support@siemens-drives.in', '27BBDCP5432R2Z8', 'Wagle Industrial Estate, Thane', 'Electrical & Motors'),
('s1a10001-0000-0000-0000-000000000003', 'Parker Hannifin Fluid Controls', 'Mr. Amitav Sen', '+91 98333 44556', 'quotes@parkerfluid.in', '27CCDER1098S3Z4', 'Chakan MIDC Phase 2, Pune', 'Hydraulics & Pneumatics'),
('s1a10001-0000-0000-0000-000000000004', 'SKF Bearings Distribution Ltd', 'Mr. Suresh Menon', '+91 98444 55667', 'orders@skfdistribution.in', '27DDEST6754T4Z0', 'Kanjurmarg West, Mumbai', 'Bearings & Hardware')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED SALES (12+ Months from Dec 2025 through Nov 2026)
INSERT INTO sales (sale_date, product_id, customer_id, quantity, unit_price, amount, payment_mode) VALUES
-- Dec 2025
('2025-12-05', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000001', 50, 850.00, 42500.00, 'Bank Transfer'),
('2025-12-12', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000002', 4, 14500.00, 58000.00, 'Bank Transfer'),
('2025-12-20', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000003', 10, 5800.00, 58000.00, 'UPI'),
('2025-12-28', 'e1a10001-0000-0000-0000-000000000005', 'c1a10001-0000-0000-0000-000000000004', 30, 1200.00, 36000.00, 'Cheque'),
-- Jan 2026
('2026-01-08', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000001', 6, 14500.00, 87000.00, 'Bank Transfer'),
('2026-01-15', 'e1a10001-0000-0000-0000-000000000004', 'c1a10001-0000-0000-0000-000000000005', 12, 3400.00, 40800.00, 'Bank Transfer'),
('2026-01-22', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000002', 80, 850.00, 68000.00, 'UPI'),
-- Feb 2026
('2026-02-04', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000003', 15, 5800.00, 87000.00, 'Bank Transfer'),
('2026-02-14', 'e1a10001-0000-0000-0000-000000000006', 'c1a10001-0000-0000-0000-000000000006', 20, 4600.00, 92000.00, 'Bank Transfer'),
('2026-02-25', 'e1a10001-0000-0000-0000-000000000009', 'c1a10001-0000-0000-0000-000000000002', 25, 2100.00, 52500.00, 'UPI'),
-- Mar 2026
('2026-03-05', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000004', 8, 14500.00, 116000.00, 'Bank Transfer'),
('2026-03-12', 'e1a10001-0000-0000-0000-000000000007', 'c1a10001-0000-0000-0000-000000000001', 30, 1800.00, 54000.00, 'Bank Transfer'),
('2026-03-24', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000005', 90, 850.00, 76500.00, 'UPI'),
-- Apr 2026
('2026-04-06', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000002', 12, 5800.00, 69600.00, 'Bank Transfer'),
('2026-04-18', 'e1a10001-0000-0000-0000-000000000005', 'c1a10001-0000-0000-0000-000000000003', 45, 1200.00, 54000.00, 'Cheque'),
('2026-04-26', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000006', 7, 14500.00, 101500.00, 'Bank Transfer'),
-- May 2026
('2026-05-09', 'e1a10001-0000-0000-0000-000000000006', 'c1a10001-0000-0000-0000-000000000001', 25, 4600.00, 115000.00, 'Bank Transfer'),
('2026-05-19', 'e1a10001-0000-0000-0000-000000000004', 'c1a10001-0000-0000-0000-000000000004', 18, 3400.00, 61200.00, 'Bank Transfer'),
('2026-05-28', 'e1a10001-0000-0000-0000-000000000003', 'c1a10001-0000-0000-0000-000000000002', 100, 520.00, 52000.00, 'UPI'),
-- Jun 2026
('2026-06-07', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000003', 10, 14500.00, 145000.00, 'Bank Transfer'),
('2026-06-16', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000006', 110, 850.00, 93500.00, 'UPI'),
('2026-06-25', 'e1a10001-0000-0000-0000-000000000009', 'c1a10001-0000-0000-0000-000000000005', 30, 2100.00, 63000.00, 'Bank Transfer'),
-- Jul 2026
('2026-07-04', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000001', 20, 5800.00, 116000.00, 'Bank Transfer'),
('2026-07-15', 'e1a10001-0000-0000-0000-000000000007', 'c1a10001-0000-0000-0000-000000000002', 35, 1800.00, 63000.00, 'Bank Transfer'),
('2026-07-28', 'e1a10001-0000-0000-0000-000000000005', 'c1a10001-0000-0000-0000-000000000004', 50, 1200.00, 60000.00, 'Cheque'),
-- Aug 2026
('2026-08-08', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000005', 9, 14500.00, 130500.00, 'Bank Transfer'),
('2026-08-18', 'e1a10001-0000-0000-0000-000000000006', 'c1a10001-0000-0000-0000-000000000002', 30, 4600.00, 138000.00, 'Bank Transfer'),
('2026-08-27', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000003', 105, 850.00, 89250.00, 'UPI'),
-- Sep 2026
('2026-09-03', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000006', 22, 5800.00, 127600.00, 'Bank Transfer'),
('2026-09-14', 'e1a10001-0000-0000-0000-000000000004', 'c1a10001-0000-0000-0000-000000000001', 25, 3400.00, 85000.00, 'Bank Transfer'),
('2026-09-22', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000002', 11, 14500.00, 159500.00, 'Bank Transfer'),
-- Oct 2026
('2026-10-05', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000001', 12, 14500.00, 174000.00, 'Bank Transfer'),
('2026-10-12', 'e1a10001-0000-0000-0000-000000000006', 'c1a10001-0000-0000-0000-000000000003', 35, 4600.00, 161000.00, 'Bank Transfer'),
('2026-10-21', 'e1a10001-0000-0000-0000-000000000001', 'c1a10001-0000-0000-0000-000000000004', 120, 850.00, 102000.00, 'UPI'),
('2026-10-29', 'e1a10001-0000-0000-0000-000000000002', 'c1a10001-0000-0000-0000-000000000005', 24, 5800.00, 139200.00, 'Bank Transfer'),
-- Nov 2026 (Current local month)
('2026-11-04', 'e1a10001-0000-0000-0000-000000000008', 'c1a10001-0000-0000-0000-000000000002', 8, 14500.00, 116000.00, 'Bank Transfer'),
('2026-11-10', 'e1a10001-0000-0000-0000-000000000006', 'c1a10001-0000-0000-0000-000000000001', 20, 4600.00, 92000.00, 'UPI'),
('2026-11-14', 'e1a10001-0000-0000-0000-000000000004', 'c1a10001-0000-0000-0000-000000000003', 15, 3400.00, 51000.00, 'Bank Transfer');

-- 5. SEED EXPENSES (12+ Months)
INSERT INTO expenses (expense_date, category, description, amount, payment_mode, vendor) VALUES
-- Dec 2025
('2025-12-01', 'Rent', 'Factory Shed & Office Lease - Dec', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2025-12-03', 'Raw Material', 'Alloy steel billets & brass ingots', 68000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2025-12-05', 'Salaries', 'Staff & Technician Salaries - Dec', 65000.00, 'Bank Transfer', 'Payroll Account'),
('2025-12-10', 'Utilities', 'MSEDCL Industrial Electricity Bill', 16500.00, 'UPI', 'Maharashtra State Electricity'),
('2025-12-15', 'Transport', 'Freight container logistics from JNPT port', 18000.00, 'Bank Transfer', 'Navi Mumbai Freight Forwarders'),
('2025-12-22', 'Marketing', 'Trade directory listing & Google Ads', 9500.00, 'UPI', 'AdWords India'),
('2025-12-28', 'Other', 'Machinery lubricants & consumables', 7200.00, 'Cash', 'Industrial Oils & Fluids'),
-- Jan 2026
('2026-01-01', 'Rent', 'Factory Shed & Office Lease - Jan', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-01-05', 'Salaries', 'Staff Salaries - Jan', 65000.00, 'Bank Transfer', 'Payroll Account'),
('2026-01-09', 'Raw Material', 'Precision machined shafts & castings', 72000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2026-01-14', 'Utilities', 'Industrial Power & Water Supply', 17200.00, 'UPI', 'MSEDCL'),
('2026-01-20', 'Transport', 'Heavy equipment transport trailer hire', 16500.00, 'Bank Transfer', 'Konkan Heavy Logistics'),
-- Feb 2026
('2026-02-01', 'Rent', 'Factory Shed & Office Lease - Feb', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-02-05', 'Salaries', 'Staff Salaries - Feb', 65000.00, 'Bank Transfer', 'Payroll Account'),
('2026-02-11', 'Raw Material', 'SKF raw bearings & high-pressure seals', 84000.00, 'Bank Transfer', 'SKF Bearings Distribution Ltd'),
('2026-02-18', 'Transport', 'Bulk delivery to Pune client site', 19000.00, 'Bank Transfer', 'Navi Mumbai Freight Forwarders'),
('2026-02-22', 'Utilities', 'Electricity & compressed gas pipeline', 15800.00, 'UPI', 'MSEDCL'),
-- Mar 2026
('2026-03-01', 'Rent', 'Factory Shed & Office Lease - Mar', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-03-05', 'Salaries', 'Staff Salaries - Mar', 65000.00, 'Bank Transfer', 'Payroll Account'),
('2026-03-10', 'Raw Material', 'Hydraulic valves, pumps & cylinders', 95000.00, 'Bank Transfer', 'Parker Hannifin Fluid Controls'),
('2026-03-18', 'Utilities', 'Power & high-speed fiber internet', 18400.00, 'UPI', 'MSEDCL & Tata Tele'),
('2026-03-25', 'Marketing', 'Quarter-end promotional brochure & expo stall', 14000.00, 'Bank Transfer', 'Bombay Expo Services'),
-- Apr 2026
('2026-04-01', 'Rent', 'Factory Shed & Office Lease - Apr', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-04-05', 'Salaries', 'Staff Salaries - Apr', 68000.00, 'Bank Transfer', 'Payroll Account'),
('2026-04-12', 'Raw Material', 'Steel plates, rods & flanges', 82000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2026-04-20', 'Transport', 'Interstate logistics to Gujarat GIDC', 21000.00, 'Bank Transfer', 'Western Cargo Lines'),
-- May 2026
('2026-05-01', 'Rent', 'Factory Shed & Office Lease - May', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-05-05', 'Salaries', 'Staff Salaries - May', 68000.00, 'Bank Transfer', 'Payroll Account'),
('2026-05-14', 'Raw Material', 'Electric coils, copper wire & armature', 88000.00, 'Bank Transfer', 'Siemens Industrial Drives India'),
('2026-05-22', 'Utilities', 'Industrial Electricity Bill', 19200.00, 'UPI', 'MSEDCL'),
-- Jun 2026
('2026-06-01', 'Rent', 'Factory Shed & Office Lease - Jun', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-06-05', 'Salaries', 'Staff Salaries - Jun', 68000.00, 'Bank Transfer', 'Payroll Account'),
('2026-06-12', 'Raw Material', 'Bulk alloy casting & mechanical seals', 105000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2026-06-20', 'Transport', 'Dockyard container trucking', 22500.00, 'Bank Transfer', 'Navi Mumbai Freight Forwarders'),
-- Jul 2026
('2026-07-01', 'Rent', 'Factory Shed & Office Lease - Jul', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-07-05', 'Salaries', 'Staff Salaries - Jul', 68000.00, 'Bank Transfer', 'Payroll Account'),
('2026-07-16', 'Raw Material', 'Pneumatic components & actuators', 98000.00, 'Bank Transfer', 'Parker Hannifin Fluid Controls'),
('2026-07-25', 'Utilities', 'Electricity & Water Supply', 18900.00, 'UPI', 'MSEDCL'),
-- Aug 2026
('2026-08-01', 'Rent', 'Factory Shed & Office Lease - Aug', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-08-05', 'Salaries', 'Staff Salaries - Aug', 68000.00, 'Bank Transfer', 'Payroll Account'),
('2026-08-14', 'Raw Material', 'High-tensile fasteners & rigging wire', 92000.00, 'Bank Transfer', 'SKF Bearings Distribution Ltd'),
('2026-08-22', 'Transport', 'Container truck transport', 24000.00, 'Bank Transfer', 'Konkan Heavy Logistics'),
-- Sep 2026
('2026-09-01', 'Rent', 'Factory Shed & Office Lease - Sep', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-09-05', 'Salaries', 'Staff Salaries - Sep', 72000.00, 'Bank Transfer', 'Payroll Account'),
('2026-09-12', 'Raw Material', 'Precision bearings & electric stator components', 118000.00, 'Bank Transfer', 'Siemens Industrial Drives India'),
('2026-09-20', 'Utilities', 'Industrial Electricity Bill', 21500.00, 'UPI', 'MSEDCL'),
-- Oct 2026
('2026-10-01', 'Rent', 'Factory Shed & Office Lease - Oct', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-10-05', 'Salaries', 'Staff Salaries - Oct', 72000.00, 'Bank Transfer', 'Payroll Account'),
('2026-10-15', 'Raw Material', 'Alloy rods, steel tubes & hydraulic fittings', 132000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2026-10-22', 'Transport', 'Heavy dockyard delivery & crane offloading', 26000.00, 'Bank Transfer', 'Navi Mumbai Freight Forwarders'),
-- Nov 2026 (Current Month)
('2026-11-01', 'Rent', 'Factory Shed & Office Lease - Nov', 45000.00, 'Bank Transfer', 'MIDC Commercial Properties'),
('2026-11-05', 'Salaries', 'Staff Salaries - Nov', 72000.00, 'Bank Transfer', 'Payroll Account'),
('2026-11-09', 'Raw Material', 'Emergency procurement of valve bodies', 48000.00, 'Bank Transfer', 'Jindal Steel & Alloys Corp'),
('2026-11-12', 'Utilities', 'Electricity bill advance', 14500.00, 'UPI', 'MSEDCL');

-- 6. SEED BUDGETS (For 2026-10 and 2026-11)
INSERT INTO budgets (month, category, budget_amount) VALUES
('2026-11', 'Rent', 50000.00),
('2026-11', 'Salaries', 80000.00),
('2026-11', 'Utilities', 20000.00),
('2026-11', 'Raw Material', 120000.00),
('2026-11', 'Transport', 30000.00),
('2026-11', 'Marketing', 15000.00),
('2026-11', 'Other', 10000.00),
('2026-10', 'Rent', 50000.00),
('2026-10', 'Salaries', 75000.00),
('2026-10', 'Utilities', 22000.00),
('2026-10', 'Raw Material', 130000.00),
('2026-10', 'Transport', 25000.00),
('2026-10', 'Marketing', 15000.00),
('2026-10', 'Other', 10000.00)
ON CONFLICT (month, category) DO NOTHING;

-- 7. SEED EMPLOYEES
INSERT INTO employees (id, code, name, role, department, base_salary, allowances, deductions, phone, email, join_date, status) VALUES
('b1a10001-0000-0000-0000-000000000001', 'EMP-101', 'Rajesh K. Verma', 'Plant Operations Manager', 'Operations', 35000.00, 5000.00, 2000.00, '+91 98210 11223', 'rajesh.v@bizintel.in', '2024-03-15', 'Active'),
('b1a10001-0000-0000-0000-000000000002', 'EMP-102', 'Sunita Deshmukh', 'Quality Control Lead', 'Quality Assurance', 28000.00, 4000.00, 1800.00, '+91 98210 22334', 'sunita.d@bizintel.in', '2024-07-01', 'Active'),
('b1a10001-0000-0000-0000-000000000003', 'EMP-103', 'Vikram S. Patil', 'Senior CNC Machinist', 'Production', 24000.00, 3000.00, 1500.00, '+91 98210 33445', 'vikram.p@bizintel.in', '2024-11-10', 'Active'),
('b1a10001-0000-0000-0000-000000000004', 'EMP-104', 'Ganesh M. Shinde', 'Logistics & Dispatch Coordinator', 'Logistics', 22000.00, 2500.00, 1200.00, '+91 98210 44556', 'ganesh.s@bizintel.in', '2025-02-15', 'Active'),
('b1a10001-0000-0000-0000-000000000005', 'EMP-105', 'Pooja Nair', 'Accounts & GST Executive', 'Finance', 26000.00, 3500.00, 1600.00, '+91 98210 55667', 'pooja.n@bizintel.in', '2025-05-01', 'Active')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED ATTENDANCE (Recent days for November 2026)
INSERT INTO attendance (employee_id, date, status, notes) VALUES
('b1a10001-0000-0000-0000-000000000001', '2026-11-14', 'Present', 'Morning shift on-time'),
('b1a10001-0000-0000-0000-000000000002', '2026-11-14', 'Present', 'Shift inspected'),
('b1a10001-0000-0000-0000-000000000003', '2026-11-14', 'Present', 'CNC lathe #3 running'),
('b1a10001-0000-0000-0000-000000000004', '2026-11-14', 'Absent', 'Sick leave notified'),
('b1a10001-0000-0000-0000-000000000005', '2026-11-14', 'Present', 'GST recon'),
('b1a10001-0000-0000-0000-000000000001', '2026-11-15', 'Present', 'Routine'),
('b1a10001-0000-0000-0000-000000000002', '2026-11-15', 'Leave', 'Casual leave approved'),
('b1a10001-0000-0000-0000-000000000003', '2026-11-15', 'Present', 'Overtime completed'),
('b1a10001-0000-0000-0000-000000000004', '2026-11-15', 'Present', 'Port clearance duty'),
('b1a10001-0000-0000-0000-000000000005', '2026-11-15', 'Present', 'Monthly review')
ON CONFLICT (employee_id, date) DO NOTHING;

-- 9. SEED INVOICES & INVOICE ITEMS
INSERT INTO invoices (id, invoice_number, customer_id, invoice_date, due_date, subtotal, discount, tax_amount, grand_total, status, payment_mode) VALUES
('i1a10001-0000-0000-0000-000000000001', 'INV-2026-0001', 'c1a10001-0000-0000-0000-000000000001', '2026-10-10', '2026-10-31', 145000.00, 5000.00, 25200.00, 165200.00, 'Paid', 'Bank Transfer'),
('i1a10001-0000-0000-0000-000000000002', 'INV-2026-0002', 'c1a10001-0000-0000-0000-000000000002', '2026-10-18', '2026-11-05', 138000.00, 0.00, 24840.00, 162840.00, 'Overdue', 'Bank Transfer'),
('i1a10001-0000-0000-0000-000000000003', 'INV-2026-0003', 'c1a10001-0000-0000-0000-000000000003', '2026-10-25', '2026-11-20', 161000.00, 6000.00, 27900.00, 182900.00, 'Pending', 'Bank Transfer'),
('i1a10001-0000-0000-0000-000000000004', 'INV-2026-0004', 'c1a10001-0000-0000-0000-000000000004', '2026-11-04', '2026-11-30', 102000.00, 2000.00, 18000.00, 118000.00, 'Pending', 'Bank Transfer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, gst_rate, tax_amount, total) VALUES
('i1a10001-0000-0000-0000-000000000001', 'e1a10001-0000-0000-0000-000000000008', 'Electric Induction Motor 3-Phase 5HP', 10, 14500.00, 5000.00, 18.00, 25200.00, 165200.00),
('i1a10001-0000-0000-0000-000000000002', 'e1a10001-0000-0000-0000-000000000006', 'Pneumatic Rotary Actuator PA-10', 30, 4600.00, 0.00, 18.00, 24840.00, 162840.00),
('i1a10001-0000-0000-0000-000000000003', 'e1a10001-0000-0000-0000-000000000006', 'Pneumatic Rotary Actuator PA-10', 35, 4600.00, 6000.00, 18.00, 27900.00, 182900.00),
('i1a10001-0000-0000-0000-000000000004', 'e1a10001-0000-0000-0000-000000000001', 'Industrial Ball Bearings 6205', 120, 850.00, 2000.00, 18.00, 18000.00, 118000.00);

-- 10. SEED PAYMENTS
INSERT INTO payments (payment_date, type, category, reference_id, entity_name, amount, total_due, due_date, status, payment_mode) VALUES
('2026-10-28', 'inflow', 'Customer Invoice', 'INV-2026-0001', 'Apex Heavy Engineering Ltd', 165200.00, 165200.00, '2026-10-31', 'Received', 'Bank Transfer'),
('2026-11-01', 'inflow', 'Customer Invoice', 'INV-2026-0002', 'Bharat Maritime Shipbuilders', 60000.00, 162840.00, '2026-11-05', 'Overdue', 'Bank Transfer'),
('2026-11-08', 'inflow', 'Customer Invoice', 'INV-2026-0003', 'Konkan Infrastructure Works', 0.00, 182900.00, '2026-11-20', 'Pending', 'Bank Transfer'),
('2026-11-10', 'inflow', 'Customer Invoice', 'INV-2026-0004', 'Deccan Logistics & Port Services', 0.00, 118000.00, '2026-11-30', 'Pending', 'Bank Transfer'),
('2026-11-05', 'outflow', 'Supplier Bill', 'PO-2026-088', 'Jindal Steel & Alloys Corp', 48000.00, 48000.00, '2026-11-05', 'Paid', 'Bank Transfer'),
('2026-11-12', 'outflow', 'Supplier Bill', 'PO-2026-092', 'Parker Hannifin Fluid Controls', 25000.00, 75000.00, '2026-11-25', 'Pending', 'Bank Transfer');

-- 11. SEED GOALS
INSERT INTO goals (title, metric, target_amount, period_start, period_end, status, notes) VALUES
('Q4 2026 Sales Target', 'sales', 1200000.00, '2026-10-01', '2026-12-31', 'In Progress', 'Aiming for 25% YoY increase in heavy machinery orders'),
('FY 2026-27 Net Profit Benchmark', 'profit', 1500000.00, '2026-04-01', '2027-03-31', 'In Progress', 'Target net margin 22%'),
('November 2026 Monthly Sales Target', 'sales', 400000.00, '2026-11-01', '2026-11-30', 'In Progress', 'Drive motor and actuator deliveries');

-- 12. SEED REMINDERS
INSERT INTO reminders (title, type, due_date, priority, is_done, notes, auto_generated) VALUES
('Collect pending balance ₹1,02,840 from Bharat Maritime', 'payment', '2026-11-18', 'high', FALSE, 'INV-2026-0002 overdue since Nov 5th', TRUE),
('File GSTR-3B Return for October 2026', 'tax', '2026-11-20', 'high', FALSE, 'Statutory GST filing due on 20th', FALSE),
('Reorder Cast Iron Gate Valves DN80 (Stock is 6, Reorder is 15)', 'deadline', '2026-11-19', 'high', FALSE, 'Critical shortage alert', TRUE),
('Settle Parker Hannifin supplier installment ₹50,000', 'bill', '2026-11-25', 'medium', FALSE, 'Against PO-2026-092 invoice', FALSE),
('Pay factory electricity bill MSEDCL', 'bill', '2026-11-26', 'medium', FALSE, 'Factory unit meter reading recon', FALSE),
('Annual Fire Safety & Port Compliance Audit', 'compliance', '2026-12-05', 'low', FALSE, 'Dockyard safety inspector visit scheduled', FALSE);

-- 13. SEED TAX RECORDS
INSERT INTO tax_records (month, output_gst, input_gst, net_payable, status, filing_date) VALUES
('2025-12', 35100.00, 24100.00, 11000.00, 'Paid', '2026-01-18'),
('2026-01', 35240.00, 23800.00, 11440.00, 'Paid', '2026-02-19'),
('2026-02', 41670.00, 26900.00, 14770.00, 'Paid', '2026-03-18'),
('2026-03', 44370.00, 29200.00, 15170.00, 'Paid', '2026-04-19'),
('2026-04', 40518.00, 27400.00, 13118.00, 'Paid', '2026-05-18'),
('2026-05', 41076.00, 28100.00, 12976.00, 'Paid', '2026-06-19'),
('2026-06', 54270.00, 31800.00, 22470.00, 'Paid', '2026-07-18'),
('2026-07', 43020.00, 29700.00, 13320.00, 'Paid', '2026-08-19'),
('2026-08', 64395.00, 31200.00, 33195.00, 'Paid', '2026-09-18'),
('2026-09', 66978.00, 34600.00, 32378.00, 'Paid', '2026-10-19'),
('2026-10', 85716.00, 38100.00, 47616.00, 'Calculated', '2026-11-20'),
('2026-11', 46620.00, 18500.00, 28120.00, 'Draft', NULL)
ON CONFLICT (month) DO NOTHING;
