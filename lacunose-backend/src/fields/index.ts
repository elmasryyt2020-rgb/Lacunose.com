/**
 * Field adapters — per-field metadata that drives the ingest, retrieval, and
 * gap-analysis pipeline.
 *
 * Each adapter owns:
 *  - `sources`: ordered list of ingest sources to query
 *  - `frame`: the structured 4-slot frame (e.g. PICO for medicine)
 *  - `gapTaxonomy`: which gap categories make sense in this field
 *  - `promptHints.system`: a system-prompt snippet describing "what a novel
 *    gap looks like in this field"
 *  - `studyDesignVocab`: field-specific methodology terms fed to the reduce
 *    phase's suggested_method output
 *
 * Call `getFieldAdapter(id)` everywhere — falls back to `generic` for unknown
 * ids so the pipeline can always run.
 */
import type {
  FieldAdapter,
  FieldFrame,
  FieldId,
  GapCategory,
  PaperSource,
} from '@lacunose/types';
import { GAP_CATEGORIES } from '@lacunose/types';

// ---------------------------------------------------------------------------
// Taxonomy helpers
// ---------------------------------------------------------------------------

/** All 8 gap categories (medicine, biology, clinical-adjacent). */
const TAXONOMY_FULL: GapCategory[] = [...GAP_CATEGORIES];

/** Drop population-only (e.g. math, physics, chemistry, art, philosophy). */
const TAXONOMY_NO_POPULATION: GapCategory[] = GAP_CATEGORIES.filter(
  (c) => c !== 'population',
);

/** Drop population AND geographic (pure-abstract fields). */
const TAXONOMY_ABSTRACT: GapCategory[] = GAP_CATEGORIES.filter(
  (c) => c !== 'population' && c !== 'geographic',
);

// ---------------------------------------------------------------------------
// Frame constructor
// ---------------------------------------------------------------------------

function makeFrame(
  id: FieldId | string,
  label: string,
  rows: Array<{ key: string; label: string; placeholder: string; example: string }>,
  colors: Array<'sky' | 'mint' | 'lavender' | 'butter' | 'peach' | 'rose' | 'sage'>,
): FieldFrame {
  return {
    id,
    label,
    rows: rows.map((r, i) => ({
      key: r.key,
      label: r.label,
      color: colors[i % colors.length] ?? 'sky',
      placeholder: r.placeholder,
      example: r.example,
    })),
  };
}

const FRAME_COLORS_4: Array<'sky' | 'mint' | 'lavender' | 'butter' | 'peach' | 'rose' | 'sage'> = [
  'sky', 'mint', 'lavender', 'butter',
];

// ---------------------------------------------------------------------------
// Study design vocabularies
// ---------------------------------------------------------------------------

const DESIGN_BIOMED = [
  'RCT', 'randomized controlled trial', 'cohort study', 'case-control study',
  'cross-sectional study', 'case series', 'case report', 'systematic review',
  'meta-analysis', 'retrospective chart review', 'prospective observational',
  'registry analysis', 'pragmatic trial', 'cluster randomized trial',
  'n-of-1 trial', 'dose-escalation', 'phase I', 'phase II', 'phase III',
  'post-marketing surveillance', 'Mendelian randomization',
];

const DESIGN_BIOLOGY = [
  'knockout', 'knock-in', 'CRISPR screen', 'RNA-seq', 'single-cell RNA-seq',
  'proteomics', 'metabolomics', 'ChIP-seq', 'ATAC-seq', 'bioinformatics pipeline',
  'in vitro', 'in vivo', 'ex vivo', 'organoid', 'model organism comparison',
  'phylogenetic analysis', 'field study', 'longitudinal sampling',
];

const DESIGN_CHEM = [
  'synthesis', 'total synthesis', 'asymmetric catalysis', 'flow chemistry',
  'screening library', 'DFT calculation', 'crystal structure determination',
  'NMR characterization', 'mass spectrometry assay', 'kinetic isotope effect',
  'computational mechanism study', 'high-throughput screen', 'reaction optimization',
  'scale-up study', 'green-chemistry metric',
];

const DESIGN_PHYSICS = [
  'analytical derivation', 'numerical simulation', 'Monte Carlo', 'ab initio',
  'lattice calculation', 'table-top experiment', 'accelerator run',
  'observational campaign', 'replication', 'precision measurement',
  'anomaly search', 'perturbative expansion', 'effective field theory',
];

const DESIGN_MATERIALS = [
  'sol-gel synthesis', 'chemical vapor deposition', 'thin-film deposition',
  'XRD characterization', 'SEM imaging', 'TEM imaging', 'nanoindentation',
  'tensile testing', 'fatigue testing', 'corrosion testing', 'thermal cycling',
  'DFT', 'phase-field simulation', 'additive manufacturing study',
];

