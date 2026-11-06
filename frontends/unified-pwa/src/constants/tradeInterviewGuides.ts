export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
  category: 'id' | 'financial' | 'skill' | 'general';
}

export interface InterviewQuestionItem {
  question: string;
  practicalTip: string;
  sampleAnswerSummary: string;
}

export interface TradeInterviewGuide {
  tradeKey: string;
  tradeTitle: string;
  iconName: string;
  documents: DocumentItem[];
  questions: InterviewQuestionItem[];
  hrCallingAdvice: string;
}

export const BASE_MANDATORY_DOCUMENTS: DocumentItem[] = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card (Original + 2 Photocopies)',
    description: 'Mandatory government photo ID for gate pass & PF/ESI compliance.',
    isMandatory: true,
    category: 'id'
  },
  {
    id: 'bank_passbook',
    name: 'Bank Passbook / Cancelled Cheque',
    description: 'Required for salary bank account linking (Name must match Aadhaar).',
    isMandatory: true,
    category: 'financial'
  },
  {
    id: 'photos',
    name: 'Passport Size Photos (4 copies)',
    description: 'For physical company ID card and gate pass enrollment.',
    isMandatory: true,
    category: 'general'
  }
];

export const TRADE_INTERVIEW_GUIDES: Record<string, TradeInterviewGuide> = {
  driver: {
    tradeKey: 'driver',
    tradeTitle: 'Driver / Delivery Rider',
    iconName: 'Truck',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'dl',
        name: 'Valid Driving License (LMV / Commercial / 2-Wheeler)',
        description: 'Original physical plastic card or mParivahan digital verified copy.',
        isMandatory: true,
        category: 'skill'
      },
      {
        id: 'pan',
        name: 'PAN Card (Original)',
        description: 'Compulsory for commercial vehicle registration and tax compliance.',
        isMandatory: true,
        category: 'id'
      },
      {
        id: 'vehicle_rc',
        name: 'Vehicle RC + Insurance (For bike delivery / owner-drivers)',
        description: 'Valid registration certificate and active third-party insurance.',
        isMandatory: false,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. What routes or areas have you driven in most frequently?',
        practicalTip: 'Mention familiar arterial roads, bypasses, and peak-hour traffic shortcuts.',
        sampleAnswerSummary: 'Explain your experience with daily GPS navigation and handling traffic safely.'
      },
      {
        question: '2. How do you handle emergency breakdowns or tire punctures?',
        practicalTip: 'Demonstrate knowing how to use the jack, stepney, and basic coolant checks.',
        sampleAnswerSummary: 'Confirm you do daily 5-minute pre-drive inspections (oil, tire pressure, brakes).'
      },
      {
        question: '3. Do you have a clean traffic record without pending challans?',
        practicalTip: 'Be honest and clear about your driving history on Parivahan.',
        sampleAnswerSummary: 'Emphasize your punctuality and adherence to traffic rules and speed limits.'
      },
      {
        question: '4. Are you comfortable with night shifts or outstation trips?',
        practicalTip: 'Confirm your availability and ask about overtime or night allowance.',
        sampleAnswerSummary: 'Confirm availability for company rosters and punctuality at shift start.'
      },
      {
        question: '5. What will you do if a customer or supervisor is angry or delayed?',
        practicalTip: 'Show patience, calm communication, and polite de-escalation.',
        sampleAnswerSummary: 'Politely listen, avoid arguments, and immediately update the supervisor.'
      }
    ],
    hrCallingAdvice: 'Best call window: 10:00 AM - 1:00 PM on weekdays. Keep your driving license number handy.'
  },
  electrician: {
    tradeKey: 'electrician',
    tradeTitle: 'Electrician / Wireman',
    iconName: 'Zap',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'iti_cert',
        name: 'ITI Electrician Certificate / Wireman License',
        description: 'State or NCVT electrical wireman certificate or apprenticeship diploma.',
        isMandatory: true,
        category: 'skill'
      },
      {
        id: 'safety_shoes',
        name: 'Personal Safety Shoes (Electrical Resistant)',
        description: 'Insulated steel-toe safety shoes required for site trials.',
        isMandatory: false,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. What is the difference between Single-Phase and 3-Phase wiring?',
        practicalTip: 'Explain phase voltages (230V vs 415V) and industrial load balancing.',
        sampleAnswerSummary: 'Single-phase is 230V for domestic use; 3-phase is 415V for high loads and motors.'
      },
      {
        question: '2. How do you identify a fault using a Digital Multimeter or Megger?',
        practicalTip: 'Talk about continuity checks, voltage drops, and earth resistance.',
        sampleAnswerSummary: 'Check line-to-earth leakage and test breaker continuity with a multimeter.'
      },
      {
        question: '3. What safety protocols do you follow before touching an MCB or DB panel?',
        practicalTip: 'Always mention Lockout/Tagout (LOTO) and testing with a tester.',
        sampleAnswerSummary: 'Isolate main breaker, tag the switch (LOTO), and test voltage before touching.'
      },
      {
        question: '4. Have you worked with motor starters (DOL, Star-Delta)?',
        practicalTip: 'Mention contactors, thermal overload relays, and control wiring experience.',
        sampleAnswerSummary: 'Explain wiring contactor coils, push buttons, and setting thermal overload relays.'
      },
      {
        question: '5. Can you read architectural wiring layouts and SLD (Single Line Diagrams)?',
        practicalTip: 'Highlight conduit routing and switchboard point markings.',
        sampleAnswerSummary: 'Confirm ability to follow conduit drawings and balance DB panel loads.'
      }
    ],
    hrCallingAdvice: 'HR conducts technical verification between 11:00 AM - 4:00 PM.'
  },
  security: {
    tradeKey: 'security',
    tradeTitle: 'Security Guard / Supervisor',
    iconName: 'Shield',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'police_verification',
        name: 'Police Verification Certificate / Character Certificate',
        description: 'Local police clearance or PSARA verification slip.',
        isMandatory: true,
        category: 'skill'
      },
      {
        id: '10th_marksheet',
        name: '10th / 12th Standard Marksheet',
        description: 'Required to verify minimum age (18+) and basic literacy for logbook entry.',
        isMandatory: true,
        category: 'general'
      }
    ],
    questions: [
      {
        question: '1. Are you comfortable with 12-hour standing shifts (Day/Night rotation)?',
        practicalTip: 'Affirm your stamina and familiarity with security rotation routines.',
        sampleAnswerSummary: 'Confirm physical fitness, discipline, and alertness during night duty.'
      },
      {
        question: '2. How do you record visitor and material entry at the main gate?',
        practicalTip: 'Mention vehicle challans, visitor badges, and register maintenance.',
        sampleAnswerSummary: 'Inspect gate pass, verify driver ID, log entry/exit time, and issue visitor badge.'
      },
      {
        question: '3. What is your immediate action during a fire alarm or emergency?',
        practicalTip: 'Mention alert sounding, calling supervisor, evacuation, and fire extinguisher use.',
        sampleAnswerSummary: 'Sound alarm, guide people to assembly area via fire exits, notify security supervisor.'
      },
      {
        question: '4. What will you do if an unauthorized person insists on entering without a pass?',
        practicalTip: 'Firm yet polite refusal and calling senior security supervisor.',
        sampleAnswerSummary: 'Politely stop at gate, explain protocol, call host department, and never leave post.'
      },
      {
        question: '5. Can you use handheld metal detectors (HHMD) and basic CCTV monitoring?',
        practicalTip: 'Confirm familiarity with electronic frisking and basic monitor view.',
        sampleAnswerSummary: 'Confirm experience with bag scanning, handheld detectors, and barrier gate operation.'
      }
    ],
    hrCallingAdvice: 'Calling window: 9:00 AM - 6:00 PM. Height check (minimum 5ft 6in) is typically required.'
  },
  welder: {
    tradeKey: 'welder',
    tradeTitle: 'Welder / Fabricator',
    iconName: 'Flame',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'welder_cert',
        name: 'Welder Qualification Record (WQR) / ITI Certificate',
        description: 'Arc, MIG, or TIG certified welder qualification card.',
        isMandatory: true,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. What welding processes do you specialize in (ARC / MIG / TIG)?',
        practicalTip: 'Detail thickness of plates (e.g. 2mm to 16mm) and positional welding (1G, 2G, 3G, 4G).',
        sampleAnswerSummary: 'Specify your core process, electrode types (e.g. 7018, 6013), and shielding gas ratios.'
      },
      {
        question: '2. How do you prevent weld defects like porosity and undercut?',
        practicalTip: 'Mention slag cleaning, proper arc length, gas flow rate, and surface prep.',
        sampleAnswerSummary: 'Clean joint surface of rust/oil, maintain correct travel angle, and set optimal current.'
      },
      {
        question: '3. Can you read fabrication drawing symbols and dimensional tolerances?',
        practicalTip: 'Discuss tape measurements, bevel angles, and fit-up gap alignment.',
        sampleAnswerSummary: 'Yes, understand welding symbols, weld sizes, and fit-up tolerances to prevent distortion.'
      },
      {
        question: '4. What personal protective equipment (PPE) do you inspect prior to hot work?',
        practicalTip: 'Welding helmet/glass shade, leather gloves, apron, and safety goggles.',
        sampleAnswerSummary: 'Inspect welding shield dark glass shade, leather apron, spats, and ensure fire extinguisher nearby.'
      },
      {
        question: '5. Are you ready for an on-the-spot welding trial coupon test?',
        practicalTip: 'Express full confidence for the visual and bend test trial.',
        sampleAnswerSummary: 'Ready for practical test coupon in any position (flat, vertical, overhead).'
      }
    ],
    hrCallingAdvice: 'Workshops prefer calls from 10:00 AM - 2:00 PM on working days.'
  },
  warehouse: {
    tradeKey: 'warehouse',
    tradeTitle: 'Warehouse Associate / Picker & Packer',
    iconName: 'Package',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'smart_phone',
        name: 'Android Smartphone (Android 10+ with active internet)',
        description: 'Required for warehouse scanning apps and picking task allocations.',
        isMandatory: true,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. Have you used barcode / QR scanners or warehouse handheld terminals (HHT)?',
        practicalTip: 'Confirm familiarity with scanning item barcodes and bin location tags.',
        sampleAnswerSummary: 'Yes, experienced with scanning rack QR codes, picking lists, and order dispatch tags.'
      },
      {
        question: '2. What is your average daily picking or packing speed?',
        practicalTip: 'Mention standard units per hour (UPH), e.g. 40-70 items packed per hour.',
        sampleAnswerSummary: 'Maintain 50+ UPH with zero damage and accurate bubble-wrap cushioning.'
      },
      {
        question: '3. How do you verify order accuracy to avoid dispatching wrong products?',
        practicalTip: 'Check SKU code, size, color, and quantity before final tape sealing.',
        sampleAnswerSummary: 'Cross-verify invoice SKU with scanned barcode before box closure.'
      },
      {
        question: '4. Are you able to lift boxes up to 15-20 kg and handle continuous sorting?',
        practicalTip: 'Affirm physical fitness and following ergonomic lifting posture.',
        sampleAnswerSummary: 'Fit for active floor movement, pallet loading, and following safe lifting posture.'
      },
      {
        question: '5. Are you available for night shifts or festive peak sales overtime?',
        practicalTip: 'Festive peaks (Diwali, Big Billion Days) offer higher incentives.',
        sampleAnswerSummary: 'Fully open to overtime and rotational night rosters during peak sale seasons.'
      }
    ],
    hrCallingAdvice: 'HR hotline active: 9:30 AM - 5:30 PM. Instant joining is common.'
  },
  cook: {
    tradeKey: 'cook',
    tradeTitle: 'Cook / Chef / Kitchen Helper',
    iconName: 'Coffee',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'fssai_cert',
        name: 'Medical Fitness / Food Handler Certificate',
        description: 'Basic health check (typhoid/skin clearance) required by FSSAI hotel norms.',
        isMandatory: false,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. What cuisines and dishes can you prepare independently?',
        practicalTip: 'State specific specialties (North Indian, South Indian, Tandoor, Chinese).',
        sampleAnswerSummary: 'Specialize in fast gravy preparation, portion control, and bulk catering batches.'
      },
      {
        question: '2. How do you manage food hygiene and kitchen cleanliness during busy rush hours?',
        practicalTip: 'Mention hairnets, hand washing, FIFO (First-In, First-Out) refrigeration.',
        sampleAnswerSummary: 'Strictly follow sanitization, separate veg/non-veg chopping boards, and maintain clean counters.'
      },
      {
        question: '3. How do you handle high pressure when 20+ orders arrive together?',
        practicalTip: 'Show organizational readiness and prep (mise en place).',
        sampleAnswerSummary: 'Keep pre-chopped ingredients ready, prioritize orders by ticket time, and communicate with helpers.'
      },
      {
        question: '4. How do you reduce ingredient wastage and control portion sizes?',
        practicalTip: 'Standard ladle measurements and proper storage of leftover raw items.',
        sampleAnswerSummary: 'Use standard measurement spoons, store items in sealed food containers, and monitor inventory.'
      },
      {
        question: '5. Are you comfortable with split shifts (Lunch rush 11-3, Dinner 7-11)?',
        practicalTip: 'Acknowledge restaurant operational hours and accommodation needs.',
        sampleAnswerSummary: 'Accustomed to restaurant split shift schedules and weekend peak hours.'
      }
    ],
    hrCallingAdvice: 'Best calling time: 3:00 PM - 6:00 PM (between restaurant lunch and dinner rush).'
  },
  tailor: {
    tradeKey: 'tailor',
    tradeTitle: 'Tailor / Garment Machine Operator',
    iconName: 'Scissors',
    documents: [
      ...BASE_MANDATORY_DOCUMENTS,
      {
        id: 'sample_work',
        name: 'Sample of finished work or past unit slip',
        description: 'Demonstrating stitch precision and line speed.',
        isMandatory: false,
        category: 'skill'
      }
    ],
    questions: [
      {
        question: '1. What industrial sewing machines can you operate (Single Needle / Overlock / Flatlock)?',
        practicalTip: 'Specify SNLS, 4-thread overlock, or feed-off-the-arm machines.',
        sampleAnswerSummary: 'Proficient in SNLS lockstitch and 5-thread overlock with high speed and needle control.'
      },
      {
        question: '2. What is your typical piece-rate or hourly garment output?',
        practicalTip: 'State collar attachment, sleeve setting, or hem completion speed.',
        sampleAnswerSummary: 'Comfortable with standard industrial SAM targets with minimal rework or thread breakage.'
      },
      {
        question: '3. How do you ensure consistent stitch margin and avoid puckering?',
        practicalTip: 'Proper thread tension adjustment, matching needle size to fabric type.',
        sampleAnswerSummary: 'Check bobbin tension, set stitch density (SPI), and align fabric grain before stitching.'
      },
      {
        question: '4. Have you worked with stretch fabrics (knits/lycra) or heavy denims?',
        practicalTip: 'Clarify your specialty in woven vs knit garments.',
        sampleAnswerSummary: 'Experienced in handling both stretch jersey knits and heavy twill fabric.'
      },
      {
        question: '5. Can you perform basic machine maintenance (oiling, needle changing)?',
        practicalTip: 'Emphasize machine care and self-troubleshooting of thread tension.',
        sampleAnswerSummary: 'Perform daily machine oiling, lint cleaning, and change bent needles immediately.'
      }
    ],
    hrCallingAdvice: 'Factory HR contacts open from 9:00 AM - 1:00 PM.'
  },
  general: {
    tradeKey: 'general',
    tradeTitle: 'Frontline Associate / General Helper',
    iconName: 'Briefcase',
    documents: BASE_MANDATORY_DOCUMENTS,
    questions: [
      {
        question: '1. Why are you interested in this job role?',
        practicalTip: 'Mention desire for steady income, skill learning, and long-term stability.',
        sampleAnswerSummary: 'Looking for stable employment, eager to work hard, learn the trade, and follow company discipline.'
      },
      {
        question: '2. Are you ready to join immediately if selected?',
        practicalTip: 'Immediate joining is the #1 selection criteria for frontline helpers.',
        sampleAnswerSummary: 'All documents are ready; can join duty immediately from tomorrow morning.'
      },
      {
        question: '3. How will you commute to the worksite every day?',
        practicalTip: 'Mention bus route, train, or personal bicycle/two-wheeler.',
        sampleAnswerSummary: 'Live nearby (within 30-45 mins) and have reliable daily transport to reach on time.'
      },
      {
        question: '4. Can you work in rotating shifts or handle physical loading tasks?',
        practicalTip: 'Affirm your physical energy and willingness to help across departments.',
        sampleAnswerSummary: 'Energetic, physically fit, and ready to assist supervisors with any task assigned.'
      },
      {
        question: '5. What will you do if you need to take leave in an emergency?',
        practicalTip: 'Never vanish without informing; always call the supervisor in advance.',
        sampleAnswerSummary: 'Inform the team leader or supervisor at least 1 day prior, or early morning via phone.'
      }
    ],
    hrCallingAdvice: 'HR desks are open Monday to Saturday, 10:00 AM - 5:00 PM.'
  }
};

