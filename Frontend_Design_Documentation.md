# Noctara Frontend Design & Functionality Documentation

This document explicitly outlines the frontend design, layout structure, and UI/UX functionalities (buttons, charts, inputs, etc.) for the entire ASGUS-1 GSR system, focusing on the three main role-based dashboards and supporting pages.

## 1. Landing Page (`/`)
**Design Aesthetics:** Cinematic, classified government defense contractor style. Dark theme with amber/gold accents, frosted glass topbar, and scanline overlays.
**Functionality & Elements:**
- **3D Terrain Canvas:** A WebGL interactive terrain background that reacts to scroll.
- **Top Navigation Bar:** Includes a "REQUEST ACCESS →" button and a logo that scrolls to top.
- **Hero Section:** Animated decrypting text ("ASGUS-1 GSR"), "ACCESS SYSTEM →" primary button (navigates to Login), and "VIEW DOCUMENTATION" secondary button.
- **Coordinate Strip:** Displays live monitoring coordinates and real-time PKT clock.
- **Coverage Map Section:** Includes a canvas with topograhic contour lines and radar blip animations.
- **Metrics Section:** Animated counter components (Active Zones, Detection Accuracy %, Sync Interval, Roles).

## 2. Login Page (`/login`)
**Design Aesthetics:** Split-layout design with a topographic map animation on the left and a sleek, dark-themed login form on the right.
**Functionality & Elements:**
- **Role Selector:** Three pill-shaped buttons to select the access role (`Analyst`, `Field Officer`, `Admin`).
- **Inputs:** Email address input field and a Password input field.
- **Password Visibility:** A "SHOW/HIDE" toggle button inside the password field.
- **Submit Button:** "LOGIN →" button with a loading spinner state.
- **Real-time Clock:** Top bar shows the current date and time.

---

## 3. Analyst Dashboard (`/analyst`) - Dashboard 1
**Design Aesthetics:** High-density, data-rich interface for intelligence analysts. Complex map layout with floating panels.
**Functionality & Elements:**
- **Interactive Map Area (Leaflet):** 
  - **Zone Markers:** Pulsing custom markers for risk zones (Critical, High, Medium, Low). Clicking a marker opens a Zone Drawer.
  - **Layer Toggles:** Top-left buttons (`Terrain`, `Heatmap`, `Satellite`, `Vegetation`) to switch map base layers and overlays.
  - **Time Filter Strip:** Top-right pill buttons (`1H`, `6H`, `24H`, `7D`, `ALL`) to filter map markers and alerts by time.
  - **Map Controls:** Bottom-right buttons (+/- for zoom, Maximize, Recenter).
  - **Legend Card:** Bottom-left floating card explaining risk colors.
- **Hover Coordinates:** Bottom-center overlay showing latitude and longitude based on mouse position.
- **Right Sidebar Panel (Tabs):**
  - **Tabs:** `Alerts`, `Zones`, `Stats`.
  - **Alerts Tab:** List of styled warning cards. Displays risk pills, event time, detection type chips, and confidence %.
  - **Zones Tab:** Progress bars showing risk levels and a 2x2 grid of stat blocks (Active Zones, Critical, Cleared).
  - **Stats Tab:** Recharts Bar Graph (Hourly Detection Count) with customized tooltips, 2x2 stat grid, and horizontal progress bars for Event Type Breakdown.
- **Zone Drawer (Bottom/Side pop-up):** Shows confidence, event type, and time. Buttons: "VIEW FULL DETAIL" and "GENERATE REPORT".
- **Report Generation Modal:** 
  - Inputs: From/To date pickers.
  - Report Type pill selector (`Risk Analysis`, `Movement Summary`, `Full Report`).
  - Toggle Switch (Checkbox): "Include Charts".
  - Button: "GENERATE PDF" (shows a success toast notification upon completion).

---