const DESIGN_MATH = [
  'analytic proof', 'constructive proof', 'probabilistic method', 'combinatorial argument',
  'simulation check', 'counterexample search', 'computer-assisted proof',
  'algebraic characterization', 'generalization', 'asymptotic analysis',
  'numerical experiment', 'formalization in a proof assistant',
];

const DESIGN_CS = [
  'benchmark', 'ablation study', 'grid search', 'hyperparameter sweep',
  'human evaluation', 'A/B test', 'user study', 'replication study',
  'fine-tuning', 'zero-shot eval', 'few-shot eval', 'scaling law',
  'dataset release', 'leaderboard submission', 'failure-mode analysis',
  'robustness test', 'adversarial eval', 'interpretability probe',
];

const DESIGN_ENG = [
  'prototype', 'finite-element simulation', 'hardware-in-the-loop test',
  'field trial', 'pilot deployment', 'bench test', 'digital-twin simulation',
  'ANOVA experiment', 'design-of-experiments', 'reliability test',
  'load test', 'control-law tuning',
];

const DESIGN_PSYCH = [
  'behavioural experiment', 'lab study', 'online study', 'longitudinal panel',
  'cross-cultural replication', 'fMRI', 'EEG', 'eye-tracking',
  'questionnaire', 'ecological momentary assessment', 'diary study',
  'registered report', 'pre-registered experiment', 'meta-analysis',
];

const DESIGN_ECON = [
  'RCT', 'difference-in-differences', 'regression discontinuity',
  'instrumental variables', 'synthetic control', 'event study',
  'structural model', 'panel regression', 'field experiment',
  'lab experiment', 'natural experiment', 'meta-analysis',
];

const DESIGN_POLSCI = [
  'survey experiment', 'conjoint analysis', 'field experiment',
  'difference-in-differences', 'case study', 'comparative case analysis',
  'process tracing', 'content analysis', 'computational text analysis',
  'network analysis', 'panel regression',
];

const DESIGN_SOC = [
  'ethnography', 'participant observation', 'in-depth interview',
  'focus group', 'survey', 'mixed methods', 'comparative case study',
  'network analysis', 'historical analysis', 'computational text analysis',
  'content analysis',
];

const DESIGN_GEOL = [
  'field mapping', 'stratigraphic section', 'isotope dating',
  'geochronology', 'geochemical analysis', 'seismic survey',
  'core sampling', 'remote sensing', 'petrographic analysis',
  'thermodynamic modelling',
];

const DESIGN_GEOG = [
  'remote sensing', 'GIS analysis', 'spatial regression',
  'household survey', 'field survey', 'ethnography', 'land-use modelling',
  'agent-based model', 'time-series of satellite imagery',
];

const DESIGN_HIST = [
  'archival research', 'primary-source analysis', 'comparative historical analysis',
  'digital humanities computation', 'prosopography', 'close reading',
  'oral history', 'quantitative history',
];

const DESIGN_PHIL = [
  'conceptual analysis', 'thought experiment', 'logical reconstruction',
  'experimental philosophy survey', 'history-of-ideas analysis',
  'comparative argument', 'case-based ethics analysis',
];

const DESIGN_ART = [
  'close visual analysis', 'formal analysis', 'iconographic study',
  'archival research', 'comparative period study', 'provenance study',
  'conservation science analysis', 'reception history',
];

const DESIGN_BUS = [
  'case study', 'multi-case comparison', 'survey of firms',
  'event study', 'field experiment', 'A/B test', 'structural equation model',
  'grounded theory study', 'archival panel analysis', 'difference-in-differences',
];

const DESIGN_ENVSCI = [
  'field monitoring', 'long-term ecological study', 'remote sensing',
  'mesocosm experiment', 'field experiment', 'isotope tracing',
  'process-based model', 'earth-system model', 'before-after-control-impact',
  'space-for-time substitution',
];

const DESIGN_GENERIC = [
  'case study', 'survey', 'experiment', 'observational study',
  'systematic review', 'meta-analysis', 'mixed methods', 'simulation',
  'comparative analysis', 'quasi-experiment',
];

// ---------------------------------------------------------------------------
// System-prompt snippets (150-250 tokens each)
// ---------------------------------------------------------------------------

const SYS_MEDICINE = `You are operating in the medicine / clinical research domain. Frame every reasoning step through Population, Intervention, Comparator, and Outcome. A "novel gap" here is most often: (a) a well-characterized intervention that has never been evaluated in a specific population (pediatric, pregnant, geriatric, comorbid), (b) a comparator that is clinically relevant but absent from trials (e.g. head-to-head vs placebo-controlled), (c) a patient-important outcome (mortality, quality-of-life, hard endpoints) that prior work under-reports in favor of surrogate markers, (d) a contradiction between RCT effect sizes and real-world-evidence effect sizes, or (e) a dosing / duration / de-escalation question. Prefer gaps that could be addressed with a retrospective chart review, pragmatic trial, or registry analysis within 12-18 months. Respect equipoise; never recommend unethical studies. Evidence of external validity limitations, underpowered subgroups, and absent long-term follow-up are all first-class gap signals.`;

