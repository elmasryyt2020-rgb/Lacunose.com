/**
 * Field catalog — mirrors the 20 field ids in the backend's
 * `src/fields/index.ts`. Kept as a flat list here because the website doesn't
 * need the full adapter (system prompts, sources, etc.) — just the id, label,
 * and the 4 structured-frame slots for the optional inputs on /app.
 *
 * If the backend catalog changes, update this list too. These ids must match
 * the backend's FieldId union exactly, because the beta API forwards `field`
 * as-is to the ingest pipeline.
 */

export type FieldFrameRow = {
  key: string;
  label: string;
  placeholder: string;
};

export type FieldDef = {
  id: string;
  label: string;
  frame: FieldFrameRow[];
};

export const FIELDS: FieldDef[] = [
  {
    id: 'medicine', label: 'Medicine',
    frame: [
      { key: 'P', label: 'Population', placeholder: 'e.g. adults with type 2 diabetes' },
      { key: 'I', label: 'Intervention', placeholder: 'e.g. GLP-1 agonist' },
      { key: 'C', label: 'Comparator', placeholder: 'e.g. metformin' },
      { key: 'O', label: 'Outcome', placeholder: 'e.g. HbA1c at 12 months' },
    ],
  },
  {
    id: 'biology', label: 'Biology',
    frame: [
      { key: 'S', label: 'System', placeholder: 'e.g. mitochondrial stress response' },
      { key: 'O', label: 'Organism', placeholder: 'e.g. C. elegans' },
      { key: 'M', label: 'Method', placeholder: 'e.g. RNAi screen' },
      { key: 'X', label: 'Measurement', placeholder: 'e.g. lifespan extension' },
    ],
  },
  {
    id: 'chemistry', label: 'Chemistry',
    frame: [
      { key: 'S', label: 'Substrate', placeholder: 'e.g. aryl halide' },
      { key: 'R', label: 'Reagent', placeholder: 'e.g. Pd catalyst' },
      { key: 'C', label: 'Condition', placeholder: 'e.g. 80 °C in toluene' },
      { key: 'X', label: 'Measurement', placeholder: 'e.g. isolated yield, ee' },
    ],
  },
  {
    id: 'physics', label: 'Physics',
    frame: [
      { key: 'S', label: 'System', placeholder: 'e.g. ultracold Rb gas' },
      { key: 'M', label: 'Method', placeholder: 'e.g. time-of-flight' },
      { key: 'C', label: 'Condition', placeholder: 'e.g. 10 nK, 100 G' },
      { key: 'O', label: 'Observable', placeholder: 'e.g. momentum distribution' },
    ],
  },
  {
    id: 'computer-science', label: 'Computer Science',
    frame: [
      { key: 'T', label: 'Task', placeholder: 'e.g. long-context QA' },
      { key: 'D', label: 'Dataset', placeholder: 'e.g. HotpotQA' },
      { key: 'M', label: 'Method', placeholder: 'e.g. retrieval-augmented LLM' },
      { key: 'X', label: 'Metric', placeholder: 'e.g. exact-match, F1' },
    ],
  },
  {
    id: 'psychology', label: 'Psychology',
    frame: [
      { key: 'S', label: 'Sample', placeholder: 'e.g. US undergraduates' },
      { key: 'P', label: 'Phenomenon', placeholder: 'e.g. framing effect' },
      { key: 'D', label: 'Design', placeholder: 'e.g. within-subjects' },
      { key: 'E', label: 'Evaluation', placeholder: 'e.g. self-report + RT' },
    ],
  },
  {
    id: 'economics', label: 'Economics',
    frame: [
      { key: 'T', label: 'Treatment', placeholder: 'e.g. minimum wage increase' },
      { key: 'P', label: 'Population', placeholder: 'e.g. retail workers' },
      { key: 'O', label: 'Outcome', placeholder: 'e.g. employment' },
      { key: 'I', label: 'Identification', placeholder: 'e.g. diff-in-diff' },
    ],
  },
  {
    id: 'environmental-science', label: 'Environmental Science',
    frame: [
      { key: 'S', label: 'System', placeholder: 'e.g. coral reef' },
      { key: 'L', label: 'Location', placeholder: 'e.g. Great Barrier Reef' },
      { key: 'M', label: 'Method', placeholder: 'e.g. transect survey' },
      { key: 'E', label: 'Evidence', placeholder: 'e.g. bleaching index' },
    ],
  },
  // The remaining 12 ids are accepted by the backend but not prominent on /app.
  // Kept here in the "More fields" dropdown for completeness.
  { id: 'materials', label: 'Materials Science', frame: [{ key: 'C', label: 'Composition', placeholder: '' }, { key: 'P', label: 'Processing', placeholder: '' }, { key: 'S', label: 'Structure', placeholder: '' }, { key: 'X', label: 'Property', placeholder: '' }] },
  { id: 'mathematics', label: 'Mathematics', frame: [{ key: 'P', label: 'Problem', placeholder: '' }, { key: 'A', label: 'Approach', placeholder: '' }, { key: 'T', label: 'Technique', placeholder: '' }, { key: 'D', label: 'Domain', placeholder: '' }] },
  { id: 'engineering', label: 'Engineering', frame: [{ key: 'S', label: 'System', placeholder: '' }, { key: 'C', label: 'Constraint', placeholder: '' }, { key: 'M', label: 'Method', placeholder: '' }, { key: 'X', label: 'Performance', placeholder: '' }] },
  { id: 'political-science', label: 'Political Science', frame: [{ key: 'C', label: 'Context', placeholder: '' }, { key: 'A', label: 'Actor', placeholder: '' }, { key: 'P', label: 'Policy', placeholder: '' }, { key: 'E', label: 'Effect', placeholder: '' }] },
  { id: 'sociology', label: 'Sociology', frame: [{ key: 'S', label: 'Setting', placeholder: '' }, { key: 'C', label: 'Community', placeholder: '' }, { key: 'M', label: 'Method', placeholder: '' }, { key: 'O', label: 'Observation', placeholder: '' }] },
  { id: 'geology', label: 'Geology', frame: [{ key: 'L', label: 'Location', placeholder: '' }, { key: 'T', label: 'Time', placeholder: '' }, { key: 'P', label: 'Process', placeholder: '' }, { key: 'E', label: 'Evidence', placeholder: '' }] },
  { id: 'geography', label: 'Geography', frame: [{ key: 'R', label: 'Region', placeholder: '' }, { key: 'P', label: 'Phenomenon', placeholder: '' }, { key: 'S', label: 'Scale', placeholder: '' }, { key: 'E', label: 'Evidence', placeholder: '' }] },
  { id: 'history', label: 'History', frame: [{ key: 'P', label: 'Period', placeholder: '' }, { key: 'A', label: 'Actors', placeholder: '' }, { key: 'R', label: 'Region', placeholder: '' }, { key: 'T', label: 'Theme', placeholder: '' }] },
  { id: 'philosophy', label: 'Philosophy', frame: [{ key: 'P', label: 'Position', placeholder: '' }, { key: 'A', label: 'Argument', placeholder: '' }, { key: 'F', label: 'Framework', placeholder: '' }, { key: 'O', label: 'Objection', placeholder: '' }] },
  { id: 'art', label: 'Art & Art History', frame: [{ key: 'P', label: 'Period', placeholder: '' }, { key: 'W', label: 'Work', placeholder: '' }, { key: 'M', label: 'Medium', placeholder: '' }, { key: 'C', label: 'Context', placeholder: '' }] },
  { id: 'business', label: 'Business & Management', frame: [{ key: 'M', label: 'Market', placeholder: '' }, { key: 'F', label: 'Firm', placeholder: '' }, { key: 'P', label: 'Practice', placeholder: '' }, { key: 'O', label: 'Outcome', placeholder: '' }] },
  { id: 'generic', label: 'General', frame: [{ key: 'S', label: 'Subject', placeholder: '' }, { key: 'A', label: 'Approach', placeholder: '' }, { key: 'C', label: 'Context', placeholder: '' }, { key: 'O', label: 'Outcome', placeholder: '' }] },
];

export const QUICK_FIELD_IDS = [
  'medicine', 'biology', 'chemistry', 'physics',
  'computer-science', 'psychology', 'economics', 'environmental-science',
] as const;

export function getField(id: string): FieldDef {
  return FIELDS.find((f) => f.id === id) ?? FIELDS[FIELDS.length - 1]!;
}