/**
 * Resolves the closest trade interview guide based on job title or category.
 */
export function getTradeInterviewGuide(jobTitleOrTrade?: string): TradeInterviewGuide {
  if (!jobTitleOrTrade) return TRADE_INTERVIEW_GUIDES.general;

  const lower = jobTitleOrTrade.toLowerCase();

  if (lower.includes('driver') || lower.includes('delivery') || lower.includes('rider') || lower.includes('courier') || lower.includes('auto') || lower.includes('cab')) {
    return TRADE_INTERVIEW_GUIDES.driver;
  }
  if (lower.includes('electr') || lower.includes('wireman') || lower.includes('technician') || lower.includes('cable') || lower.includes('appliance')) {
    return TRADE_INTERVIEW_GUIDES.electrician;
  }
  if (lower.includes('guard') || lower.includes('security') || lower.includes('watchman') || lower.includes('bouncer') || lower.includes('cctv')) {
    return TRADE_INTERVIEW_GUIDES.security;
  }
  if (lower.includes('weld') || lower.includes('fabricat') || lower.includes('fitter') || lower.includes('lathe') || lower.includes('machinist')) {
    return TRADE_INTERVIEW_GUIDES.welder;
  }
  if (lower.includes('cook') || lower.includes('chef') || lower.includes('kitchen') || lower.includes('hotel') || lower.includes('restaurant') || lower.includes('food')) {
    return TRADE_INTERVIEW_GUIDES.cook;
  }
  if (lower.includes('tailor') || lower.includes('stitch') || lower.includes('garment') || lower.includes('textile') || lower.includes('fashion') || lower.includes('sewing')) {
    return TRADE_INTERVIEW_GUIDES.tailor;
  }
  if (lower.includes('warehouse') || lower.includes('picker') || lower.includes('packer') || lower.includes('loader') || lower.includes('logistics') || lower.includes('sorting')) {
    return TRADE_INTERVIEW_GUIDES.warehouse;
  }

  return TRADE_INTERVIEW_GUIDES.general;
}

