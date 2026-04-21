export type FieldFrameRow = {
  key: string;                  // 'P' | 'I' | …
  label: string;                // 'Population'
  color: keyof typeof CATEGORY_COLORS; // 'rose'|'lavender'|'mint'|'sky'
  placeholder: string;          // shown in empty input
  example: string;              // populated as default when field is picked with a topic suggestion
};
export type FieldFrame = {
  id: string;                   // 'medicine', 'computer-science', 'generic'
  label: string;                // 'Medicine'
  domainOpenalexId?: string;    // 'C71924100' for Medicine, etc.
  rows: FieldFrameRow[];        // exactly 4 rows
};

export const FRAMES: Record<string, FieldFrame> = {
  medicine:             { id:'medicine', label:'Medicine', rows:[
    {key:'P', label:'Population', color:'rose', placeholder:'Patients, age range, condition', example:'Children 6–17 with BMI ≥ 95th percentile'},
    {key:'I', label:'Intervention', color:'lavender', placeholder:'Drug, procedure, programme', example:'Semaglutide 2.4mg weekly'},
    {key:'C', label:'Comparison', color:'mint', placeholder:'Control or alternative', example:'Lifestyle only'},
    {key:'O', label:'Outcome', color:'sky', placeholder:'Measured endpoint', example:'Cardiometabolic events at 24 mo'},
  ]},
  biology:              { id:'biology', label:'Biology', rows:[
    {key:'S', label:'System', color:'rose', placeholder:'Organ, tissue, cell type', example:'Murine hippocampus'},
    {key:'O', label:'Organism', color:'lavender', placeholder:'Species or model', example:'C57BL/6J mice'},
    {key:'M', label:'Method', color:'mint', placeholder:'Technique', example:'Single-cell RNA-seq'},
    {key:'E', label:'Measurement', color:'sky', placeholder:'Observable', example:'Dendritic spine density'},
  ]},
  chemistry:            { id:'chemistry', label:'Chemistry', rows:[
    {key:'S', label:'Substrate', color:'rose', placeholder:'Starting material', example:'Aryl halides'},
    {key:'R', label:'Reagent', color:'lavender', placeholder:'Catalyst or reagent', example:'Pd(PPh3)4'},
    {key:'C', label:'Condition', color:'mint', placeholder:'Solvent, temperature, time', example:'Toluene, 80°C, 12 h'},
    {key:'M', label:'Measurement', color:'sky', placeholder:'Observable', example:'Isolated yield'},
  ]},
  physics:              { id:'physics', label:'Physics', rows:[
    {key:'S', label:'System', color:'rose', placeholder:'Physical system', example:'2D electron gas at heterointerface'},
    {key:'M', label:'Method', color:'lavender', placeholder:'Experimental or theoretical', example:'Magneto-transport, DFT'},
    {key:'C', label:'Condition', color:'mint', placeholder:'Regime', example:'B > 10 T, T < 300 mK'},
    {key:'O', label:'Observable', color:'sky', placeholder:'Measured quantity', example:'Longitudinal resistivity'},
  ]},
  materials:            { id:'materials', label:'Materials Science', rows:[
    {key:'C', label:'Composition', color:'rose', placeholder:'Material formula', example:'Ti-6Al-4V alloy'},
    {key:'P', label:'Processing', color:'lavender', placeholder:'Synthesis / fabrication', example:'Selective laser melting'},
    {key:'S', label:'Structure', color:'mint', placeholder:'Microstructure', example:'Acicular α′ martensite'},
    {key:'Y', label:'Property', color:'sky', placeholder:'Performance metric', example:'Fatigue life at σ=500 MPa'},
  ]},
  mathematics:          { id:'mathematics', label:'Mathematics', rows:[
    {key:'P', label:'Problem', color:'rose', placeholder:'Theorem / question', example:'Regularity of minimizers in nonconvex functionals'},
    {key:'A', label:'Approach', color:'lavender', placeholder:'Strategy', example:'Γ-convergence + monotonicity formula'},
    {key:'T', label:'Technique', color:'mint', placeholder:'Tools', example:'Partial regularity theory'},
    {key:'D', label:'Domain', color:'sky', placeholder:'Space / setting', example:'BV(Ω; ℝᵏ), Ω ⊂ ℝⁿ'},
  ]},
  'computer-science':   { id:'computer-science', label:'Computer Science', rows:[
    {key:'T', label:'Task', color:'rose', placeholder:'Problem to solve', example:'Long-context language modelling'},
    {key:'D', label:'Dataset', color:'lavender', placeholder:'Benchmark', example:'SCROLLS / LongBench'},
    {key:'M', label:'Method', color:'mint', placeholder:'Architecture / algorithm', example:'Linear-attention + chunked recurrence'},
    {key:'E', label:'Metric', color:'sky', placeholder:'Evaluation', example:'Retrieval acc. @ 128k tokens'},
  ]},
  engineering:          { id:'engineering', label:'Engineering', rows:[
    {key:'S', label:'System', color:'rose', placeholder:'Engineered artefact', example:'Grid-tied battery storage'},
    {key:'C', label:'Constraint', color:'lavender', placeholder:'Limit', example:'Cycle life ≥ 6000, cost ≤ $100/kWh'},
    {key:'M', label:'Method', color:'mint', placeholder:'Design / control strategy', example:'MPC with thermal coupling'},
    {key:'P', label:'Performance', color:'sky', placeholder:'Target metric', example:'Round-trip efficiency ≥ 92%'},
  ]},
  psychology:           { id:'psychology', label:'Psychology', rows:[
    {key:'S', label:'Sample', color:'rose', placeholder:'Participants', example:'US undergraduates, 18–22'},
    {key:'P', label:'Phenomenon', color:'lavender', placeholder:'Construct', example:'Cognitive dissonance'},
    {key:'D', label:'Design', color:'mint', placeholder:'Study design', example:'2×2 factorial between-subjects'},
    {key:'E', label:'Evaluation', color:'sky', placeholder:'Measure', example:'Attitude change (Likert-7)'},
  ]},
  economics:            { id:'economics', label:'Economics', rows:[
    {key:'T', label:'Treatment', color:'rose', placeholder:'Shock / policy', example:'UBI pilot'},
    {key:'P', label:'Population', color:'lavender', placeholder:'Units', example:'Low-income households, Kenya'},
    {key:'O', label:'Outcome', color:'mint', placeholder:'Variable', example:'Labour supply (hours/week)'},
    {key:'I', label:'Identification', color:'sky', placeholder:'Strategy', example:'Randomized controlled trial'},
  ]},
  'political-science':  { id:'political-science', label:'Political Science', rows:[
    {key:'C', label:'Context', color:'rose', placeholder:'Political setting', example:'Post-conflict democracies'},
    {key:'A', label:'Actor', color:'lavender', placeholder:'Agent', example:'Ethnic political parties'},
    {key:'P', label:'Policy', color:'mint', placeholder:'Instrument', example:'Power-sharing agreements'},
    {key:'E', label:'Effect', color:'sky', placeholder:'Outcome', example:'Cabinet stability over 10y'},
  ]},
  sociology:            { id:'sociology', label:'Sociology', rows:[
    {key:'S', label:'Setting', color:'rose', placeholder:'Field', example:'Urban gig labour platforms'},
    {key:'C', label:'Community', color:'lavender', placeholder:'Population', example:'Drivers in Lagos'},
    {key:'M', label:'Method', color:'mint', placeholder:'Approach', example:'Mixed-method ethnography'},
    {key:'O', label:'Observation', color:'sky', placeholder:'Focus', example:'Algorithmic wage discrimination'},
  ]},
  geology:              { id:'geology', label:'Geology', rows:[
    {key:'L', label:'Location', color:'rose', placeholder:'Geographic area', example:'Deccan Traps'},
    {key:'T', label:'Time', color:'lavender', placeholder:'Period', example:'66 Ma (K-Pg boundary)'},
    {key:'P', label:'Process', color:'mint', placeholder:'Mechanism', example:'Flood basalt emplacement'},
    {key:'E', label:'Evidence', color:'sky', placeholder:'Data', example:'U-Pb zircon geochronology'},
  ]},
  geography:            { id:'geography', label:'Geography', rows:[
    {key:'R', label:'Region', color:'rose', placeholder:'Place', example:'Sahel'},
    {key:'P', label:'Phenomenon', color:'lavender', placeholder:'What is studied', example:'Climate-induced migration'},
    {key:'S', label:'Scale', color:'mint', placeholder:'Temporal / spatial', example:'Decadal, district-level'},
    {key:'E', label:'Evidence', color:'sky', placeholder:'Data', example:'Census + remote sensing'},
  ]},
  history:              { id:'history', label:'History', rows:[
    {key:'P', label:'Period', color:'rose', placeholder:'Era', example:'Interwar 1919–1939'},
    {key:'A', label:'Actors', color:'lavender', placeholder:'Agents', example:'Labour movements'},
    {key:'R', label:'Region', color:'mint', placeholder:'Geography', example:'Weimar Germany'},
    {key:'T', label:'Theme', color:'sky', placeholder:'Topic', example:'Political radicalisation'},
  ]},
  philosophy:           { id:'philosophy', label:'Philosophy', rows:[
    {key:'P', label:'Position', color:'rose', placeholder:'Thesis', example:'Moral error theory'},
    {key:'A', label:'Argument', color:'lavender', placeholder:'Line of reasoning', example:'Companions-in-guilt'},
    {key:'F', label:'Framework', color:'mint', placeholder:'Tradition', example:'Analytic metaethics'},
    {key:'O', label:'Objection', color:'sky', placeholder:'Challenge', example:'Moral disagreement from bias'},
  ]},
  art:                  { id:'art', label:'Art & Art History', rows:[
    {key:'P', label:'Period', color:'rose', placeholder:'Era / movement', example:'Early Renaissance'},
    {key:'W', label:'Work', color:'lavender', placeholder:'Artefact / artist', example:'Fra Angelico altarpieces'},
    {key:'M', label:'Medium', color:'mint', placeholder:'Material / technique', example:'Tempera on panel'},
    {key:'C', label:'Context', color:'sky', placeholder:'Cultural setting', example:'Dominican patronage'},
  ]},
  business:             { id:'business', label:'Business & Management', rows:[
    {key:'M', label:'Market', color:'rose', placeholder:'Industry', example:'B2B SaaS'},
    {key:'F', label:'Firm', color:'lavender', placeholder:'Organisation', example:'Early-stage startups'},
    {key:'P', label:'Practice', color:'mint', placeholder:'Strategy / routine', example:'Product-led growth'},
    {key:'O', label:'Outcome', color:'sky', placeholder:'Performance', example:'NRR, expansion ARR'},
  ]},
  'environmental-science':{ id:'environmental-science', label:'Environmental Science', rows:[
    {key:'S', label:'System', color:'rose', placeholder:'Ecosystem', example:'Coral reef'},
    {key:'L', label:'Location', color:'lavender', placeholder:'Site', example:'Great Barrier Reef'},
    {key:'M', label:'Method', color:'mint', placeholder:'Measurement', example:'Satellite SST + in-situ bleaching surveys'},
    {key:'E', label:'Evidence', color:'sky', placeholder:'Data', example:'Heat-stress DHW vs bleaching extent'},
  ]},
  generic:              { id:'generic', label:'Other field', rows:[
    {key:'S', label:'Subject', color:'rose', placeholder:'Topic or focus', example:''},
    {key:'A', label:'Approach', color:'lavender', placeholder:'Method or lens', example:''},
    {key:'C', label:'Context', color:'mint', placeholder:'Setting or scope', example:''},
    {key:'O', label:'Outcome', color:'sky', placeholder:'What is observed', example:''},
  ]},
};

export const QUICK_FIELDS: (keyof typeof FRAMES)[] = [
  'medicine','computer-science','economics','psychology',
  'biology','physics','chemistry','engineering'
];

export const FIELD_CLUSTERS = [
  { id: 'life', label: 'Life Sciences',      fields: ['medicine','biology','psychology','environmental-science'] },
  { id: 'phys', label: 'Physical Sciences',  fields: ['physics','chemistry','materials','mathematics','geology','geography'] },
  { id: 'soc',  label: 'Social Sciences',    fields: ['economics','political-science','sociology','business'] },
  { id: 'hum',  label: 'Humanities',         fields: ['history','philosophy','art'] },
];

const CATEGORY_COLORS = { rose:1, lavender:1, mint:1, sky:1, peach:1, butter:1, sage:1 } as const;