const SYS_BIOLOGY = `You are operating in the biology domain. Frame every reasoning step through System, Organism, Method, and Measurement. A "novel gap" here is most often: (a) a mechanism characterized in one model organism but never tested in another, (b) a pathway whose causal direction is inferred only from correlational omics data, (c) a phenomenon whose dynamics have never been measured at single-cell or spatial resolution, (d) a conserved feature whose function is unknown in non-model species, or (e) an in-vitro effect that has not been replicated in vivo. Prefer gaps that suggest a concrete comparative experiment, a conditional knockout, or a perturb-seq readout feasible in a small lab. Weight replicability, appropriate controls, and sample size; treat "observed once in one strain" as a strong limitation signal.`;

const SYS_CHEMISTRY = `You are operating in the chemistry domain. Frame every reasoning step through Substrate, Reagent, Condition, and Measurement. A "novel gap" is most often: (a) a reaction class with narrow substrate scope (e.g. works for aryl but not alkyl), (b) a catalyst system whose enantioselectivity / chemoselectivity has been demonstrated on a few substrates but whose mechanism remains unclear, (c) a condition-space (solvent, temperature, pressure) that is under-explored, (d) a characterization gap where product identity relies on a single technique, or (e) a scale-up / reproducibility gap between bench and flow chemistry. Prefer gaps that can be addressed with a focused substrate scope extension, a DFT study, or a kinetic measurement. Call out when green-chemistry metrics (E-factor, PMI) are never reported.`;

const SYS_PHYSICS = `You are operating in the physics domain. Frame every reasoning step through System, Method, Condition, and Observable. A "novel gap" is most often: (a) an effect predicted analytically but never measured, (b) a measurement made once at a specific energy / temperature / field strength and never replicated or extended, (c) a regime where two theoretical frameworks diverge but experimental discrimination is absent, (d) a numerical result that has never been corroborated by an independent simulation code, or (e) a systematic uncertainty that prior work acknowledges but does not quantify. Prefer gaps that suggest a precision measurement, a table-top experiment, or a simulation study. Treat single-instrument results and unquantified systematics as strong limitation signals.`;

const SYS_MATERIALS = `You are operating in the materials science domain. Frame every reasoning step through Composition, Processing, Structure, and Property. A "novel gap" is most often: (a) a composition whose property has only been measured after one specific processing route, (b) a structure-property relationship inferred from ideal-lattice simulations but untested in real samples with defects, (c) a mechanical / thermal / electrical property measured at room temperature only, (d) an additive-manufacturing feasibility study without fatigue / corrosion follow-up, or (e) a multi-property trade-off never mapped (e.g. toughness vs hardness). Prefer gaps that propose a processing-parameter sweep, a microstructural characterization, or a failure-mode study. Flag when only one sample has been tested.`;

const SYS_MATH = `You are operating in the mathematics domain. Frame every reasoning step through Problem, Approach, Technique, and Domain. A "novel gap" is most often: (a) a theorem proved under restrictive assumptions whose removal is open, (b) a conjecture supported by numerical evidence but no proof, (c) a construction that works in one category / dimension / characteristic but not others, (d) a bound whose tightness is unproven, or (e) a link between two subfields that is observed but not made rigorous. Prefer gaps that point to a specific generalization, a counterexample search, or a computer-assisted verification. Do not speculate about "intuitive" connections without textual support; cite only what the evidence explicitly says.`;

const SYS_CS = `You are operating in the computer science / ML domain. Frame every reasoning step through Task, Dataset, Method, and Metric. A "novel gap" is most often: (a) a method evaluated on a single benchmark whose generalization is claimed but untested, (b) an ablation that was skipped or only partial, (c) a metric whose statistical significance was never computed, (d) a failure-mode observed but never analyzed, or (e) a baseline that is outdated or cherry-picked. Prefer gaps that point to a specific additional benchmark, an ablation study, a human evaluation, or a replication with a different seed. Call out when compute / parameter-count is not reported, when test sets leak into training, or when only a single run is reported.`;

const SYS_ENG = `You are operating in the engineering domain. Frame every reasoning step through System, Constraint, Method, and Performance. A "novel gap" is most often: (a) a design validated in simulation but never prototyped, (b) a prototype tested under ideal conditions with no failure-mode or robustness study, (c) a performance metric reported without uncertainty bounds or at a single operating point, (d) a constraint (thermal, vibration, cost) whose effect is assumed rather than measured, or (e) a lifecycle / reliability question that is deferred. Prefer gaps that suggest a bench test, a field trial, a finite-element comparison, or a design-of-experiments sweep. Flag when safety-critical claims rely on unvalidated models.`;