## 4. Field Officer Dashboard (`/field-officer`) - Dashboard 2
**Design Aesthetics:** Mobile-responsive, mission-focused layout utilizing green accents for 'Field Officer' clearance.
**Functionality & Elements:**
- **Assignment Card:** Shows officer badge, shift time, and a 3-column stats block (Assigned Zones, Observations Today, Pending Reviews). Includes a "Generate Report" button.
- **Two-Column Layout (Map & Zones):**
  - **Mini Map:** View of assigned zones.
  - **My Zones List:** Clickable rows with risk pills. "View Zone Details" action button.
- **Submit Field Observation Form:**
  - **Dropdowns/Selects:** Zone selection, Event Type, Estimated Scale.
  - **Textareas:** Observation Details, Additional Notes.
  - **GPS Inputs:** Latitude and Longitude fields.
  - **Auto-fill GPS Button:** Automatically populates coordinates based on the selected zone.
  - **Severity Pills:** Selectable risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - **File Upload Area:** Click or drag-and-drop zone to attach photo evidence (JPG/PNG). Shows file name and size with a clear (X) button once uploaded.
  - **Submit Button:** "SUBMIT OBSERVATION →" with loading state.
- **Observation History Accordion:** Expandable cards showing past submissions. Clicking the chevron expands the card to show full descriptions, severity pills, and reviewer notes.

---

## 5. Admin Panel (`/admin`) - Dashboard 3
**Design Aesthetics:** System administration view with blue accents and high-level health monitoring.
**Functionality & Elements:**
- **System Health Strip:** Horizontal scroll/row of widgets showing API, Database, and Server uptimes with status dots (Online/Degraded).
- **Stats Row:** 4-column metric cards (Total Users, Active Sessions, Reports Generated, System Alerts).
- **User Management Table:**
  - Displays users, roles (Role Pills), emails, and status (Active/Inactive tags).
  - **Action Buttons:** Edit button (pencil icon) and Activate/Deactivate toggle buttons per row.
  - **Add User Button:** Top right of the table opens the Add User Modal.
- **Add/Edit User Modal:**
  - Inputs: Full Name, Email.
  - Select: Role Dropdown.
  - Checkboxes: Assigned Zones (only appears if 'Field Officer' is selected).
  - Temporary Password input with a "Generate Password" (Eye icon) button.
  - Save/Cancel buttons.
- **Deactivate Confirmation Modal:** Warning dialog with confirm/cancel buttons.
- **Activity Log Feed:** Scrolling list of recent system events with colored dots. "View Full Log" button opens a larger modal with Date From/To filter inputs.

---

## 6. Zone Detail Page (`/zone/:zoneName`)
**Design Aesthetics:** Highly focused analytical view for a single geographical area.
**Functionality & Elements:**
- **Back Button:** Return to dashboard.
- **Zone Map:** Focused Leaflet map showing primary zone marker and sub-detection points. Displays hover coordinates.
- **Zone Summary Panel:**
  - 2x2 Stat Cards (Confidence Score, Event Type, Velocity, Clusters).
  - Metadata List (District, Area, Elevation).
  - **Action Buttons:** "Generate Report", "Export Card" (downloads UI as a PNG image using html2canvas), and "Assign Field Officer" (for Analysts/Admins).
- **Risk Trend Chart (Recharts):** Area chart showing risk score over the last 7 days with a custom amber gradient fill and interactive tooltip.
- **Event History Table:** Chronological table of detection events displaying Time, Event Type, Confidence, Velocity, and colored Status tags.

---

## 7. Supporting Pages
**A. Alerts Feed (`/alerts`)**
- Centralized chronological feed of all system alerts.
- Filter dropdowns (by Zone, Risk Level, Status).
- Status toggle buttons (Mark as Resolved, Flag for Review).

**B. Analytics & Reports (`/analytics`, `/reports`)**
- Deep-dive data visualization pages containing multi-line charts, pie charts, and complex tabular data for historical terrain movement trends.
- Date range pickers and PDF/CSV export buttons.

**C. Zone Explorer (`/zones`)**
- A directory-style page with a grid/list view toggle of all monitored zones.
- Search bar for quick filtering.

**D. Settings (`/settings`)**
- User profile forms (Name, Email, Password change inputs).
- Notification preference checkboxes (Email alerts, SMS, Push).
- System configuration toggles (for Admins).
