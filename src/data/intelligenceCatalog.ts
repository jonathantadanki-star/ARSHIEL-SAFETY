export interface IndustryRiskItem {
  hazard: string;
  severity: 'Critical' | 'High' | 'Medium';
  primaryControl: string;
}

export interface IndustryProfile {
  id: string;
  name: string;
  sectorGroup: string;
  summary: string;
  topRisks: IndustryRiskItem[];
  hiraJsaTemplates: string[];
  sops: string[];
  inspectionChecklists: string[];
  mandatoryPermits: string[];
  legalCompliance: string[];
  isoStandards: string[];
  environmentalControls: string[];
  emergencyScenarios: string[];
  trainingRequirements: string[];
  benchmarkKpis: { metric: string; target: string; unit: string }[];
  quickRoutes: { label: string; routeKey: string }[];
}

export const INDUSTRIES_CATALOG: IndustryProfile[] = [
  {
    id: 'semiconductor',
    name: 'Semiconductor',
    sectorGroup: 'High-Tech Cleanroom & Fab',
    summary: 'Cleanroom fabrication, specialty toxic gas handling, wafer etching, ultra-pure water, and sub-fab life safety.',
    topRisks: [
      { hazard: 'Silane / Arsine / Phosphine specialty gas release', severity: 'Critical', primaryControl: 'Continuous TGMS detection, double-walled piping, automated shut-off' },
      { hazard: 'HF acid and wet-bench chemical splash', severity: 'Critical', primaryControl: 'Dedicated HF antidote kit, calcium gluconate protocol, face shield + apron' },
      { hazard: 'Laser & RF radiation exposure during tool maintenance', severity: 'High', primaryControl: 'Class 4 laser interlocks, LOTO, certified service technician authorization' },
    ],
    hiraJsaTemplates: ['Cleanroom Gas Cylinder Changeout JSA', 'Wet Bench HF Acid Handling HIRA', 'Sub-Fab Vacuum Pump LOTO JSA'],
    sops: ['SOP-SEMI-01: Toxic Gas Monitoring & Scrubber Response', 'SOP-SEMI-02: HF Acid Spill & First Aid Protocol', 'SOP-SEMI-03: Cleanroom Gowning & ESD Controls'],
    inspectionChecklists: ['Gas Cabinet Interlock & Purge Checklist', 'Cleanroom Emergency Shower & Eyewash Audit', 'Sub-Fab Exhaust & Scrubber Daily Inspection'],
    mandatoryPermits: ['Line Breaking', 'LOTO', 'Confined Space', 'Electrical', 'Hot Work (Sub-Fab)'],
    legalCompliance: ['Indian Factories Act / OSHWC Code Chemical Rules', 'MSIHC Rules (Hazardous Chemicals)', 'SEMI S2 / S8 Equipment EHS Guidelines'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 14644 Cleanroom Reference', 'ISO 50001'],
    environmentalControls: ['PFC / F-Gas abatement tracking', 'Ultra-Pure Water (UPW) reclamation ratio', 'Acid/solvent segregated hazardous waste manifest'],
    emergencyScenarios: ['Toxic Gas Alarm Level-2 Evacuation', 'HF Chemical Exposure Medical Escalation', 'Cleanroom Smoke / VESDA Early Warning'],
    trainingRequirements: ['Specialty Gas & SCBA Qualification', 'HF Acid Emergency First Aid', 'SEMI S2 / LOTO Authorized Technician'],
    benchmarkKpis: [
      { metric: 'TGMS Calibration Compliance', target: '100%', unit: 'Sensors' },
      { metric: 'PTW Zero-Deviation Rate', target: '99.5%', unit: 'Permits' },
      { metric: 'UPW Recovery Target', target: '75%', unit: 'Water Reuse' },
    ],
    quickRoutes: [
      { label: 'Risk & LOTO', routeKey: 'risk-assessment' },
      { label: 'Permit to Work', routeKey: 'ptw' },
      { label: 'Environment & ESG', routeKey: 'environment' },
    ],
  },
  {
    id: 'data-center',
    name: 'Data Center',
    sectorGroup: 'Mission-Critical Infrastructure',
    summary: 'High-voltage switchgear, UPS battery rooms, diesel generator farms, raised-floor work, and thermal/energy efficiency.',
    topRisks: [
      { hazard: 'Arc flash and HV/MV electrical shock in switchgear halls', severity: 'Critical', primaryControl: 'NFPA 70E arc-flash boundary, insulated tools, verified LOTO' },
      { hazard: 'Li-Ion / VRLA battery thermal runaway & hydrogen buildup', severity: 'Critical', primaryControl: 'Battery monitoring BMS, hydrogen ventilation, clean-agent fire suppression' },
      { hazard: 'High-noise generator bay & hot exhaust burns', severity: 'High', primaryControl: 'Double hearing protection, thermal guards, restricted access' },
    ],
    hiraJsaTemplates: ['HV Switchgear Preventive Maintenance JSA', 'UPS Battery Bank Replacement HIRA', 'Chiller Plant & Cooling Tower Work JSA'],
    sops: ['SOP-DC-01: Energized Electrical Work Authorization & LOTO', 'SOP-DC-02: Clean-Agent Fire Suppression Pre-Discharge Lock', 'SOP-DC-03: Raised Floor Tile Removal & Fall Protection'],
    inspectionChecklists: ['UPS & Battery Room Ventilation & Spill Check', 'VESDA & Novec/FM-200 Fire Panel Audit', 'DG Set Fuel Bunding & Earthing Verification'],
    mandatoryPermits: ['Electrical', 'LOTO', 'Hot Work', 'Work at Height', 'General Work'],
    legalCompliance: ['CEA (Measures Relating to Safety & Electric Supply) Regulations', 'NBC 2016 Part 4 Fire & Life Safety', 'NFPA 70E / 75 IT Equipment Fire Protection'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 50001:2018', 'ISO 27001'],
    environmentalControls: ['PUE & WUE continuous monitoring', 'DG stack emission & acoustic compliance', 'E-waste & spent battery authorized recycling'],
    emergencyScenarios: ['Electrical Arc Flash & Power Transfer Emergency', 'Battery Room Thermal Runaway Isolation', 'Clean Agent Discharge Evacuation'],
    trainingRequirements: ['HV Electrical Safety & Arc Flash Qualification', 'LOTO Multi-Lock Isolation', 'Clean-Agent Fire System Safety'],
    benchmarkKpis: [
      { metric: 'Electrical LOTO Verification', target: '100%', unit: 'Audits' },
      { metric: 'PUE Efficiency Target', target: '≤ 1.35', unit: 'Ratio' },
      { metric: 'Critical CAPA On-Time Closure', target: '98%', unit: 'Actions' },
    ],
    quickRoutes: [
      { label: 'LOTO & Electrical', routeKey: 'loto' },
      { label: 'Permit to Work', routeKey: 'ptw' },
      { label: 'Equipment & Calibration', routeKey: 'equipment' },
    ],
  },
  {
    id: 'pharmaceutical',
    name: 'Pharmaceutical',
    sectorGroup: 'Life Sciences & API',
    summary: 'API synthesis, solvent recovery, potent compound containment (OEL/OEB), sterile cleanrooms, and biohazard safety.',
    topRisks: [
      { hazard: 'Flammable solvent vapor explosion in reactor & centrifuge bays', severity: 'Critical', primaryControl: 'ATEX/FLP electricals, nitrogen inerting, static grounding & bonding' },
      { hazard: 'High-potency API (OEB 4/5) inhalation & dermal exposure', severity: 'Critical', primaryControl: 'Closed isolator transfer, negative pressure containment, PAPR' },
      { hazard: 'Confined space reactor vessel cleaning & nitrogen asphyxiation', severity: 'Critical', primaryControl: '4-gas continuous test, oxygen monitoring, standby rescue & tripod' },
    ],
    hiraJsaTemplates: ['Reactor Vessel Confined Space Entry JSA', 'Solvent Drum Dispensing Static Bonding HIRA', 'Potent Compound Isolator Filter Change JSA'],
    sops: ['SOP-PHARMA-01: Static Grounding & Solvent Transfer Safety', 'SOP-PHARMA-02: Reactor Nitrogen Inerting & Oxygen Check', 'SOP-PHARMA-03: Spill Containment & Decontamination'],
    inspectionChecklists: ['Static Earthing Clamp & Continuity Audit', 'Bio-Safety Cabinet & Fume Hood Face Velocity Check', 'Solvent Tank Farm Flame Arrestor Inspection'],
    mandatoryPermits: ['Confined Space', 'Line Breaking', 'Hot Work', 'LOTO', 'Cold Work'],
    legalCompliance: ['Factories Act Hazardous Process Chapter IVA', 'Petroleum Rules & PESO Solvent Storage', 'Bio-Medical Waste & Hazardous Waste Rules'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015', 'WHO GMP / EHS Alignment'],
    environmentalControls: ['Zero Liquid Discharge (ZLD) ETP monitoring', 'VOC scrubber efficiency & LDAR checks', 'Hazardous solvent recovery & incineration manifest'],
    emergencyScenarios: ['Solvent Vapor Flash Fire & Deluge Activation', 'Toxic Gas / Chemical Spill Containment', 'Nitrogen Asphyxiation Confined Space Rescue'],
    trainingRequirements: ['Process Safety Management (PSM) & HAZOP', 'Static Electricity & Solvent Fire Control', 'OEB Containment & Chemical PPE'],
    benchmarkKpis: [
      { metric: 'Static Earthing Inspection Pass', target: '100%', unit: 'Lines' },
      { metric: 'Industrial Hygiene Monitoring', target: '100%', unit: 'Scheduled' },
      { metric: 'ZLD Effluent Compliance', target: '100%', unit: 'Batches' },
    ],
    quickRoutes: [
      { label: 'HIRA & HAZOP', routeKey: 'risk-assessment' },
      { label: 'Confined Space PTW', routeKey: 'ptw' },
      { label: 'Legal Compliance', routeKey: 'legal' },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    sectorGroup: 'Discrete & Industrial Production',
    summary: 'CNC machining, stamping presses, robotic welding cells, overhead cranes, forklift logistics, and foundry operations.',
    topRisks: [
      { hazard: 'Machine entanglement, pinch points & unguarded rotating shafts', severity: 'Critical', primaryControl: 'Interlocked physical guards, light curtains, verified LOTO' },
      { hazard: 'Overhead crane dropped loads & rigging failure', severity: 'Critical', primaryControl: 'Load-tested slings, exclusion zones, certified rigger & banksman' },
      { hazard: 'Forklift-pedestrian collision in shop-floor aisles', severity: 'High', primaryControl: 'Segregated walkways, blue-spot lights, speed limiters, convex mirrors' },
    ],
    hiraJsaTemplates: ['Hydraulic Press Die-Change LOTO JSA', 'Overhead EOT Crane Heavy Lift HIRA', 'Robotic Cell Maintenance & Teach-Mode JSA'],
    sops: ['SOP-MFG-01: Machine Guarding & Safety Interlock Verification', 'SOP-MFG-02: Zero Energy State LOTO Procedure', 'SOP-MFG-03: Forklift & Pedestrian Traffic Management'],
    inspectionChecklists: ['Machine Guarding & E-Stop Daily Audit', 'EOT Crane, Hoist & Lifting Tackles Register', 'Shop Floor 5S, Ergonomics & Noise Checklist'],
    mandatoryPermits: ['LOTO', 'Hot Work', 'Work at Height', 'Lifting', 'Electrical'],
    legalCompliance: ['Factories Act 1948 / OSHWC Code 2020', 'State Factory Rules (Lifting & Pressure Vessels)', 'OSHA 29 CFR 1910 Subpart O Machine Guarding'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015', 'ISO 50001'],
    environmentalControls: ['Coolant mist & weld fume extraction', 'Scrap metal & used oil recycling', 'Compressed air leak & kWh/unit energy intensity'],
    emergencyScenarios: ['Machinery Entrapment & Medical Trauma Response', 'Hydraulic Oil / Paint Booth Fire', 'Forklift Overturn & Spill Response'],
    trainingRequirements: ['LOTO Authorized & Affected Employee', 'Safe Rigging & Crane Operation', 'Ergonomics & Hearing Conservation'],
    benchmarkKpis: [
      { metric: 'LTIFR Target', target: '0.00', unit: 'per 1M hrs' },
      { metric: 'Machine Guard Audit Pass', target: '100%', unit: 'Presses/Lines' },
      { metric: 'Near-Miss Reporting Rate', target: '≥ 4 / emp / yr', unit: 'Leading KPI' },
    ],
    quickRoutes: [
      { label: 'Incidents & CAPA', routeKey: 'incidents' },
      { label: 'Safety Audits', routeKey: 'audits' },
      { label: 'Master KPI Hub', routeKey: 'master-kpi' },
    ],
  },
  {
    id: 'construction',
    name: 'Construction',
    sectorGroup: 'Civil, EPC & Infrastructure',
    summary: 'High-rise scaffolding, deep excavation & shoring, tower cranes, steel erection, concrete pours, and multi-tier contractors.',
    topRisks: [
      { hazard: 'Fall from height (scaffolding, edges, fragile roofs, rebar)', severity: 'Critical', primaryControl: 'Collective guardrails, certified scaffolds, 100% tie-off full body harness' },
      { hazard: 'Trench collapse & underground utility strike during excavation', severity: 'Critical', primaryControl: 'Cable scanning, sloping/shoring >1.5m, daily soil inspection' },
      { hazard: 'Struck-by falling objects & crane/heavy equipment swing radius', severity: 'Critical', primaryControl: 'Toe boards, debris nets, barricaded drop zones, spotters' },
    ],
    hiraJsaTemplates: ['Tower Crane Erection & Critical Lift JSA', 'Deep Excavation & Shoring HIRA', 'Structural Steel Work at Height SWMS'],
    sops: ['SOP-CON-01: Scaffolding Tagging (Green/Red) & Inspection', 'SOP-CON-02: Excavation Permit & Underground Utility Clearance', 'SOP-CON-03: Contractor Pre-Mobilization Safety Induction'],
    inspectionChecklists: ['Daily Scaffold & Edge Protection Checklist', 'Tower Crane & Mobile Crane Pre-Use Inspection', 'Temporary Electrical DB & ELCB/RCCB 30mA Audit'],
    mandatoryPermits: ['Work at Height', 'Excavation', 'Lifting', 'Hot Work', 'Confined Space', 'Electrical'],
    legalCompliance: ['BOCW (Building & Other Construction Workers) Act / OSHWC Code', 'OSHA 29 CFR 1926 Construction Standards', 'NBC 2016 Part 7 Constructional Practices'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015'],
    environmentalControls: ['PM10 / PM2.5 dust suppression & mist cannons', 'Construction & demolition (C&D) waste segregation', 'Silt traps & stormwater runoff control'],
    emergencyScenarios: ['Suspended Harness Rescue (<15 min)', 'Trench Cave-In & Structural Collapse Rescue', 'High-Wind / Lightning Stop-Work Protocol'],
    trainingRequirements: ['Work at Height & Harness Rescue', 'Competent Scaffold Inspector', 'Contractor Site Induction & Toolbox Talks'],
    benchmarkKpis: [
      { metric: 'Contractor Induction Completion', target: '100%', unit: 'Before Entry' },
      { metric: 'Daily TBT Attendance', target: '100%', unit: 'Crews' },
      { metric: 'ELCB 30mA Monthly Testing', target: '100%', unit: 'DB Panels' },
    ],
    quickRoutes: [
      { label: 'Permit to Work', routeKey: 'ptw' },
      { label: 'AI Observations', routeKey: 'observations' },
      { label: 'Contractor Safety', routeKey: 'contractors' },
    ],
  },
  {
    id: 'fmcg',
    name: 'FMCG',
    sectorGroup: 'Consumer Goods & High-Speed Packaging',
    summary: 'High-speed bottling and packaging lines, automated palletizers, boiler utilities, chemical CIP cleaning, and cold distribution.',
    topRisks: [
      { hazard: 'Clearing jams on high-speed conveyors & cartoners without isolation', severity: 'Critical', primaryControl: 'Safety-rated interlocked doors, trapped-key LOTO, jam-clearing tools' },
      { hazard: 'Caustic / acid splash during Clean-in-Place (CIP) cycles', severity: 'High', primaryControl: 'Closed dosing systems, chemical goggles/face shields, deluge showers' },
      { hazard: 'Repetitive strain & manual handling of bulk cartons/raw sacks', severity: 'Medium', primaryControl: 'Vacuum lifters, ergonomic palletizers, job rotation' },
    ],
    hiraJsaTemplates: ['High-Speed Packaging Line Jam Clearance JSA', 'CIP Caustic Tank Charging HIRA', 'Boiler & Steam Header Maintenance JSA'],
    sops: ['SOP-FMCG-01: Safe Jam Clearance & Interlock Bypass Prohibition', 'SOP-FMCG-02: CIP Chemical Handling & Dilution', 'SOP-FMCG-03: Warehouse Dock Leveler & Trailer Wheel Chocking'],
    inspectionChecklists: ['Conveyor Pinch Point & E-Stop Pull-Cord Audit', 'Ammonia / Chiller & Boiler Safety Valve Check', 'Loading Dock & Forklift Battery Charging Checklist'],
    mandatoryPermits: ['LOTO', 'Hot Work', 'Work at Height', 'Confined Space', 'Cold Work'],
    legalCompliance: ['Factories Act / OSHWC Code', 'Indian Boilers Act & Pressure Vessel Rules', 'Plastic Waste EPR & Packaging Sustainability Compliance'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 22000 / FSSC Reference', 'ISO 50001'],
    environmentalControls: ['Water-to-product ratio optimization', 'Packaging plastic EPR & recyclability tracking', 'Boiler fuel switch & Scope 1 emissions reduction'],
    emergencyScenarios: ['Ammonia / Refrigerant Leak Isolation', 'CIP Chemical Spill & Eye Wash Response', 'Packaging Warehouse Fire Evacuation'],
    trainingRequirements: ['LOTO & Conveyor Jam Safety', 'Chemical CIP Handling & SDS', 'Manual Handling & Ergonomics'],
    benchmarkKpis: [
      { metric: 'Interlock Audit Compliance', target: '100%', unit: 'Lines' },
      { metric: 'Water Intensity Reduction', target: '-8% YoY', unit: 'L / Unit' },
      { metric: 'Unsafe Condition Closure', target: '≤ 48 hrs', unit: 'SLA' },
    ],
    quickRoutes: [
      { label: 'Observations', routeKey: 'observations' },
      { label: 'Training & Competency', routeKey: 'training' },
      { label: 'Environment & ESG', routeKey: 'environment' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    sectorGroup: 'Hospitals, Labs & Clinical Care',
    summary: 'Sharps & bloodborne pathogen control, medical gas manifolds, radiation imaging, bio-medical waste, and hospital fire evacuation.',
    topRisks: [
      { hazard: 'Needlestick injuries & biohazard/infectious pathogen exposure', severity: 'Critical', primaryControl: 'Safety-engineered sharps, puncture-proof bins, PEP protocol' },
      { hazard: 'Medical oxygen manifold leak & enriched-oxygen fire hazard', severity: 'Critical', primaryControl: 'Oxygen sensors, oil-free fittings, strict no-ignition zones' },
      { hazard: 'Ionizing radiation (X-ray/CT/Nuclear) & cytotoxic drug exposure', severity: 'High', primaryControl: 'TLD dosimeters, lead shielding, laminar cytotoxic hoods' },
    ],
    hiraJsaTemplates: ['Medical Oxygen Tank & Manifold Maintenance JSA', 'Bio-Medical Waste Segregation & Autoclave HIRA', 'MRI Quench & Cryogen Safety Assessment'],
    sops: ['SOP-HC-01: Needlestick & Bloodborne Exposure Post-Exposure Prophylaxis', 'SOP-HC-02: Code Red Hospital Horizontal Fire Evacuation', 'SOP-HC-03: Medical Gas Pipeline Pressure & Alarm Monitoring'],
    inspectionChecklists: ['ICU / OT Medical Gas & Fire Suppression Audit', 'Bio-Medical Waste Color-Coded Segregation Audit', 'Radiation Lead Apron & Dosimetry Compliance Check'],
    mandatoryPermits: ['Hot Work', 'Electrical', 'Work at Height', 'Line Breaking (Medical Gas)', 'General Work'],
    legalCompliance: ['Bio-Medical Waste Management Rules', 'AERB Radiation Safety Regulations', 'NBC 2016 Institutional Hospital Fire Norms'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015', 'NABH Safety Reference'],
    environmentalControls: ['4-color bio-medical waste barcode manifest', 'Hospital STP effluent & antimicrobial load monitoring', 'Mercury-free clinical instrumentation'],
    emergencyScenarios: ['Code Red ICU Fire & Bed-Bound Patient Evacuation', 'Medical Oxygen Supply Failure Backup', 'Cytotoxic / Mercury Clinical Spill'],
    trainingRequirements: ['Hospital Fire & Patient Evacuation Drills', 'Infection Control & Sharps Safety', 'Safe Patient Handling & Ergonomics'],
    benchmarkKpis: [
      { metric: 'Sharps Injury Rate', target: '0', unit: 'Incidents' },
      { metric: 'BMW Manifest Accuracy', target: '100%', unit: 'Daily Logs' },
      { metric: 'Fire Mock Drill Readiness', target: '100%', unit: 'Wards' },
    ],
    quickRoutes: [
      { label: 'Emergency & Fire', routeKey: 'emergency' },
      { label: 'Incidents & Near Miss', routeKey: 'incidents' },
      { label: 'Document Control', routeKey: 'documents' },
    ],
  },
  {
    id: 'it-corporate',
    name: 'IT & Corporate',
    sectorGroup: 'Offices, Campuses & Tech Parks',
    summary: 'Multi-story campus fire & life safety, workstation ergonomics, commuter road safety, indoor air quality, and ESG reporting.',
    topRisks: [
      { hazard: 'High-rise office fire & stairwell egress congestion', severity: 'High', primaryControl: 'Clear illuminated exits, floor fire wardens, biannual evacuation drills' },
      { hazard: 'Employee road & commute transport incidents', severity: 'High', primaryControl: 'Driver fatigue checks, GPS/speed governance, defensive driving training' },
      { hazard: 'Musculoskeletal disorders (MSD) & poor indoor air quality (CO2)', severity: 'Medium', primaryControl: 'Ergonomic workstation assessments, HVAC fresh-air CO2 monitoring' },
    ],
    hiraJsaTemplates: ['High-Rise Facade Glass Cleaning Rope Access JSA', 'Server Room UPS & HVAC Maintenance HIRA', 'Campus Electrical Substation Audit'],
    sops: ['SOP-CORP-01: Floor Warden Fire Evacuation & Assembly Headcount', 'SOP-CORP-02: Ergonomic Self-Assessment & Display Screen Setup', 'SOP-CORP-03: Facility Contractor Permit Governance'],
    inspectionChecklists: ['Fire Exit, Sprinkler & Extinguisher Monthly Audit', 'Indoor Air Quality (CO2 / PM2.5 / Lux) Walkdown', 'Cafeteria Kitchen LPG & Hood Suppression Check'],
    mandatoryPermits: ['Work at Height', 'Electrical', 'Hot Work', 'General Work'],
    legalCompliance: ['Shops & Establishments Act / State Fire NOC', 'NBC 2016 Business Building Life Safety', 'SEBI BRSR / CSRD Corporate ESG Reporting'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 50001', 'ISO 27001'],
    environmentalControls: ['Renewable PPA electricity share & Scope 2 accounting', 'Zero-single-use plastic & food waste composting', 'E-waste authorized vendor disposal certificates'],
    emergencyScenarios: ['Multi-Floor Fire Evacuation & Mobility-Impaired Rescue', 'Medical Cardiac / AED Emergency Response', 'Severe Weather / Flood Campus Continuity'],
    trainingRequirements: ['Fire Warden & First Aid / CPR / AED', 'Office Ergonomics & Mental Wellbeing', 'Defensive Commute & Travel Safety'],
    benchmarkKpis: [
      { metric: 'Evacuation Drill Time', target: '≤ 4 min', unit: 'All Floors' },
      { metric: 'Indoor CO2 Compliance', target: '< 800 ppm', unit: 'Workspaces' },
      { metric: 'Renewable Energy Share', target: '≥ 60%', unit: 'Scope 2' },
    ],
    quickRoutes: [
      { label: 'Emergency Readiness', routeKey: 'emergency' },
      { label: 'ESG & Sustainability', routeKey: 'environment' },
      { label: 'Audits & Inspections', routeKey: 'audits' },
    ],
  },
  {
    id: 'mining',
    name: 'Mining',
    sectorGroup: 'Surface & Underground Extraction',
    summary: 'Heavy earthmoving haulage (HEMM), blasting & explosives control, slope/strata stability, respirable silica dust, and mine rescue.',
    topRisks: [
      { hazard: 'Haul truck collision, rollover & blind-spot pedestrian strike', severity: 'Critical', primaryControl: 'Proximity warning, fatigue monitoring, bunded haul roads, segregated light vehicles' },
      { hazard: 'Bench slope failure, rockfall & underground strata collapse', severity: 'Critical', primaryControl: 'Geotechnical radar monitoring, scaling, roof bolting, exclusion zones' },
      { hazard: 'Blasting fly-rock, misfires & respirable crystalline silica (RCS)', severity: 'Critical', primaryControl: 'Certified blaster clearance, blast shelter radius, wet drilling & RPE' },
    ],
    hiraJsaTemplates: ['Controlled Blasting & Exclusion Zone JSA', 'HEMM Tyre Inflation & Wheel Change HIRA', 'Conveyor Belt Splice & Isolation JSA'],
    sops: ['SOP-MIN-01: Haul Road Traffic Rules & Berm Standards', 'SOP-MIN-02: Explosives Magazine & Misfire Protocol', 'SOP-MIN-03: Respirable Dust Suppression & Medical Surveillance'],
    inspectionChecklists: ['HEMM Pre-Shift Brakes, Steering & Fire Suppression Audit', 'Highwall / Slope Crack & Drainage Inspection', 'Tailings Storage Facility & Bund Integrity Check'],
    mandatoryPermits: ['Excavation', 'LOTO', 'Hot Work', 'Work at Height', 'Confined Space', 'Lifting'],
    legalCompliance: ['Mines Act 1952 / DGMS Circulars / OSHWC Code', 'Explosives Rules (PESO)', 'MSHA / ICMM Critical Control Management Reference'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 50001'],
    environmentalControls: ['Ambient PM10/PM2.5 & blast vibration monitoring', 'Mine dewatering settlement & reclamation', 'Biodiversity & progressive land rehabilitation'],
    emergencyScenarios: ['Pit Slope Failure / Trapped Operator Rescue', 'HEMM Engine Bay Fire', 'Underground Gas / Refuge Chamber Activation'],
    trainingRequirements: ['DGMS Vocational Mine Safety Training', 'HEMM Defensive Driving & Fatigue Awareness', 'Mine Rescue & SCBA Operations'],
    benchmarkKpis: [
      { metric: 'Critical Control Verification', target: '100%', unit: 'Fatal Risks' },
      { metric: 'Silica Exposure Compliance', target: '100%', unit: '< PEL' },
      { metric: 'HEMM Pre-Shift Defect Closure', target: '100%', unit: 'Fleet' },
    ],
    quickRoutes: [
      { label: 'Risk Matrix & Controls', routeKey: 'risk-assessment' },
      { label: 'Equipment Safety', routeKey: 'equipment' },
      { label: 'Incidents & RCA', routeKey: 'incidents' },
    ],
  },
  {
    id: 'oil-gas',
    name: 'Oil & Gas',
    sectorGroup: 'Upstream, Refining & Petrochemical',
    summary: 'Hydrocarbon process safety (PSM), H2S sour gas protection, SIMOPS permit control, tank farms, and flare/emergency shutdown.',
    topRisks: [
      { hazard: 'Loss of Primary Containment (LOPC) — hydrocarbon fire / VCE', severity: 'Critical', primaryControl: 'Asset integrity NDT, SIS/ESD trips, gas detection, strict Hot Work control' },
      { hazard: 'H2S toxic gas exposure in separators, wells & sour lines', severity: 'Critical', primaryControl: 'Personal H2S monitors, wind socks, BA cascade sets, buddy system' },
      { hazard: 'Simultaneous Operations (SIMOPS) conflict during turnarounds', severity: 'Critical', primaryControl: 'Digital SIMOPS conflict matrix, area authority control, blind lists' },
    ],
    hiraJsaTemplates: ['Positive Isolation & Spading (Line Breaking) JSA', 'Storage Tank Degassing & Confined Space HIRA', 'Live Flare / Process Unit Hot Work Assessment'],
    sops: ['SOP-OG-01: Positive Isolation, Spading & Blind Register', 'SOP-OG-02: Continuous Gas Testing (LEL / O2 / H2S / CO)', 'SOP-OG-03: Management of Change (MOC) & PSSR'],
    inspectionChecklists: ['Hazardous Area (Zone 0/1/2) Ex-Equipment Audit', 'Relief Valve, Rupture Disc & Flare Ignition Check', 'Deluge, Foam Pourer & Firewater Ring Main Audit'],
    mandatoryPermits: ['Hot Work', 'Confined Space', 'Line Breaking', 'LOTO', 'Excavation', 'Lifting', 'Work at Height'],
    legalCompliance: ['OISD Standards & PNGRB T4S Regulations', 'MSIHC Rules & Petroleum Act (PESO)', 'OSHA 29 CFR 1910.119 PSM / API RP 754'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 50001', 'API / IOGP Life-Saving Rules'],
    environmentalControls: ['Methane LDAR fugitive emissions reduction', 'Flare minimization & SOx/NOx stack CEMS', 'Oily sludge bioremediation & ballast water control'],
    emergencyScenarios: ['Hydrocarbon Jet / Pool Fire & ESD Activation', 'H2S Sour Gas Plume Shelter-in-Place', 'Marine / Tank Farm Major Oil Spill Tier 1–3'],
    trainingRequirements: ['H2S Alive & SCBA Breathing Apparatus', 'Authorized Gas Tester (AGT) Level 1–3', 'Process Safety & Barrier Management'],
    benchmarkKpis: [
      { metric: 'Tier 1 / Tier 2 PSE', target: '0', unit: 'Events' },
      { metric: 'Gas Test Compliance on PTW', target: '100%', unit: 'Permits' },
      { metric: 'Safety Critical Element PM', target: '≥ 99%', unit: 'On-Time' },
    ],
    quickRoutes: [
      { label: 'Smart Permit to Work', routeKey: 'ptw' },
      { label: 'HIRA / HAZOP / LOTO', routeKey: 'risk-assessment' },
      { label: 'Emergency Command', routeKey: 'emergency' },
    ],
  },
  {
    id: 'chemical',
    name: 'Chemical Industries',
    sectorGroup: 'Specialty & Bulk Chemicals',
    summary: 'Exothermic reactions, corrosive/toxic bulk storage, HAZOP/LOPA studies, chemical compatibility, and off-site emergency plans.',
    topRisks: [
      { hazard: 'Runaway exothermic reaction & reactor over-pressurization', severity: 'Critical', primaryControl: 'Redundant temperature interlocks, emergency quench, relief sizing' },
      { hazard: 'Toxic gas release (Chlorine / Ammonia / Phosgene / SO2)', severity: 'Critical', primaryControl: 'Absorption scrubbers, auto-isolation valves, perimeter sensors' },
      { hazard: 'Incompatible chemical mixing during unloading & warehousing', severity: 'High', primaryControl: 'Segregated bunded zones, unloading checklist, SDS verification' },
    ],
    hiraJsaTemplates: ['Bulk Tanker Unloading & Hose Coupling JSA', 'Exothermic Reactor HAZOP / LOPA Review', 'Corrosive Pipeline Flange Breaking HIRA'],
    sops: ['SOP-CHEM-01: Chemical Compatibility & Bunded Storage Matrix', 'SOP-CHEM-02: Tanker Unloading Earthing & Vapor Return', 'SOP-CHEM-03: On-Site & Off-Site Chemical Emergency Plan'],
    inspectionChecklists: ['Emergency Eyewash / Safety Shower Weekly Flow Audit', 'Secondary Containment Dyke & Sump Valve Inspection', 'GHS Labeling & Updated 16-Section SDS Audit'],
    mandatoryPermits: ['Line Breaking', 'Confined Space', 'Hot Work', 'LOTO', 'Cold Work'],
    legalCompliance: ['MSIHC Rules 1989 & Chemical Accidents (EPPR) Rules', 'Factories Act Section 41B Disclosure', 'GHS Hazard Communication / OSHA HazCom'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015', 'Responsible Care Reference'],
    environmentalControls: ['Online CEMS & OCEMS effluent telemetry', 'Scrubber pH/ORP continuous neutralization', 'Hazardous waste Form-10 manifest tracking'],
    emergencyScenarios: ['Toxic Gas Plume Dispersion & Community Siren', 'Chemical Tanker Rollover / Hose Rupture', 'Reactor Cooling Failure Quench Activation'],
    trainingRequirements: ['HAZMAT Technician & Chemical Suit Donning', 'GHS / SDS Hazard Communication', 'Process Safety & Emergency Neutralization'],
    benchmarkKpis: [
      { metric: 'SDS Availability & Currency', target: '100%', unit: 'Chemicals' },
      { metric: 'HAZOP Action Closure', target: '100%', unit: 'High Priority' },
      { metric: 'Zero Spill Containment', target: '0', unit: 'Uncontained' },
    ],
    quickRoutes: [
      { label: 'Risk & HAZOP', routeKey: 'risk-assessment' },
      { label: 'Legal Register', routeKey: 'legal' },
      { label: 'Environment & Waste', routeKey: 'environment' },
    ],
  },
  {
    id: 'warehousing-logistics',
    name: 'Warehousing & Logistics',
    sectorGroup: 'Supply Chain, Cold Chain & Distribution',
    summary: 'High-bay racking, MHE/reach-truck fleets, loading dock operations, battery charging rooms, and hazardous goods storage.',
    topRisks: [
      { hazard: 'Reach truck / forklift collision with pedestrians or racking uprights', severity: 'Critical', primaryControl: 'Physical pedestrian barriers, rack column guards, speed zoning' },
      { hazard: 'High-bay pallet racking collapse & falling merchandise', severity: 'Critical', primaryControl: 'Load-rating signage, annual rack structural audit, damaged-beam lockout' },
      { hazard: 'Loading dock trailer drive-away & fall from dock edge', severity: 'High', primaryControl: 'Dock locks, wheel chocks, key-handover protocol, red/green dock lights' },
    ],
    hiraJsaTemplates: ['High-Bay Racking Inspection & Repair JSA', 'Dock Leveler Loading & Trailer Restraint HIRA', 'Forklift Battery Changing & Acid Safety JSA'],
    sops: ['SOP-LOG-01: MHE Pre-Shift Checklist & Pedestrian Segregation', 'SOP-LOG-02: Safe Trailer Docking & Key Control', 'SOP-LOG-03: Racking Load Limits & Damage Reporting'],
    inspectionChecklists: ['MHE Horn, Beacon, Brakes & Seatbelt Daily Check', 'Pallet Rack Upright & Beam Integrity Audit', 'Sprinkler Clearance (18-inch) & Fire Aisle Check'],
    mandatoryPermits: ['Work at Height', 'Electrical', 'Hot Work', 'General Work'],
    legalCompliance: ['Motor Vehicles Act / Hazmat Transport Rules', 'Factories / Warehousing Fire Safety NOC', 'OSHA 1910.178 Powered Industrial Trucks'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 9001:2015', 'ISO 39001 Road Traffic Safety'],
    environmentalControls: ['Fleet EV transition & route fuel intensity', 'Cold-storage low-GWP refrigerant leak detection', 'Corrugated & stretch-wrap recycling'],
    emergencyScenarios: ['High-Bay Warehouse Fire & ESFR Sprinkler Response', 'Racking Collapse & Entrapment', 'Battery Room Acid Spill & Hydrogen Venting'],
    trainingRequirements: ['Certified Forklift & Reach Truck Operator', 'Safe Manual Handling & Ergonomics', 'Hazmat Segregation & Spill Kit Use'],
    benchmarkKpis: [
      { metric: 'MHE Operator Certification', target: '100%', unit: 'Drivers' },
      { metric: 'Rack Damage Open >7 Days', target: '0', unit: 'Bays' },
      { metric: 'Dock Safety Verification', target: '100%', unit: 'Trailers' },
    ],
    quickRoutes: [
      { label: 'Observations & Near Miss', routeKey: 'observations' },
      { label: 'Equipment & MHE', routeKey: 'equipment' },
      { label: 'Safety Inspections', routeKey: 'audits' },
    ],
  },
  {
    id: 'power-utilities',
    name: 'Power & Utilities',
    sectorGroup: 'Thermal, Solar, Wind & Grid T&D',
    summary: 'High-voltage substations, boiler turbines, wind turbine nacelles, utility-scale solar arrays, and overhead line maintenance.',
    topRisks: [
      { hazard: 'HV electrocution, induction voltage & arc flash in switchyards', severity: 'Critical', primaryControl: 'Permit-to-Work earth switches, live-dead-live test, arc-rated PPE' },
      { hazard: 'High-pressure steam leak & turbine hall thermal hazards', severity: 'Critical', primaryControl: 'Thermal insulation, acoustic leak sensors, isolation bypass locks' },
      { hazard: 'Work at height on transmission towers & wind turbine nacelles', severity: 'Critical', primaryControl: 'Twin-lanyard fall arrest, climb assist, anemometer wind cutoff' },
    ],
    hiraJsaTemplates: ['132kV/400kV Switchyard Bay Isolation & Earthing JSA', 'Wind Turbine Nacelle & Blade Access HIRA', 'Coal / Gas Boiler Tube Repair Confined Space JSA'],
    sops: ['SOP-PWR-01: Six-Step HV Electrical Isolation & Temporary Earthing', 'SOP-PWR-02: Solar DC Arc Fault & Inverter LOTO', 'SOP-PWR-03: Tower Climb & Aerial Rescue Readiness'],
    inspectionChecklists: ['Switchyard SF6 Pressure, Earthing Mat & Interlock Audit', 'Insulated Gloves, Hot Sticks & Voltage Detector Calibration', 'Turbine Oil Containment & Fire Deluge Audit'],
    mandatoryPermits: ['Electrical', 'LOTO', 'Work at Height', 'Confined Space', 'Hot Work', 'Excavation'],
    legalCompliance: ['CEA Safety & Electric Supply Regulations 2023', 'Indian Boilers Regulations (IBR)', 'OSHA 1910.269 Electric Power Generation & T&D'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 50001:2018', 'ISO 55001 Asset Management'],
    environmentalControls: ['FGD SOx/NOx/SPM continuous emission monitoring', 'SF6 gas leak inventory & recovery', 'Fly-ash utilization & transformer oil PCB testing'],
    emergencyScenarios: ['Transformer Oil Fire & Nitrogen Injection System', 'HV Electric Shock Rescue & Insulated Hook Protocol', 'Wind Turbine Tower Evacuation'],
    trainingRequirements: ['Authorized HV Switching & Earthing Person', 'GWO Working at Heights & Manual Handling', 'Arc Flash & CPR / AED Rescue'],
    benchmarkKpis: [
      { metric: 'HV Permit Earthing Verification', target: '100%', unit: 'Switchings' },
      { metric: 'Dielectric PPE Calibration', target: '100%', unit: 'Valid' },
      { metric: 'SF6 Leak Rate', target: '< 0.5%', unit: 'Annual' },
    ],
    quickRoutes: [
      { label: 'LOTO & Electrical', routeKey: 'loto' },
      { label: 'Permit to Work', routeKey: 'ptw' },
      { label: 'Equipment Calibration', routeKey: 'equipment' },
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    sectorGroup: 'OEM Assembly, EV Battery & Paint Shop',
    summary: 'Stamping press shops, robotic body-in-white welding, solvent/e-coat paint shops, EV high-voltage battery assembly, and test tracks.',
    topRisks: [
      { hazard: 'Robotic welding cell intrusion & automated AGV collisions', severity: 'Critical', primaryControl: 'Safety PLC perimeter fencing, trapped-key interlocks, LiDAR AGV stops' },
      { hazard: 'EV high-voltage battery pack short-circuit & thermal runaway', severity: 'Critical', primaryControl: 'HV insulated tooling, thermal imaging cameras, submersion/quarantine bay' },
      { hazard: 'Paint shop flammable VOC atmosphere & isocyanate inhalation', severity: 'High', primaryControl: 'ATEX spray booths, air-supplied hoods, LEL exhaust interlocks' },
    ],
    hiraJsaTemplates: ['EV Traction Battery Pack Assembly & Testing JSA', 'Paint Booth Solvent Flushing & Maintenance HIRA', 'Robotic Body-in-White Cell Entry LOTO JSA'],
    sops: ['SOP-AUTO-01: EV High-Voltage Quarantine & Thermal Runaway Protocol', 'SOP-AUTO-02: Robotic Cell Teach-Mode & Safety PLC Verification', 'SOP-AUTO-03: Paint Shop Static Bonding & Isocyanate Monitoring'],
    inspectionChecklists: ['Stamping Press Dual-Palm & Light Curtain Daily Check', 'Paint Booth Airflow, LEL & Fire Suppression Audit', 'EV Battery Assembly Insulated Tooling & Floor Mat Audit'],
    mandatoryPermits: ['LOTO', 'Electrical', 'Hot Work', 'Work at Height', 'Confined Space', 'Lifting'],
    legalCompliance: ['Factories Act / OSHWC Code', 'Battery Waste Management Rules (EV)', 'OSHA 1910 Robotics & Spray Finishing Reference'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'IATF 16949 Quality Alignment', 'ISO 50001'],
    environmentalControls: ['Paint shop VOC RTO abatement efficiency', 'Paint sludge & phosphate waste minimization', 'Closed-loop wash water & Scope 3 supplier GHG'],
    emergencyScenarios: ['EV Battery Pack Thermal Runaway Containment', 'Paint Booth / Mixing Room Flash Fire', 'Stamping Press Mechanical Entrapment'],
    trainingRequirements: ['EV High-Voltage Level 1–3 Safety', 'Robotic Cell & LOTO Authorization', 'Ergonomics for Overhead Assembly Lines'],
    benchmarkKpis: [
      { metric: 'Safety Interlock Verification', target: '100%', unit: 'Cells' },
      { metric: 'EV HV Technician Certified', target: '100%', unit: 'Roster' },
      { metric: 'Paint Shop VOC Emission', target: '100%', unit: 'Within Norms' },
    ],
    quickRoutes: [
      { label: 'Risk & LOTO', routeKey: 'risk-assessment' },
      { label: 'Training Matrix', routeKey: 'training' },
      { label: 'Master KPI Hub', routeKey: 'master-kpi' },
    ],
  },
  {
    id: 'food-processing',
    name: 'Food Processing',
    sectorGroup: 'Agri-Food, Cold Chain & Beverage',
    summary: 'Ammonia refrigeration, grain/sugar combustible dust control, steam cookers/retorts, high-pressure sanitation, and cold rooms.',
    topRisks: [
      { hazard: 'Combustible dust explosion (flour, sugar, starch, spice mills)', severity: 'Critical', primaryControl: 'Dust-tight electricals, housekeeping <0.8mm, explosion venting, spark detection' },
      { hazard: 'Anhydrous ammonia refrigeration leak & cold-room entrapment', severity: 'Critical', primaryControl: 'Ammonia detectors, emergency dump/scrubber, internal cold-room release & alarm' },
      { hazard: 'Sanitation lacerations, thermal scalds & wet-floor slips', severity: 'High', primaryControl: 'Cut-resistant mesh gloves, slip-resistant footwear, locked mixer blades' },
    ],
    hiraJsaTemplates: ['Silo / Grain Bin Confined Space Entry JSA', 'Ammonia Compressor Room Maintenance HIRA', 'Mixer / Slicer Sanitation LOTO JSA'],
    sops: ['SOP-FOOD-01: Combustible Dust Housekeeping & Hot Work Prohibition', 'SOP-FOOD-02: Ammonia Leak Response & Wind-Direction Muster', 'SOP-FOOD-03: Sanitation Shift Zero-Energy LOTO Verification'],
    inspectionChecklists: ['Grain / Powder Dust Collector & Grounding Audit', 'Ammonia Plant Detector Calibration & SCBA Check', 'Cold Storage Internal Door Release & Alarm Test'],
    mandatoryPermits: ['Confined Space', 'LOTO', 'Hot Work', 'Work at Height', 'Cold Work'],
    legalCompliance: ['Factories Act / OSHWC Code', 'FSSAI Hygiene & Facility Infrastructure Norms', 'NFPA 652 Combustible Dust / IIAR Ammonia Reference'],
    isoStandards: ['ISO 45001:2018', 'ISO 14001:2015', 'ISO 22000 Food Safety Alignment', 'ISO 50001'],
    environmentalControls: ['High-BOD food effluent biogas/ETP recovery', 'Organic food byproduct valorization', 'Refrigeration energy optimization & leak log'],
    emergencyScenarios: ['Ammonia Compressor Leak & Perimeter Evacuation', 'Silo Engulfment / Dust Deflagration Response', 'Cold Room Worker Entrapment Rescue'],
    trainingRequirements: ['Ammonia Emergency Response (HAZWOPER)', 'Combustible Dust Hazard Awareness', 'Sanitation LOTO & Chemical Safety'],
    benchmarkKpis: [
      { metric: 'Dust Housekeeping Audit', target: '100%', unit: 'Zones' },
      { metric: 'Sanitation LOTO Compliance', target: '100%', unit: 'Shifts' },
      { metric: 'ETP BOD/COD Compliance', target: '100%', unit: 'Samples' },
    ],
    quickRoutes: [
      { label: 'Permit to Work', routeKey: 'ptw' },
      { label: 'Emergency & Fire', routeKey: 'emergency' },
      { label: 'Environment & Water', routeKey: 'environment' },
    ],
  },
];

export interface ComplianceRuleRow {
  id: string;
  country: string;
  state: string;
  industry: string;
  activity: string;
  regulation: string;
  requirement: string;
  effectiveDate: string;
  amendmentNote: string;
  officialSourceName: string;
  officialSourceUrl: string;
  verificationStatus: 'Official Source Linked' | 'Transitional — Verify State Notification' | 'International Standard Reference';
}

export const GLOBAL_COMPLIANCE_ENGINE: ComplianceRuleRow[] = [
  {
    id: 'ind-oshwc',
    country: 'India',
    state: 'All India (Central + State Rules)',
    industry: 'All Industries',
    activity: 'Workplace Health, Safety, Welfare & Contractor Licensing',
    regulation: 'Occupational Safety, Health and Working Conditions (OSHWC) Code, 2020 (Transitional with Factories Act, 1948)',
    requirement: 'Maintain digital safety register, safety committee (>=250 workers), medical exams, annual health checks, incident reporting & contractor license verification.',
    effectiveDate: 'Enacted 2020 · Verify Central/State Gazette Commencement Date',
    amendmentNote: 'Factories Act 1948 and State Factory Rules continue to apply in each state until respective OSHWC Code rules are notified in the Official Gazette.',
    officialSourceName: 'Ministry of Labour & Employment (India)',
    officialSourceUrl: 'https://labour.gov.in/',
    verificationStatus: 'Transitional — Verify State Notification',
  },
  {
    id: 'ind-ts-factories',
    country: 'India',
    state: 'Telangana',
    industry: 'Manufacturing / Pharmaceutical / Semiconductor',
    activity: 'Factory Licensing, Lifting Equipment & Pressure Vessel Testing',
    regulation: 'Telangana Factories Rules (under Factories Act, 1948)',
    requirement: 'Annual examination of hoists, cranes, lifting tackles (Form 9), pressure vessels (Form 8), qualified Safety Officer appointment, and Form 18 accident reporting.',
    effectiveDate: 'Active State Rules',
    amendmentNote: 'Online renewal and statutory filings via Telangana Factories Department portal.',
    officialSourceName: 'Directorate of Factories, Telangana',
    officialSourceUrl: 'https://tsfactories.cgg.gov.in/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'ind-mh-factories',
    country: 'India',
    state: 'Maharashtra',
    industry: 'Manufacturing / Chemical / Automotive',
    activity: 'Hazardous Process Control & Safety Audits',
    regulation: 'Maharashtra Factories Rules, 1963 & Safety Audit Rules',
    requirement: 'Periodic independent safety audit (IS 14489), on-site emergency plan, health register (Form 7), and DISH annual returns.',
    effectiveDate: 'Active State Rules',
    amendmentNote: 'Verify latest DISH Maharashtra circulars for online safety audit submission.',
    officialSourceName: 'DISH Maharashtra',
    officialSourceUrl: 'https://mahadish.in/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'ind-cea-elec',
    country: 'India',
    state: 'All India',
    industry: 'Data Center / Power & Utilities / Manufacturing',
    activity: 'HV/MV Electrical Installations, Earthing & LOTO',
    regulation: 'CEA (Measures Relating to Safety and Electric Supply) Regulations, 2023',
    requirement: 'Chartered Electrical Safety Engineer inspection, earthing resistance tests, ELCB/RCCB protection, arc-flash safety clearances, and electrical accident reporting.',
    effectiveDate: 'June 2023 (Supersedes 2010 Regulations)',
    amendmentNote: 'Updated provisions for renewable energy, EV charging, and digital safety records.',
    officialSourceName: 'Central Electricity Authority (CEA)',
    officialSourceUrl: 'https://cea.nic.in/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'ind-nbc-fire',
    country: 'India',
    state: 'All India / State Fire Services',
    industry: 'IT & Corporate / Healthcare / Data Center / Warehousing',
    activity: 'Building Fire Detection, Suppression & Egress',
    regulation: 'National Building Code (NBC) of India 2016 — Part 4 (Fire & Life Safety)',
    requirement: 'Fire NOC renewal, biannual fire evacuation drills, hydrant/sprinkler pressure logs, smoke detection, and unobstructed fire exits.',
    effectiveDate: 'NBC 2016 (Current Edition)',
    amendmentNote: 'Enforced through State Fire Prevention & Life Safety Acts and municipal bylaws.',
    officialSourceName: 'Bureau of Indian Standards (BIS)',
    officialSourceUrl: 'https://www.bis.gov.in/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'ind-cpcb-env',
    country: 'India',
    state: 'All India / SPCB',
    industry: 'Chemical / Pharmaceutical / Manufacturing / Oil & Gas',
    activity: 'Air Emissions, Effluent Discharge & Hazardous Waste',
    regulation: 'Environment (Protection) Act, 1986; Hazardous & Other Wastes Rules, 2016; E-Waste Rules, 2022',
    requirement: 'Valid Consent to Operate (CTO), Form-4 annual hazardous waste return, Form-10 manifests, OCEMS/CEMS connectivity where mandated, and EPR filings.',
    effectiveDate: 'Active (Amended 2022–2024)',
    amendmentNote: 'Extended Producer Responsibility (EPR) portals apply to plastic, e-waste, and battery waste.',
    officialSourceName: 'Central Pollution Control Board (CPCB)',
    officialSourceUrl: 'https://cpcb.nic.in/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'usa-osha-1910',
    country: 'United States',
    state: 'Federal (OSHA / State Plans)',
    industry: 'Manufacturing / Oil & Gas / Warehousing / Construction',
    activity: 'General Industry, LOTO, PSM & Construction Safety',
    regulation: 'OSHA 29 CFR 1910 (1910.147 LOTO, 1910.119 PSM, 1910.146 Confined Space) & 29 CFR 1926',
    requirement: 'Written energy control procedures, annual LOTO audit, OSHA 300/300A injury logs, fall protection >=4ft/6ft, and hazard communication (GHS).',
    effectiveDate: 'Active Federal CFR',
    amendmentNote: 'State-plan states (e.g., Cal/OSHA) may enforce stricter state-specific standards.',
    officialSourceName: 'U.S. OSHA',
    officialSourceUrl: 'https://www.osha.gov/',
    verificationStatus: 'Official Source Linked',
  },
  {
    id: 'global-iso-45001',
    country: 'Global / Multi-Region',
    state: 'International',
    industry: 'All Industries',
    activity: 'Occupational Health & Safety Management System',
    regulation: 'ISO 45001:2018 (OH&S) · ISO 14001:2015 (EMS) · ISO 9001:2015 (QMS) · ISO 50001:2018 (EnMS) · ISO 27001:2022 (ISMS)',
    requirement: 'Context & interested parties, worker consultation, HIRA/aspect-impact registers, legal evaluation of compliance, internal audits, CAPA & management review.',
    effectiveDate: 'Current ISO Editions (Incl. 2024 Climate Action Amendments)',
    amendmentNote: '2024 ISO Climate Change Amendments require organizations to evaluate climate relevance in Clauses 4.1 & 4.2.',
    officialSourceName: 'International Organization for Standardization (ISO)',
    officialSourceUrl: 'https://www.iso.org/',
    verificationStatus: 'International Standard Reference',
  },
  {
    id: 'global-esg-ghg',
    country: 'Global / India / EU',
    state: 'International / SEBI BRSR / CSRD',
    industry: 'All Industries',
    activity: 'GHG Emissions Accounting & ESG Sustainability Disclosures',
    regulation: 'GHG Protocol Corporate Standard (Scope 1, 2, 3) · SEBI BRSR Core · GRI · IFRS S1/S2',
    requirement: 'Auditable activity-data logs for fuel combustion, purchased electricity, water withdrawal/discharge, waste intensity, LTIFR, and training hours.',
    effectiveDate: 'Active FY 2024–2026 Reporting Cycles',
    amendmentNote: 'Assurance readiness requires verifiable emission factor citations and boundary disclosures.',
    officialSourceName: 'GHG Protocol / WRI & WBCSD',
    officialSourceUrl: 'https://ghgprotocol.org/',
    verificationStatus: 'International Standard Reference',
  },
];

export const AI_DOCUMENT_TYPES = [
  { name: 'HIRA (Hazard Identification & Risk Assessment)', category: 'Risk Engineering', aiMode: 'Draft HIRA Matrix' },
  { name: 'JSA (Job Safety Analysis)', category: 'Task Safety', aiMode: 'Generate JSA / JHA / SWMS' },
  { name: 'JHA (Job Hazard Analysis)', category: 'Task Safety', aiMode: 'Generate JSA / JHA / SWMS' },
  { name: 'SOP (Standard Operating Procedures)', category: 'Procedures', aiMode: 'General EHS Advisory' },
  { name: 'Risk Assessment Reports', category: 'Risk Engineering', aiMode: 'Draft HIRA Matrix' },
  { name: 'Method Statements (SWMS / RAMS)', category: 'Construction & EPC', aiMode: 'Generate JSA / JHA / SWMS' },
  { name: 'Safety Inspection Checklists', category: 'Audits & Inspections', aiMode: 'Safety Audit Checklist Generator' },
  { name: 'Emergency Response Plans (ERP)', category: 'Emergency Prep', aiMode: 'General EHS Advisory' },
  { name: 'Incident Investigation Reports', category: 'Incident Mgmt', aiMode: '5-Why & Fishbone RCA' },
  { name: 'Root Cause Analysis (5-Why / Fishbone)', category: 'Incident Mgmt', aiMode: '5-Why & Fishbone RCA' },
  { name: 'CAPA Action Plans', category: 'Corrective Action', aiMode: 'Draft Corrective & Preventive Actions (CAPA)' },
  { name: 'Toolbox Talk (TBT) Materials', category: 'Workforce Briefing', aiMode: 'Toolbox Talk Script' },
  { name: 'Safety Training Materials', category: 'Competency', aiMode: 'Toolbox Talk Script' },
  { name: 'Safety Audit Reports', category: 'Audits & Inspections', aiMode: 'Safety Audit Checklist Generator' },
  { name: 'Environmental Assessment Reports', category: 'ESG & Environment', aiMode: 'Indian OSH Code 2020 / Legal Compliance' },
];

export const SMART_PTW_TYPES = [
  { code: 'PTW-HOT', name: 'Hot Work Permit', risk: 'Critical', controls: 'Fire watch 60 min, LEL gas test, spark blankets, extinguisher staged' },
  { code: 'PTW-CLD', name: 'Cold Work Permit', risk: 'Medium', controls: 'Area handover, task JSA, standard PPE, tool inspection' },
  { code: 'PTW-CSF', name: 'Confined Space Entry', risk: 'Critical', controls: 'Continuous O2/LEL/CO/H2S test, hole watch, tripod rescue, forced ventilation' },
  { code: 'PTW-WAH', name: 'Work at Height Permit', risk: 'Critical', controls: '100% tie-off harness, green-tagged scaffold, drop-zone barricade, wind check' },
  { code: 'PTW-ELC', name: 'Electrical Work Permit', risk: 'Critical', controls: 'HV/LV isolation, live-dead-live check, arc-rated PPE, insulated tools' },
  { code: 'PTW-EXC', name: 'Excavation Permit', risk: 'High', controls: 'Underground cable scan, sloping/shoring >1.5m, edge barricades & ladder' },
  { code: 'PTW-LFT', name: 'Lifting & Rigging Permit', risk: 'High', controls: 'Certified crane & slings, lift plan, outrigger mats, exclusion zone' },
  { code: 'PTW-LBR', name: 'Line Breaking Permit', risk: 'Critical', controls: 'Positive isolation/spading, depressurization, drain/purge, chemical suit' },
  { code: 'PTW-LOT', name: 'LOTO / Energy Isolation', risk: 'Critical', controls: 'Multi-lock hasp, zero-energy verification, isolation point tag register' },
  { code: 'PTW-GEN', name: 'General Work Permit', risk: 'Medium', controls: 'Contractor induction verified, toolbox talk logged, housekeeping closure' },
];

export const PTW_WORKFLOW_STAGES = [
  { step: '01', title: 'Request Submission', role: 'Performing Authority / Contractor', detail: 'Scope, location, hazards, JSA, worker roster & SIMOPS check logged.' },
  { step: '02', title: 'Department Head Approval', role: 'Area Owner / HOD', detail: 'Confirms operational readiness, equipment handover & area isolations.' },
  { step: '03', title: 'Safety Dept Final Approval', role: 'EHS Officer / Safety Manager', detail: 'Verifies gas tests, LOTO, rescue readiness & Three Golden Rules.' },
  { step: '04', title: 'Work Authorization', role: 'QR Digital Issuance', detail: 'Time-bound QR permit activated with shift validity and conditions.' },
  { step: '05', title: 'Execution Monitoring', role: 'Field Audits & Extensions', detail: 'Live field QR checks, shift handovers, extensions or instant suspension.' },
  { step: '06', title: 'Closure & Handback', role: 'Area Owner & Safety', detail: 'Housekeeping confirmed, LOTO removed, equipment safely restored.' },
];

export const AI_VISION_CAPABILITIES = [
  { title: 'PPE Compliance Detection', detail: 'Identifies missing mandatory PPE ensembles at shop-floor entry gates and high-risk bays.' },
  { title: 'Safety Helmet Verification', detail: 'Flags hard-hat non-compliance in construction, crane, and overhead hazard zones.' },
  { title: 'High-Visibility Vest Detection', detail: 'Verifies reflective vest presence in logistics docks, yards, and mobile equipment corridors.' },
  { title: 'Restricted Area Intrusion', detail: 'Alerts when personnel cross virtual geofences around energized switchgear or robotic cells.' },
  { title: 'Unsafe Act & Unsafe Condition', detail: 'Flags blocked fire exits, unbarricaded openings, and missing edge protection for review.' },
  { title: 'Fire & Smoke Early Detection', detail: 'Early optical smoke and flame signature alerts complementing certified fire panels.' },
  { title: 'Fall & Man-Down Detection', detail: 'Triggers rapid medical dispatch alerts when prolonged prone posture is detected in lone-worker zones.' },
  { title: 'Vehicle–Pedestrian Proximity', detail: 'Monitors forklift and HEMM blind spots near pedestrian crossings and dock lanes.' },
  { title: 'Machine Guarding Open-Door', detail: 'Detects bypassed perimeter gates or exposed pinch zones during active equipment cycles.' },
  { title: 'Human Verification & Privacy', detail: 'Every flagged frame routes to a human EHS reviewer with configurable retention and privacy masking.' },
];

export const DIGITAL_TWIN_FACILITIES = [
  {
    id: 'factory',
    name: 'Industrial Manufacturing Plant',
    zones: [
      { id: 'z1', label: 'Stamping Press Bay', type: 'hazard', x: 24, y: 34, note: 'High-noise & LOTO mandatory zone · Guard interlock verification required.' },
      { id: 'z2', label: 'Main Emergency Exit North', type: 'exit', x: 78, y: 18, note: 'Illuminated push-bar egress route — clear path audit verified.' },
      { id: 'z3', label: 'Hydrant & CO2 Extinguisher Bank', type: 'fire', x: 46, y: 58, note: 'Fire water pressure monitor & Class B/C extinguishers.' },
      { id: 'z4', label: 'Primary Assembly Point A', type: 'assembly', x: 86, y: 76, note: 'Upwind muster station · Capacity 350 personnel · First-aid locker.' },
      { id: 'z5', label: 'HV Switchgear Restricted Room', type: 'restricted', x: 16, y: 70, note: 'Authorized HV electricians only · Arc-flash PPE boundary.' },
      { id: 'z6', label: 'Occupational Health & First Aid', type: 'firstaid', x: 64, y: 42, note: 'AED, eyewash station, trauma kit & standby nurse bay.' },
    ],
  },
  {
    id: 'semiconductor',
    name: 'Semiconductor Cleanroom Fab',
    zones: [
      { id: 's1', label: 'Sub-Fab Specialty Gas Bunker', type: 'hazard', x: 22, y: 32, note: 'Silane/HF gas cabinets · Continuous TGMS & scrubber interlock.' },
      { id: 's2', label: 'Cleanroom Airlock Emergency Exit', type: 'exit', x: 80, y: 22, note: 'Break-glass override egress — direct route to muster zone.' },
      { id: 's3', label: 'VESDA & Clean Agent Panel', type: 'fire', x: 52, y: 48, note: 'Aspirating smoke detection & clean-agent manifold.' },
      { id: 's4', label: 'Upwind Assembly Point East', type: 'assembly', x: 88, y: 78, note: 'Wind-sock monitored chemical muster station.' },
      { id: 's5', label: 'Class 4 Lithography Laser Zone', type: 'restricted', x: 34, y: 68, note: 'Interlocked optics enclosure · Certified tool engineers only.' },
      { id: 's6', label: 'HF Antidote & Deluge Shower', type: 'firstaid', x: 62, y: 34, note: 'Calcium gluconate gel + 15-min tepid emergency drench shower.' },
    ],
  },
  {
    id: 'datacenter',
    name: 'Hyperscale Data Center',
    zones: [
      { id: 'd1', label: 'MV Switchgear & UPS Hall', type: 'restricted', x: 24, y: 38, note: 'NFPA 70E arc-flash zone · Electrical PTW & LOTO required.' },
      { id: 'd2', label: 'Li-Ion Battery Room B', type: 'hazard', x: 48, y: 64, note: 'BMS thermal sensors & dedicated hydrogen exhaust.' },
      { id: 'd3', label: 'Novec 1230 Fire Manifold', type: 'fire', x: 64, y: 30, note: 'Pre-action & clean-agent discharge abort station.' },
      { id: 'd4', label: 'Emergency Egress Corridor', type: 'exit', x: 82, y: 20, note: 'Dual-path egress clear of raised floor cabling.' },
      { id: 'd5', label: 'Perimeter Muster Point', type: 'assembly', x: 86, y: 78, note: 'Security gatehead count checkpoint.' },
      { id: 'd6', label: 'First Aid & AED Station', type: 'firstaid', x: 38, y: 26, note: 'Automated External Defibrillator + insulated rescue hook.' },
    ],
  },
  {
    id: 'pharma',
    name: 'Pharmaceutical API Facility',
    zones: [
      { id: 'p1', label: 'Solvent Reactor Block B', type: 'hazard', x: 26, y: 38, note: 'Zone 1 FLP hazardous area · Static bonding & nitrogen inerting.' },
      { id: 'p2', label: 'OEB-5 Potent Isolator Suite', type: 'restricted', x: 54, y: 32, note: 'Negative pressure containment · Authorized gowning & PAPR.' },
      { id: 'p3', label: 'Foam Deluge & Hydrant Monitor', type: 'fire', x: 42, y: 66, note: 'AFFF foam tank & reactor deluge manifold.' },
      { id: 'p4', label: 'Emergency Exit Gate 2', type: 'exit', x: 80, y: 22, note: 'Unobstructed perimeter escape path.' },
      { id: 'p5', label: 'Chemical Decontamination & First Aid', type: 'firstaid', x: 66, y: 54, note: 'Neutralizing diphoterine & occupational health clinic.' },
      { id: 'p6', label: 'Assembly Point South', type: 'assembly', x: 86, y: 80, note: 'Crosswind evacuation assembly area.' },
    ],
  },
  {
    id: 'construction',
    name: 'Construction & EPC Project Site',
    zones: [
      { id: 'c1', label: 'Deep Excavation & Shoring Pit', type: 'hazard', x: 28, y: 44, note: '3.2m excavation · Shoring & cable scan permit active.' },
      { id: 'c2', label: 'Tower Crane Swing Drop Zone', type: 'restricted', x: 54, y: 34, note: 'Hard barricaded lifting exclusion zone · Banksman controlled.' },
      { id: 'c3', label: 'Site Fire Point & Sand Buckets', type: 'fire', x: 42, y: 68, note: 'Hot-work staging fire point + DCP extinguishers.' },
      { id: 'c4', label: 'Emergency Gate Access', type: 'exit', x: 80, y: 20, note: 'Dedicated ambulance access lane kept clear 24/7.' },
      { id: 'c5', label: 'Site First Aid & Rescue Kit', type: 'firstaid', x: 66, y: 54, note: 'Spine board, trauma kit & harness rescue gear.' },
      { id: 'c6', label: 'Contractor Muster Point', type: 'assembly', x: 86, y: 78, note: 'Daily TBT & headcount assembly yard.' },
    ],
  },
  {
    id: 'corporate',
    name: 'IT & Corporate Campus',
    zones: [
      { id: 'o1', label: 'Basement DG & Electrical Bay', type: 'restricted', x: 22, y: 64, note: 'Authorized facility engineers only · Hearing protection required.' },
      { id: 'o2', label: 'Cafeteria LPG Manifold', type: 'hazard', x: 44, y: 36, note: 'Gas leak shut-off & Ansul kitchen hood suppression.' },
      { id: 'o3', label: 'Fire Stairwell Core A', type: 'exit', x: 76, y: 22, note: 'Pressurized smoke-free escape stairwell.' },
      { id: 'o4', label: 'Sprinkler Riser & Hydrant', type: 'fire', x: 58, y: 58, note: 'Monthly jockey pump & alarm valve inspected.' },
      { id: 'o5', label: 'Campus Medical & AED Room', type: 'firstaid', x: 34, y: 28, note: '24/7 occupational first-aid desk & AED unit.' },
      { id: 'o6', label: 'Lawn Assembly Point', type: 'assembly', x: 86, y: 78, note: 'Floor warden headcount banners.' },
    ],
  },
  {
    id: 'warehouse',
    name: 'Warehouse & Logistics Hub',
    zones: [
      { id: 'w1', label: 'Loading Dock Bays 1–8', type: 'hazard', x: 24, y: 36, note: 'Trailer wheel chocks & red/green dock restraint enforced.' },
      { id: 'w2', label: 'MHE Battery Charging Zone', type: 'restricted', x: 52, y: 64, note: 'Acid eyewash, ventilation & no-ignition perimeter.' },
      { id: 'w3', label: 'ESFR Sprinkler Control Room', type: 'fire', x: 46, y: 30, note: 'High-bay fire pump & riser monitoring.' },
      { id: 'w4', label: 'Pedestrian Safe Exit Door', type: 'exit', x: 80, y: 22, note: 'Segregated walkway away from forklift traffic.' },
      { id: 'w5', label: 'Spill Kit & First Aid Station', type: 'firstaid', x: 68, y: 48, note: 'Universal/chemical absorbents & eyewash.' },
      { id: 'w6', label: 'Yard Assembly Point', type: 'assembly', x: 86, y: 78, note: 'Outside truck turning circle.' },
    ],
  },
  {
    id: 'mining',
    name: 'Mining & Extraction Site',
    zones: [
      { id: 'm1', label: 'Active Bench Blast Zone', type: 'hazard', x: 26, y: 38, note: '500m blast clearance perimeter · Blaster sign-off required.' },
      { id: 'm2', label: 'Explosives Magazine Area', type: 'restricted', x: 18, y: 70, note: 'PESO licensed restricted security perimeter.' },
      { id: 'm3', label: 'HEMM Fire Suppression Bay', type: 'fire', x: 52, y: 56, note: 'Water bowser & AFFF mobile foam trailer.' },
      { id: 'm4', label: 'Emergency Refuge & Egress Haul', type: 'exit', x: 78, y: 24, note: 'Bunded escape ramp clear of haul traffic.' },
      { id: 'm5', label: 'Mine Rescue & Trauma Station', type: 'firstaid', x: 66, y: 44, note: 'SCBA rescue team, oxygen & mine ambulance.' },
      { id: 'm6', label: 'Site Muster & Roll-Call Yard', type: 'assembly', x: 86, y: 78, note: 'Tag-board headcount station.' },
    ],
  },
];

export interface LegalPolicyDoc {
  id: 'privacy' | 'terms' | 'cookies' | 'disclaimer' | 'retention' | 'grievance' | 'copyright';
  title: string;
  updatedAt: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_POLICIES: LegalPolicyDoc[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: '1. Data Controller & Contact',
        body: 'ARSHIEL SAFETY (ARSHIEL EHS AI SOLUTIONS) is owned and operated by Jonathan Thadanki (jonathan.tadanki@gmail.com | +91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48). We process account, organization, and operational EHS records solely to deliver requested workspace functionality and security auditing.',
      },
      {
        heading: '2. Information Collected & Tenant Isolation',
        body: 'We collect user registration details (name, email, role), organization workspace metadata, and EHS records uploaded by authorized users. Each organization workspace is logically isolated by organization identifier with role-based access controls (RBAC). We do not sell user data to third parties.',
      },
      {
        heading: '3. Camera, IoT & AI Processing Notice',
        body: 'AI Vision CCTV integrations and IoT telemetry are inactive by default and only process data when explicitly configured and authorized by a tenant organization in accordance with applicable workplace privacy laws (including India DPDP Act 2023 and GDPR where applicable).',
      },
    ],
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: '1. Scope of Platform & Brand Divisions',
        body: 'ARSHIEL SAFETY provides enterprise EHS software tools, workflows, and AI-assisted drafting utilities. ARSHIEL ASSURANCE provides consultancy, independent readiness assessments, audit support, and training services. Neither division acts as an accredited third-party ISO certification body or government statutory authority.',
      },
      {
        heading: '2. Authorized Use & User Responsibilities',
        body: 'Organizations using ARSHIEL SAFETY remain solely responsible for workplace safety execution, statutory filings, permit verifications, and competent professional review of all operational records and AI-generated drafts.',
      },
      {
        heading: '3. Account Security',
        body: 'Users must maintain confidentiality of credentials and immediately report suspected unauthorized access to Jonathan Thadanki via official contact channels.',
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie & Consent Preferences',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: '1. Strictly Necessary Cookies & Local Storage',
        body: 'ARSHIEL SAFETY uses essential session authentication tokens, organization selection state, and offline PWA draft storage required to operate login, security auditing, and field workflows reliably.',
      },
      {
        heading: '2. Analytics & Optional Preferences',
        body: 'No invasive third-party advertising trackers are embedded in ARSHIEL SAFETY. Users may clear browser storage or sign out at any time to immediately revoke active local session tokens.',
      },
    ],
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer & Limitation of Liability',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: '1. Not Legal Advice or Statutory Authority',
        body: 'Regulatory matrices, ISO clause mappings, OSHWC Code summaries, and legal references inside ARSHIEL SAFETY are informational compliance management tools. They do not constitute legal advice or official government interpretations. Always verify current notifications in official government gazettes and consult qualified legal/EHS counsel.',
      },
      {
        heading: '2. AI Draft Transparency & Human Approval Requirement',
        body: 'AI-generated HIRAs, JSAs, SOPs, RCA drafts, audit checklists, and predictive risk indicators are preliminary drafts only. They must never be treated as automatically approved operational instructions and always require review and formal sign-off by a competent human safety professional.',
      },
      {
        heading: '3. Demo vs Live Data Distinction',
        body: 'Any preview dashboards or sample metrics shown on public marketing pages or in Demo Mode are illustrative demonstration datasets labeled clearly as DEMO DATA and do not represent live client operational metrics.',
      },
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention & Deletion Policy',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: '1. Statutory EHS Retention',
        body: 'Operational EHS records (incidents, permits, training, audits, environmental registers) are retained for the active subscription/workspace period or statutory retention windows configured by the tenant organization.',
      },
      {
        heading: '2. Deletion & Export Requests',
        body: 'Authorized organization administrators may export workspace records (CSV/Excel/PDF) or request account and tenant data deletion by contacting jonathan.tadanki@gmail.com. Verified deletion requests are processed within 30 calendar days, subject to legal hold obligations.',
      },
    ],
  },
  {
    id: 'grievance',
    title: 'Grievance Redressal & Contact Information',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: 'Designated Platform Owner & Grievance Officer',
        body: 'Name: Jonathan Thadanki (Founder, Owner & Lead Developer — ARSHIEL SAFETY / ARSHIEL EHS AI SOLUTIONS & ARSHIEL ASSURANCE). Email: jonathan.tadanki@gmail.com. Direct Phone / WhatsApp: +91 9133 661 933 / +91 81 84 83 40 60 / +91 81 86 80 88 48.',
      },
      {
        heading: 'Response Commitment',
        body: 'Privacy inquiries, security disclosures, data deletion requests, and compliance feedback are acknowledged within 48 business hours and resolved in accordance with applicable data protection regulations.',
      },
    ],
  },
  {
    id: 'copyright',
    title: 'Copyright & Intellectual Property Notices',
    updatedAt: 'Effective 2026',
    sections: [
      {
        heading: 'Ownership & Trademarks',
        body: '© 2026 ARSHIEL SAFETY, ARSHIEL EHS AI SOLUTIONS, and ARSHIEL ASSURANCE. All platform software architecture, original interface designs, workflows, and brand assets are owned by Jonathan Thadanki. All rights reserved.',
      },
      {
        heading: 'Third-Party Standards Reference Notice',
        body: 'References to ISO 9001, ISO 14001, ISO 45001, ISO 50001, ISO 27001, OSHA, NFPA, NBC, and statutory legislation are for educational and compliance-mapping reference only and remain the intellectual property of their respective standards bodies and governments.',
      },
    ],
  },
];