const SYS_PSYCH = `You are operating in the psychology domain. Frame every reasoning step through Sample, Phenomenon, Design, and Evaluation. A "novel gap" is most often: (a) an effect established in WEIRD undergraduate samples but never tested cross-culturally, (b) a laboratory finding that has never been replicated in the field, (c) an effect size with wide confidence interval that has never been pre-registered, (d) a construct measured with a single self-report scale, or (e) a mechanism proposed but never directly manipulated. Prefer gaps that suggest a registered report, a pre-registered replication, or a field-setting extension. Explicitly flag replication-crisis concerns: small samples, optional stopping, selective reporting, and measurement-invariance issues.`;

const SYS_ECON = `You are operating in the economics domain. Frame every reasoning step through Treatment, Population, Outcome, and Identification. A "novel gap" is most often: (a) a treatment effect identified in one setting (country, firm, market) whose external validity is asserted but unmeasured, (b) a correlation whose causal interpretation rests on a single identification strategy, (c) a long-run outcome that prior work cannot observe, (d) a heterogeneity the average-treatment-effect ignores, or (e) a mechanism that a reduced-form result is silent about. Prefer gaps that suggest a difference-in-differences, RDD, synthetic-control, or RCT replication in a new setting. Flag pre-trend violations, weak instruments, and unaddressed general-equilibrium effects.`;

const SYS_POLSCI = `You are operating in the political science domain. Frame every reasoning step through Context, Actor, Policy, and Effect. A "novel gap" is most often: (a) a theory developed around one country's politics whose generality is asserted but untested, (b) a policy effect estimated for one period but not across regime changes, (c) a causal claim resting on observational cross-country comparison with uncontrolled confounders, (d) an elite / mass-opinion discrepancy never directly measured, or (e) a mechanism (persuasion vs selection) that prior work cannot disentangle. Prefer gaps that suggest a survey experiment, a field experiment, a regression-discontinuity at a threshold, or a comparative case study. Weight endogeneity of treatment assignment heavily.`;

const SYS_SOC = `You are operating in the sociology domain. Frame every reasoning step through Setting, Community, Method, and Observation. A "novel gap" is most often: (a) a pattern established at one scale (neighborhood) whose cross-scale robustness is unknown, (b) a mechanism theorized but never ethnographically traced, (c) a quantitative trend whose qualitative interpretation rests on few interviews, (d) an intersection (race × class × gender) that prior work collapses, or (e) a historical-contingency claim that lacks comparative cases. Prefer gaps that suggest a comparative ethnography, a mixed-methods extension, or a computational-text analysis of a neglected corpus. Flag selection into the sample and reflexivity of the observer.`;

const SYS_GEOL = `You are operating in the geology / earth-science domain. Frame every reasoning step through Location, Time, Process, and Evidence. A "novel gap" is most often: (a) a process documented at one locality whose spatial extent is unknown, (b) a geochronologic date resting on a single method, (c) a sedimentary / tectonic model supported by one core or seismic line, (d) a process-rate inferred from one time slice with no long-term constraint, or (e) a correlation between widely separated sections that has never been isotopically tested. Prefer gaps that suggest additional field mapping, a new dating method, or a comparative basin study. Flag when dating uncertainties are quoted without systematic error bars.`;

const SYS_GEOG = `You are operating in the geography domain. Frame every reasoning step through Region, Phenomenon, Scale, and Evidence. A "novel gap" is most often: (a) a spatial pattern mapped at coarse resolution whose fine-scale heterogeneity is unknown, (b) a human-environment coupling asserted but measured only once, (c) a remote-sensing classification never ground-truthed, (d) a comparative cross-region question that is treated as regional, or (e) a time-series trend without anomaly attribution. Prefer gaps that suggest a GIS analysis, a targeted fieldwork extension, a cross-regional comparison, or a downscaled remote-sensing study. Flag when scale-of-analysis does not match scale-of-claim.`;

const SYS_HIST = `You are operating in the history domain. Frame every reasoning step through Period, Actors, Region, and Theme. A "novel gap" is most often: (a) an argument resting on one archive whose other-side documents have never been consulted, (b) a narrative about a period that ignores non-elite actors, (c) a regional comparison asserted but never grounded in primary sources on both sides, (d) a chronological framing (causes / consequences) that prior work accepts uncritically, or (e) a thematic claim (e.g. modernization, secularization) that has not been tested against contrary cases. Prefer gaps that suggest a specific archival visit, a prosopographical study, a comparative analysis, or a digital-humanities quantification. Do not claim certainty the sources cannot support.`;

const SYS_PHIL = `You are operating in the philosophy domain. Frame every reasoning step through Position, Argument, Framework, and Objection. A "novel gap" is most often: (a) a position whose standard objection has not been directly addressed, (b) an argument whose premise rests on empirical claims that moved since it was written, (c) a framework developed in one sub-field whose transfer to another is asserted but not argued, (d) a thought experiment whose intuition-pumping assumptions are hidden, or (e) a taxonomy that omits a plausible alternative. Prefer gaps that suggest a specific counter-argument, an experimental-philosophy survey, or a conceptual-analysis refinement. Evidence here is exegetical — cite texts, not data.`;

const SYS_ART = `You are operating in the art / art history domain. Frame every reasoning step through Period, Work, Medium, and Context. A "novel gap" is most often: (a) a work whose attribution / provenance rests on one piece of evidence, (b) a movement whose canon excludes a documented but understudied contributor, (c) a medium-specific question (conservation, material analysis) that prior art-historical work treats as given, (d) a reception-history gap across regions or periods, or (e) an iconographic reading that ignores plausible alternatives. Prefer gaps that suggest archival research, conservation-science analysis, or a comparative period study. Respect that many claims are interpretive; mark speculation as speculation.`;

const SYS_BUS = `You are operating in the business / management domain. Frame every reasoning step through Market, Firm, Practice, and Outcome. A "novel gap" is most often: (a) a management practice whose effect has been studied in large firms but not SMEs (or vice versa), (b) a strategy validated in one industry whose transfer to another is asserted, (c) a causal claim built on survey data with common-method variance risk, (d) a cross-cultural difference never directly tested, or (e) a performance-outcome relationship never decomposed into mediators. Prefer gaps that suggest a multi-case comparison, a field experiment, or an archival panel analysis. Flag survivorship bias, self-report bias, and endogeneity of firm choices.`;

const SYS_ENVSCI = `You are operating in the environmental science domain. Frame every reasoning step through System, Location, Method, and Evidence. A "novel gap" is most often: (a) an ecosystem-function measurement made at one site for one season, (b) a pollutant whose fate is modelled but rarely measured, (c) a climate-impact projection resting on a single model ensemble, (d) a conservation intervention evaluated without a control, or (e) a human-environment coupling where socio-economic variables are absent. Prefer gaps that suggest long-term monitoring, a before-after-control-impact design, a mesocosm experiment, or a multi-model ensemble comparison. Flag when spatial / temporal scale of evidence does not match claim.`;

const SYS_GENERIC = `You are operating in a general research-analysis mode without a field-specific frame. Frame every reasoning step through Subject, Approach, Context, and Outcome. A "novel gap" is most often: (a) a claim asserted in one context whose generality is untested, (b) a method whose alternatives are not compared, (c) an outcome measured partially, (d) a contradiction between two lines of evidence that prior work does not reconcile, or (e) a methodology that does not address an obvious threat to validity. Prefer gaps that are specific, feasible within 12-18 months, and grounded in explicit evidence from the provided sections. When the field is ambiguous, default to external-validity and replicability concerns as gap signals.`;

// ---------------------------------------------------------------------------
// Source lists
// ---------------------------------------------------------------------------

const SOURCES: Record<FieldId, PaperSource[]> = {
  'medicine':              ['pubmed', 'europepmc', 'openalex', 's2', 'crossref'],
  'biology':               ['europepmc', 'openalex', 's2'],
  'chemistry':             ['openalex', 's2', 'crossref'],
  'physics':               ['arxiv', 'openalex', 's2'],
  'materials':             ['openalex', 's2'],
  'mathematics':           ['arxiv', 'openalex', 's2'],
  'computer-science':      ['arxiv', 'openalex', 's2', 'crossref'],
  'engineering':           ['openalex', 's2'],
  'psychology':            ['pubmed', 'openalex', 's2'],
  'economics':             ['openalex', 's2', 'crossref'],
  'political-science':     ['openalex', 's2'],
  'sociology':             ['openalex', 's2'],
  'geology':               ['openalex', 's2'],
  'geography':             ['openalex', 's2'],
  'history':               ['openalex', 'crossref', 's2'],
  'philosophy':            ['openalex', 'crossref', 's2'],
  'art':                   ['openalex', 'crossref', 's2'],
  'business':              ['openalex', 's2', 'crossref'],
  'environmental-science': ['openalex', 'europepmc', 's2'],
  'generic':               ['openalex', 's2', 'crossref'],
};

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

function adapter(
  id: FieldId,
  label: string,
  rows: Array<{ key: string; label: string; placeholder: string; example: string }>,
  taxonomy: GapCategory[],
  systemHint: string,
  vocab: string[],
): FieldAdapter {
  return {
    id,
    label,
    sources: SOURCES[id],
    frame: makeFrame(id, label, rows, FRAME_COLORS_4),
    gapTaxonomy: taxonomy,
    promptHints: {
      system: systemHint,
      fewShot: [],
    },
    studyDesignVocab: vocab,
  };
}

// ---------------------------------------------------------------------------
// The 20 adapters
// ---------------------------------------------------------------------------

const ADAPTERS: Record<string, FieldAdapter> = {
  'medicine': adapter(
    'medicine', 'Medicine',
    [
      { key: 'P', label: 'Population',   placeholder: 'e.g. adults with type 2 diabetes', example: 'adults 40-75 with T2DM, HbA1c 7-9' },
      { key: 'I', label: 'Intervention', placeholder: 'e.g. GLP-1 agonist',              example: 'semaglutide 1 mg/week' },
      { key: 'C', label: 'Comparator',   placeholder: 'e.g. metformin',                  example: 'metformin 1500 mg/day' },
      { key: 'O', label: 'Outcome',      placeholder: 'e.g. HbA1c at 12 months',         example: 'HbA1c change, weight loss, MACE' },
    ],
    TAXONOMY_FULL, SYS_MEDICINE, DESIGN_BIOMED,
  ),
  'biology': adapter(
    'biology', 'Biology',
    [
      { key: 'S', label: 'System',      placeholder: 'e.g. mitochondrial stress response', example: 'mitochondrial UPR in muscle' },
      { key: 'O', label: 'Organism',    placeholder: 'e.g. C. elegans',                     example: 'C. elegans N2' },
      { key: 'M', label: 'Method',      placeholder: 'e.g. RNAi screen',                    example: 'RNAi + fluorescent reporter' },
      { key: 'X', label: 'Measurement', placeholder: 'e.g. lifespan extension',             example: 'median lifespan, reporter intensity' },
    ],
    TAXONOMY_FULL, SYS_BIOLOGY, DESIGN_BIOLOGY,
  ),
  'chemistry': adapter(
    'chemistry', 'Chemistry',
    [
      { key: 'S', label: 'Substrate',   placeholder: 'e.g. aryl halide',         example: '4-bromoanisole' },
      { key: 'R', label: 'Reagent',     placeholder: 'e.g. Pd catalyst',         example: 'Pd(OAc)2 / XPhos' },
      { key: 'C', label: 'Condition',   placeholder: 'e.g. 80 C in toluene',     example: '80 C, 12 h, dioxane' },
      { key: 'X', label: 'Measurement', placeholder: 'e.g. isolated yield, ee',  example: 'isolated yield, 1H NMR, HPLC ee' },
    ],
    TAXONOMY_NO_POPULATION, SYS_CHEMISTRY, DESIGN_CHEM,
  ),
  'physics': adapter(
    'physics', 'Physics',
    [
      { key: 'S', label: 'System',     placeholder: 'e.g. ultracold Rb gas',    example: '87Rb BEC in optical lattice' },
      { key: 'M', label: 'Method',     placeholder: 'e.g. time-of-flight',      example: 'absorption imaging after TOF' },
      { key: 'C', label: 'Condition',  placeholder: 'e.g. 10 nK, 100 G',        example: '10 nK, B = 100 G' },
      { key: 'O', label: 'Observable', placeholder: 'e.g. momentum distribution', example: 'momentum distribution n(k)' },
    ],
    TAXONOMY_ABSTRACT, SYS_PHYSICS, DESIGN_PHYSICS,
  ),
  'materials': adapter(
    'materials', 'Materials Science',
    [
      { key: 'C', label: 'Composition', placeholder: 'e.g. Ti-6Al-4V',           example: 'Ti-6Al-4V with 0.5% Nb' },
      { key: 'P', label: 'Processing',  placeholder: 'e.g. selective laser melting', example: 'SLM, 200 W, 1000 mm/s' },
      { key: 'S', label: 'Structure',   placeholder: 'e.g. alpha+beta microstructure', example: 'columnar prior-beta grains' },
      { key: 'X', label: 'Property',    placeholder: 'e.g. tensile strength',    example: 'UTS, elongation, fatigue limit' },
    ],
    TAXONOMY_FULL, SYS_MATERIALS, DESIGN_MATERIALS,
  ),
  'mathematics': adapter(
    'mathematics', 'Mathematics',
    [
      { key: 'P', label: 'Problem',   placeholder: 'e.g. bound on graph chromatic number', example: 'upper bound on chi(G) for planar graphs' },
      { key: 'A', label: 'Approach',  placeholder: 'e.g. probabilistic method',            example: 'Lovasz local lemma' },
      { key: 'T', label: 'Technique', placeholder: 'e.g. entropy compression',             example: 'entropy compression argument' },
      { key: 'D', label: 'Domain',    placeholder: 'e.g. extremal combinatorics',          example: 'extremal / Ramsey-type combinatorics' },
    ],
    TAXONOMY_ABSTRACT, SYS_MATH, DESIGN_MATH,
  ),
  'computer-science': adapter(
    'computer-science', 'Computer Science',
    [
      { key: 'T', label: 'Task',    placeholder: 'e.g. long-context QA',           example: 'long-document multi-hop QA' },
      { key: 'D', label: 'Dataset', placeholder: 'e.g. HotpotQA',                  example: 'HotpotQA, NQ, TriviaQA' },
      { key: 'M', label: 'Method',  placeholder: 'e.g. retrieval-augmented LLM',   example: 'RAG with dense retriever + 70B LLM' },
      { key: 'X', label: 'Metric',  placeholder: 'e.g. exact-match, F1',           example: 'exact-match, F1, human-rated faithfulness' },
    ],
    TAXONOMY_FULL, SYS_CS, DESIGN_CS,
  ),
  'engineering': adapter(
    'engineering', 'Engineering',
    [
      { key: 'S', label: 'System',      placeholder: 'e.g. quadrotor UAV',            example: 'sub-250 g quadrotor' },
      { key: 'C', label: 'Constraint',  placeholder: 'e.g. payload < 100 g',          example: 'payload 50 g, 15 min flight time' },
      { key: 'M', label: 'Method',      placeholder: 'e.g. MPC controller',           example: 'MPC with learned dynamics model' },
      { key: 'X', label: 'Performance', placeholder: 'e.g. tracking error',           example: 'tracking RMSE, recovery from gust' },
    ],
    TAXONOMY_FULL, SYS_ENG, DESIGN_ENG,
  ),
  'psychology': adapter(
    'psychology', 'Psychology',
    [
      { key: 'S', label: 'Sample',     placeholder: 'e.g. US undergraduates',   example: 'N=120, US undergrads, age 18-22' },
      { key: 'P', label: 'Phenomenon', placeholder: 'e.g. framing effect',       example: 'gain/loss framing on risk choice' },
      { key: 'D', label: 'Design',     placeholder: 'e.g. within-subjects',      example: '2x2 within-subjects, pre-registered' },
      { key: 'E', label: 'Evaluation', placeholder: 'e.g. self-report + RT',     example: 'self-report, response time, pupillometry' },
    ],
    TAXONOMY_FULL, SYS_PSYCH, DESIGN_PSYCH,
  ),
  'economics': adapter(
    'economics', 'Economics',
    [
      { key: 'T', label: 'Treatment',      placeholder: 'e.g. minimum wage increase', example: '+$1/hr minimum wage in 3 states' },
      { key: 'P', label: 'Population',     placeholder: 'e.g. retail workers',        example: 'retail workers age 18-25' },
      { key: 'O', label: 'Outcome',        placeholder: 'e.g. employment',            example: 'employment, hours, earnings' },
      { key: 'I', label: 'Identification', placeholder: 'e.g. diff-in-diff',           example: 'border-discontinuity DiD' },
    ],
    TAXONOMY_FULL, SYS_ECON, DESIGN_ECON,
  ),
  'political-science': adapter(
    'political-science', 'Political Science',
    [
      { key: 'C', label: 'Context', placeholder: 'e.g. post-2010 US politics', example: 'US post-2010 federal politics' },
      { key: 'A', label: 'Actor',   placeholder: 'e.g. voters / legislators',  example: 'primary voters, co-partisans' },
      { key: 'P', label: 'Policy',  placeholder: 'e.g. voter ID law',          example: 'voter-ID legislation' },
      { key: 'E', label: 'Effect',  placeholder: 'e.g. turnout change',        example: 'turnout, party affiliation shift' },
    ],
    TAXONOMY_FULL, SYS_POLSCI, DESIGN_POLSCI,
  ),
  'sociology': adapter(
    'sociology', 'Sociology',
    [
      { key: 'S', label: 'Setting',     placeholder: 'e.g. urban neighborhood',     example: 'low-income urban neighborhood' },
      { key: 'C', label: 'Community',   placeholder: 'e.g. recent immigrants',       example: 'first-generation immigrants' },
      { key: 'M', label: 'Method',      placeholder: 'e.g. 18-month ethnography',    example: '18-month participant observation' },
      { key: 'O', label: 'Observation', placeholder: 'e.g. network formation',       example: 'social-tie formation, reciprocity' },
    ],
    TAXONOMY_FULL, SYS_SOC, DESIGN_SOC,
  ),
  'geology': adapter(
    'geology', 'Geology',
    [
      { key: 'L', label: 'Location', placeholder: 'e.g. Permian Basin',        example: 'Permian Basin, Wolfcamp' },
      { key: 'T', label: 'Time',     placeholder: 'e.g. Late Permian',          example: 'Wolfcampian (Early Permian)' },
      { key: 'P', label: 'Process',  placeholder: 'e.g. diagenesis',            example: 'carbonate cementation' },
      { key: 'E', label: 'Evidence', placeholder: 'e.g. stable isotopes',       example: 'delta-13C, delta-18O, trace metals' },
    ],
    TAXONOMY_FULL, SYS_GEOL, DESIGN_GEOL,
  ),
  'geography': adapter(
    'geography', 'Geography',
    [
      { key: 'R', label: 'Region',      placeholder: 'e.g. Sahel',             example: 'West African Sahel' },
      { key: 'P', label: 'Phenomenon',  placeholder: 'e.g. desertification',    example: 'vegetation loss + soil degradation' },
      { key: 'S', label: 'Scale',       placeholder: 'e.g. village to region',  example: 'village to 100-km region' },
      { key: 'E', label: 'Evidence',    placeholder: 'e.g. MODIS + surveys',    example: 'MODIS NDVI + household surveys' },
    ],
    TAXONOMY_FULL, SYS_GEOG, DESIGN_GEOG,
  ),
  'history': adapter(
    'history', 'History',
    [
      { key: 'P', label: 'Period',  placeholder: 'e.g. 1848-1871',           example: 'European 1848-1871' },
      { key: 'A', label: 'Actors',  placeholder: 'e.g. working-class press', example: 'artisan-class newspaper editors' },
      { key: 'R', label: 'Region',  placeholder: 'e.g. Central Europe',      example: 'Austria-Hungary' },
      { key: 'T', label: 'Theme',   placeholder: 'e.g. nationalism',          example: 'linguistic nationalism' },
    ],
    TAXONOMY_NO_POPULATION, SYS_HIST, DESIGN_HIST,
  ),
  'philosophy': adapter(
    'philosophy', 'Philosophy',
    [
      { key: 'P', label: 'Position',  placeholder: 'e.g. moral realism',       example: 'naturalistic moral realism' },
      { key: 'A', label: 'Argument',  placeholder: 'e.g. companions-in-guilt', example: 'companions-in-guilt (math + ethics)' },
      { key: 'F', label: 'Framework', placeholder: 'e.g. Cornell realism',      example: 'Cornell realism / moral-twin-earth' },
      { key: 'O', label: 'Objection', placeholder: 'e.g. reference-magnetism', example: 'reference-magnetism worry' },
    ],
    TAXONOMY_ABSTRACT, SYS_PHIL, DESIGN_PHIL,
  ),
  'art': adapter(
    'art', 'Art & Art History',
    [
      { key: 'P', label: 'Period',  placeholder: 'e.g. early modern Venice', example: 'early 16th c. Venice' },
      { key: 'W', label: 'Work',    placeholder: 'e.g. Tempest (Giorgione)', example: 'Giorgione, La Tempesta' },
      { key: 'M', label: 'Medium',  placeholder: 'e.g. oil on canvas',        example: 'oil on canvas, 83 x 73 cm' },
      { key: 'C', label: 'Context', placeholder: 'e.g. patronage network',    example: 'Venier-family patronage' },
    ],
    TAXONOMY_ABSTRACT, SYS_ART, DESIGN_ART,
  ),
  'business': adapter(
    'business', 'Business & Management',
    [
      { key: 'M', label: 'Market',   placeholder: 'e.g. B2B SaaS US',           example: 'US B2B SaaS 50-500 employees' },
      { key: 'F', label: 'Firm',     placeholder: 'e.g. mid-stage startup',      example: 'Series B SaaS firm' },
      { key: 'P', label: 'Practice', placeholder: 'e.g. PLG motion',             example: 'product-led growth motion' },
      { key: 'O', label: 'Outcome',  placeholder: 'e.g. NRR, gross margin',      example: 'net-revenue retention, gross margin' },
    ],
    TAXONOMY_FULL, SYS_BUS, DESIGN_BUS,
  ),
  'environmental-science': adapter(
    'environmental-science', 'Environmental Science',
    [
      { key: 'S', label: 'System',   placeholder: 'e.g. coral reef',            example: 'Indo-Pacific shallow reef' },
      { key: 'L', label: 'Location', placeholder: 'e.g. Great Barrier Reef',    example: 'GBR central section' },
      { key: 'M', label: 'Method',   placeholder: 'e.g. transect survey',       example: 'belt transects + temperature loggers' },
      { key: 'E', label: 'Evidence', placeholder: 'e.g. bleaching index',       example: 'DHW + bleaching cover index' },
    ],
    TAXONOMY_FULL, SYS_ENVSCI, DESIGN_ENVSCI,
  ),
  'generic': adapter(
    'generic', 'General',
    [
      { key: 'S', label: 'Subject',  placeholder: 'What is being studied?',   example: 'the phenomenon of interest' },
      { key: 'A', label: 'Approach', placeholder: 'How is it being studied?', example: 'method or framework used' },
      { key: 'C', label: 'Context',  placeholder: 'Where / when?',             example: 'setting, scope, time period' },
      { key: 'O', label: 'Outcome',  placeholder: 'What is measured?',         example: 'dependent variable or result' },
    ],
    TAXONOMY_FULL, SYS_GENERIC, DESIGN_GENERIC,
  ),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a field id to its adapter.
 *
 * Unknown ids fall back to the `generic` adapter so the pipeline always has
 * a usable frame, prompt, and design vocabulary.
 */
export function getFieldAdapter(id: FieldId | string): FieldAdapter {
  const hit = ADAPTERS[id];
  if (hit) return hit;
  // reason: `generic` is always present; safe to assert
  return ADAPTERS['generic']!;
}

/**
 * List every field adapter. Ordered to match `FIELD_IDS`.
 */
export function listFieldAdapters(): FieldAdapter[] {
  return Object.values(ADAPTERS);
}
