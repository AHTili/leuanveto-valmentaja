// wizard-core.js — Wizard 3.2 UI core (Track B Vaihe 1B)
// LeVe AI v4.37+ — step-navigaatio + progress + state-management + validation
//
// Käyttää 1A:n moduuleita (wizard-schema.js, wizard-data.js) rajapintoina.
// EI muokkaa 1A:n koodia eikä koske pää-sovellukseen (engine.js, data.js,
// index.html, sw.js). Wizard on erillinen sivu (wizard/wizard.html) jonka
// pää-UI-integraatio tehdään Vaiheessa 2.
//
// Suunnitteluvalinnat:
//
// 1) State-malli: shallow Proxy ulkokerroksessa. config-objekti vaihdetaan
//    kokonaan kun answers muuttuu (immutable update -tyyli) jotta yksitasoinen
//    Proxy-set havaitsee muutoksen. Tämä on selvempi malli kuin syvä proxy
//    ja riittää 1B:n state-management-vaatimuksiin (debounced save IDB:hen).
//
// 2) Input-komponentit: 1B toteuttaa toimivat "number", "radio" ja
//    "checkboxes" -tyypit. Composite/injury-list/string-list jäävät
//    placeholdereiksi, jotka Vaihe 1C täydentää oikeilla komponenteilla.
//    Tämä on tietoinen rajaus — runko valmis ennen kysymys-komponentteja.
//
// 3) Rerender-strategia: yksittäisen kysymyksen visuaalinen tila (radion
//    valittu vaihtoehto, checkboxin tickaus) päivittyy paikallisesti
//    kysymyssolmun sisällä — koko step ei renderöidy uudelleen joka näppäimellä,
//    jotta number-inputin keskitys ei katoa. Nav-palkki + virhe-yhteenveto
//    rerenderöityvät kevyemmin (vain DOM-tasolla) input/change-eventeistä.

import {
  WIZARD_STAGES,
  WIZARD_QUESTIONS,
  SCHEMA_INVARIANTS,
  getQuestionsForStage,
} from "./wizard-schema.js";
import {
  createEmptyWizardConfig,
  saveWizardConfig,
  getActiveWizardConfig,
  setActiveWizardConfig,
  validateWizardConfig,
} from "./wizard-data.js";

// ── State store (Proxy-pohjainen reactive) ────────────────────────

export function createWizardState(initialConfig) {
  const listeners = new Set();
  const internal = {
    config: initialConfig,
    currentStepIndex: 0,
  };
  const proxy = new Proxy(internal, {
    set(target, key, value) {
      target[key] = value;
      for (const fn of listeners) {
        try { fn(key, value); } catch (e) { console.error("[wizard-core] listener error:", e); }
      }
      return true;
    },
  });
  return {
    state: proxy,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getAnswer(qid) { return proxy.config && proxy.config.answers ? proxy.config.answers[qid] : undefined; },
    setAnswer(qid, value) {
      const answers = { ...(proxy.config.answers || {}), [qid]: value };
      proxy.config = { ...proxy.config, answers };
    },
  };
}

// ── Navigation ────────────────────────────────────────────────────

export function nextStep(state) {
  const max = WIZARD_STAGES.length - 1;
  if (state.currentStepIndex < max) {
    state.currentStepIndex = state.currentStepIndex + 1;
    return true;
  }
  return false;
}

export function prevStep(state) {
  if (state.currentStepIndex > 0) {
    state.currentStepIndex = state.currentStepIndex - 1;
    return true;
  }
  return false;
}

export function goToStep(state, idx) {
  const max = WIZARD_STAGES.length - 1;
  if (idx < 0 || idx > max) return false;
  state.currentStepIndex = idx;
  return true;
}

// ── Validation per step ───────────────────────────────────────────

const PLACEHOLDER_TYPES = new Set(["composite", "injury-list", "string-list"]);

export function validateCurrentStep(state) {
  const stage = WIZARD_STAGES[state.currentStepIndex];
  const stageQuestions = getQuestionsForStage(stage.id);
  const stageQids = new Set(stageQuestions.map(q => q.id));
  const allErrors = validateWizardConfig(state.config).errors;
  const errors = allErrors.filter(e => stageQids.has(e.questionId));
  return { isValid: errors.length === 0, errors, stageQuestions };
}

export function validateAllSteps(state) {
  return validateWizardConfig(state.config);
}

// ── Kysymys-rendering (input-komponentit) ─────────────────────────

function renderQuestionNumber(q, value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "wiz-input--number";
  input.id = `wiz-input-${q.id}`;
  input.name = q.id;
  if (q.range) {
    if (q.range.min !== undefined) input.min = String(q.range.min);
    if (q.range.max !== undefined) input.max = String(q.range.max);
  }
  if (q.step !== undefined) input.step = String(q.step);
  input.inputMode = q.step ? "decimal" : "numeric";
  if (value !== undefined && value !== null && value !== "") input.value = String(value);
  input.addEventListener("input", () => {
    const raw = input.value;
    const num = raw === "" ? undefined : Number(raw);
    onChange(num);
  });
  return input;
}

function renderQuestionRadio(q, value, onChange) {
  const group = document.createElement("div");
  group.className = "wiz-radio-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-labelledby", `wiz-label-${q.id}`);
  let selected = value;
  for (const opt of q.options) {
    const label = document.createElement("label");
    label.className = "wiz-radio-option" + (selected === opt.value ? " is-selected" : "");
    label.dataset.optionValue = opt.value;
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `wiz-radio-${q.id}`;
    radio.value = opt.value;
    radio.checked = selected === opt.value;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selected = opt.value;
      const options = group.querySelectorAll(".wiz-radio-option");
      options.forEach(el => {
        el.classList.toggle("is-selected", el.dataset.optionValue === selected);
      });
      onChange(opt.value);
    });
    const text = document.createElement("span");
    text.className = "wiz-radio-label";
    text.textContent = opt.labelFi;
    label.appendChild(radio);
    label.appendChild(text);
    group.appendChild(label);
  }
  return group;
}

function renderQuestionCheckboxes(q, value, onChange) {
  const group = document.createElement("div");
  group.className = "wiz-checkbox-group";
  const selected = new Set(Array.isArray(value) ? value : []);
  for (const opt of q.options) {
    const label = document.createElement("label");
    label.className = "wiz-checkbox-option" + (selected.has(opt.value) ? " is-selected" : "");
    label.dataset.optionValue = opt.value;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.name = `wiz-checkbox-${q.id}`;
    cb.value = opt.value;
    cb.checked = selected.has(opt.value);
    cb.addEventListener("change", () => {
      if (cb.checked) selected.add(opt.value); else selected.delete(opt.value);
      label.classList.toggle("is-selected", cb.checked);
      onChange(Array.from(selected));
    });
    const text = document.createElement("span");
    text.className = "wiz-checkbox-label";
    text.textContent = opt.labelFi;
    label.appendChild(cb);
    label.appendChild(text);
    group.appendChild(label);
  }
  return group;
}

function renderQuestionPlaceholder(q) {
  const box = document.createElement("div");
  box.className = "wiz-placeholder-box";
  const strong = document.createElement("strong");
  strong.textContent = `Tyyppi: ${q.type}`;
  const desc = document.createElement("div");
  desc.textContent = "Tämä komponentti täydennetään Vaihe 1C:ssä. 1B-vaiheessa kysymys ei vielä tallenna vastausta.";
  box.appendChild(strong);
  box.appendChild(desc);
  return box;
}

export function renderQuestion(q, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "wiz-question";
  if (PLACEHOLDER_TYPES.has(q.type)) wrap.className += " wiz-question--placeholder";
  wrap.dataset.questionId = q.id;

  const label = document.createElement("label");
  label.className = "wiz-question-label";
  label.id = `wiz-label-${q.id}`;
  label.setAttribute("for", `wiz-input-${q.id}`);
  label.appendChild(document.createTextNode(q.labelFi));
  if (q.required) {
    const req = document.createElement("span");
    req.className = "wiz-required";
    req.textContent = " *";
    req.setAttribute("aria-label", "pakollinen");
    label.appendChild(req);
  } else {
    const opt = document.createElement("span");
    opt.className = "wiz-optional";
    opt.textContent = "(valinnainen)";
    label.appendChild(opt);
  }
  wrap.appendChild(label);

  if (q.helperFi) {
    const helper = document.createElement("div");
    helper.className = "wiz-helper";
    helper.textContent = q.helperFi;
    wrap.appendChild(helper);
  }

  let inputEl;
  switch (q.type) {
    case "number":     inputEl = renderQuestionNumber(q, value, onChange); break;
    case "radio":      inputEl = renderQuestionRadio(q, value, onChange); break;
    case "checkboxes": inputEl = renderQuestionCheckboxes(q, value, onChange); break;
    default:           inputEl = renderQuestionPlaceholder(q);
  }
  wrap.appendChild(inputEl);

  const errSlot = document.createElement("div");
  errSlot.className = "wiz-error";
  errSlot.id = `wiz-error-${q.id}`;
  errSlot.style.display = "none";
  wrap.appendChild(errSlot);

  return wrap;
}

// ── Step + progress + nav + error-summary rendering ───────────────

export function renderStep(stateStore, container) {
  const state = stateStore.state;
  const stage = WIZARD_STAGES[state.currentStepIndex];
  if (!stage) return;

  const step = document.createElement("section");
  step.className = "wiz-step";
  step.setAttribute("aria-label", `Vaihe ${stage.order} / ${WIZARD_STAGES.length}: ${stage.titleFi}`);

  const h2 = document.createElement("h2");
  h2.textContent = `${stage.order}/${WIZARD_STAGES.length} — ${stage.titleFi}`;
  step.appendChild(h2);

  const questions = getQuestionsForStage(stage.id);
  for (const q of questions) {
    const currentValue = stateStore.getAnswer(q.id);
    const node = renderQuestion(q, currentValue, (newValue) => {
      stateStore.setAnswer(q.id, newValue);
    });
    step.appendChild(node);
  }

  container.innerHTML = "";
  container.appendChild(step);
}

export function renderProgressBar(stateStore, container) {
  const state = stateStore.state;
  const ul = document.createElement("ul");
  ul.className = "wiz-progress";
  ul.setAttribute("role", "list");
  ul.setAttribute("aria-label", "Edistymispalkki");
  for (let i = 0; i < WIZARD_STAGES.length; i++) {
    const li = document.createElement("li");
    li.className = "wiz-progress-seg";
    if (i < state.currentStepIndex) li.classList.add("is-done");
    if (i === state.currentStepIndex) li.classList.add("is-current");
    li.setAttribute("aria-label", `Vaihe ${i + 1}: ${WIZARD_STAGES[i].titleFi}`);
    ul.appendChild(li);
  }
  const label = document.createElement("div");
  label.className = "wiz-progress-label";
  label.textContent = `Vaihe ${state.currentStepIndex + 1} / ${WIZARD_STAGES.length}`;

  container.innerHTML = "";
  container.appendChild(ul);
  container.appendChild(label);
}

export function renderNav(stateStore, container, controller) {
  const state = stateStore.state;
  const isLast = state.currentStepIndex === WIZARD_STAGES.length - 1;
  const isFirst = state.currentStepIndex === 0;
  const validation = validateCurrentStep(state);

  const wrap = document.createElement("nav");
  wrap.className = "wiz-nav";
  const inner = document.createElement("div");
  inner.className = "wiz-nav-inner";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "wiz-btn";
  prevBtn.id = "wiz-btn-prev";
  prevBtn.textContent = "← Taakse";
  prevBtn.disabled = isFirst;
  prevBtn.addEventListener("click", () => controller.prev());

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "wiz-btn wiz-btn--primary";
  nextBtn.id = "wiz-btn-next";
  nextBtn.textContent = isLast ? "Valmis ✓" : "Seuraava →";
  nextBtn.disabled = !validation.isValid;
  nextBtn.addEventListener("click", () => controller.next());

  inner.appendChild(prevBtn);
  inner.appendChild(nextBtn);
  wrap.appendChild(inner);

  container.innerHTML = "";
  container.appendChild(wrap);
}

function renderErrorSummary(state, container) {
  container.innerHTML = "";
  const v = validateCurrentStep(state);
  if (v.isValid) return;
  const div = document.createElement("div");
  div.className = "wiz-step-error-summary";
  const title = document.createElement("strong");
  title.textContent = "Tarkista pakolliset kentät:";
  div.appendChild(title);
  const ul = document.createElement("ul");
  for (const err of v.errors) {
    const q = WIZARD_QUESTIONS.find(qq => qq.id === err.questionId);
    const li = document.createElement("li");
    li.textContent = `${q ? q.labelFi : err.questionId}: ${err.reason}`;
    ul.appendChild(li);
  }
  div.appendChild(ul);
  container.appendChild(div);
}

export function renderDoneView(stateStore, container, controller) {
  const state = stateStore.state;
  const cfg = state.config;
  const answersCount = Object.keys(cfg.answers || {}).length;
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "wiz-done";

  const h2 = document.createElement("h2");
  h2.textContent = "Wizard valmis ✓";
  wrap.appendChild(h2);

  const p1 = document.createElement("p");
  p1.textContent = `Tallensit ${answersCount} vastausta. Konfiguraatio tallennettu paikallisesti.`;
  wrap.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent = "Vaihe 2 integroi wizardin pää-sovellukseen ja luo räätälöidyn ohjelman vastausten pohjalta.";
  wrap.appendChild(p2);

  const summary = document.createElement("div");
  summary.className = "wiz-done-summary";
  summary.style.whiteSpace = "pre-line";
  summary.textContent =
    `wizardId: ${cfg.wizardId}\n` +
    `schemaVersion: ${cfg.schemaVersion}\n` +
    `completedAt: ${cfg.completedAtISO || "—"}`;
  wrap.appendChild(summary);

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className = "wiz-btn";
  restartBtn.style.marginTop = "16px";
  restartBtn.textContent = "Aloita uudelleen";
  restartBtn.addEventListener("click", () => controller.restart());
  wrap.appendChild(restartBtn);

  container.appendChild(wrap);
}

// ── Controller (yhdistää kaiken) ──────────────────────────────────

const DEBOUNCE_MS = 500;

function debounce(fn, ms) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn.apply(null, args); }, ms);
  };
}

export class WizardController {
  constructor(opts) {
    this.container = opts.container;
    this.stateStore = null;
    this.progressEl = null;
    this.stepEl = null;
    this.errorSummaryEl = null;
    this.navEl = null;
    this.isDone = false;
    this._unsubscribeState = null;
    this._debouncedSave = debounce(() => this._save(), DEBOUNCE_MS);
    this._onStepInteraction = this._onStepInteraction.bind(this);
  }

  async init() {
    let cfg = await getActiveWizardConfig();
    if (!cfg) {
      cfg = createEmptyWizardConfig();
      await saveWizardConfig(cfg);
      await setActiveWizardConfig(cfg.wizardId);
    }
    const startInDoneView = !!cfg.completedAtISO;

    this.stateStore = createWizardState(cfg);
    // Palauta käyttäjä viimeksi tallennetulle vaiheelle (hyväksymiskriteeri 6:
    // reload palauttaa state:n). lastStepIndex on uusi kenttä — 1A:n createEmpty
    // ei aseta sitä, joten fallback on 0. 1A:n saveWizardConfig hyväksyy
    // ylimääräiset kentät (löyhä schema), joten 1A:han ei tarvita muutoksia.
    if (
      typeof cfg.lastStepIndex === "number" &&
      cfg.lastStepIndex >= 0 &&
      cfg.lastStepIndex < WIZARD_STAGES.length
    ) {
      this.stateStore.state.currentStepIndex = cfg.lastStepIndex;
    }
    this._unsubscribeState = this.stateStore.subscribe((key) => {
      if (key === "config") this._debouncedSave();
    });

    this._mountSkeleton();

    if (startInDoneView) {
      this.isDone = true;
      this.progressEl.style.display = "none";
      this.navEl.style.display = "none";
      renderDoneView(this.stateStore, this.stepEl, this);
    } else {
      this._renderAll();
    }
  }

  _persistStepIndex() {
    // Päivittää config.lastStepIndex ennen tallennusta. Ilman tätä reload
    // palauttaa vastaukset mutta ei vaihetta.
    const idx = this.stateStore.state.currentStepIndex;
    this.stateStore.state.config = { ...this.stateStore.state.config, lastStepIndex: idx };
  }

  _mountSkeleton() {
    this.container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "wiz-header";
    const h1 = document.createElement("h1");
    h1.textContent = "LeVe AI — Räätälöity ohjelma";
    const subtitle = document.createElement("p");
    subtitle.className = "wiz-subtitle";
    subtitle.textContent = "Vastaa kysymyksiin niin LeVe luo sinulle henkilökohtaisen ohjelman.";
    header.appendChild(h1);
    header.appendChild(subtitle);
    this.container.appendChild(header);

    this.progressEl = document.createElement("div");
    this.progressEl.id = "wiz-progress-area";
    this.container.appendChild(this.progressEl);

    this.stepEl = document.createElement("div");
    this.stepEl.id = "wiz-step-area";
    this.stepEl.addEventListener("input", this._onStepInteraction);
    this.stepEl.addEventListener("change", this._onStepInteraction);
    this.container.appendChild(this.stepEl);

    this.errorSummaryEl = document.createElement("div");
    this.errorSummaryEl.id = "wiz-error-summary-area";
    this.container.appendChild(this.errorSummaryEl);

    // Nav-palkki menee body:n loppuun (sticky alaosa), ei root-containerin sisään
    this.navEl = document.createElement("div");
    this.navEl.id = "wiz-nav-area";
    document.body.appendChild(this.navEl);
  }

  _onStepInteraction() {
    // Kun käyttäjä syöttää/muuttaa, nav-tila ja virheyhteenveto päivittyvät.
    // Itse kysymyssolmu hoitaa oman visuaalisen tilansa (radion is-selected jne.).
    this._refreshNav();
    renderErrorSummary(this.stateStore.state, this.errorSummaryEl);
  }

  _renderAll() {
    renderProgressBar(this.stateStore, this.progressEl);
    renderStep(this.stateStore, this.stepEl);
    renderErrorSummary(this.stateStore.state, this.errorSummaryEl);
    this._refreshNav();
  }

  _refreshNav() {
    renderNav(this.stateStore, this.navEl, this);
  }

  async _save() {
    if (!this.stateStore) return false;
    return await saveWizardConfig(this.stateStore.state.config);
  }

  async next() {
    if (this.isDone) return;
    const v = validateCurrentStep(this.stateStore.state);
    if (!v.isValid) return;

    const isLast = this.stateStore.state.currentStepIndex === WIZARD_STAGES.length - 1;
    if (isLast) {
      await this.complete();
      return;
    }
    nextStep(this.stateStore.state);
    this._persistStepIndex();
    await this._save();
    this._renderAll();
  }

  async prev() {
    if (this.isDone) return;
    if (prevStep(this.stateStore.state)) {
      this._persistStepIndex();
      await this._save();
      this._renderAll();
    }
  }

  async complete() {
    const fullValidation = validateAllSteps(this.stateStore.state);
    if (!fullValidation.valid) {
      console.warn("[wizard] complete: validation failed", fullValidation.errors);
      return false;
    }
    const cfg = { ...this.stateStore.state.config, completedAtISO: new Date().toISOString() };
    this.stateStore.state.config = cfg;
    await saveWizardConfig(cfg);
    this.isDone = true;
    this.progressEl.style.display = "none";
    this.navEl.style.display = "none";
    this.errorSummaryEl.innerHTML = "";
    renderDoneView(this.stateStore, this.stepEl, this);
    return true;
  }

  async restart() {
    const fresh = createEmptyWizardConfig();
    await saveWizardConfig(fresh);
    await setActiveWizardConfig(fresh.wizardId);
    this.isDone = false;
    if (this._unsubscribeState) this._unsubscribeState();
    this.stateStore = createWizardState(fresh);
    this._unsubscribeState = this.stateStore.subscribe((key) => {
      if (key === "config") this._debouncedSave();
    });
    this.progressEl.style.display = "";
    this.navEl.style.display = "";
    this._renderAll();
  }

  async runSelfTest() {
    return await uiSelfTest();
  }
}

// ── uiSelfTest — ohjelmallinen acceptance Vaiheen 1B hyväksymiskriteeriin ──
// Avaa selaimen konsolista: await window.__wizardSelfTest()
// Palauttaa { ok, checks: [{ label, ok }], errors: [string] }.
//
// Testaa:
//  1) state-store: setAnswer triggeröi listener, getAnswer palauttaa arvon
//  2) Navigation: nextStep liikkuu 0→6, ei ylitä, prevStep palaa 0:aan
//  3) Validation: havaitsee puuttuvat pakolliset, läpäisee kun täytetty
//  4) Schema-invariantit (1A:n SCHEMA_INVARIANTS:n täsmäys)

export async function uiSelfTest() {
  const report = { ok: true, checks: [], errors: [] };
  const ck = (label, cond) => {
    report.checks.push({ label, ok: !!cond });
    if (!cond) { report.ok = false; report.errors.push(label); }
  };

  const cfg = createEmptyWizardConfig();
  const store = createWizardState(cfg);
  let notified = 0;
  const unsub = store.subscribe(() => { notified++; });
  store.setAnswer("q01_age", 30);
  ck("setAnswer triggeröi listenerin", notified >= 1);
  ck("getAnswer palauttaa asetetun arvon", store.getAnswer("q01_age") === 30);

  for (let i = 0; i < WIZARD_STAGES.length - 1; i++) nextStep(store.state);
  ck(
    `nextStep liikkuu ${WIZARD_STAGES.length - 1} askelta loppuun`,
    store.state.currentStepIndex === WIZARD_STAGES.length - 1
  );
  const overshoot = nextStep(store.state);
  ck(
    "nextStep ei ylitä viimeistä vaihetta",
    overshoot === false && store.state.currentStepIndex === WIZARD_STAGES.length - 1
  );

  prevStep(store.state);
  ck("prevStep liikuttaa askel taaksepäin", store.state.currentStepIndex === WIZARD_STAGES.length - 2);
  for (let i = 0; i < 20; i++) prevStep(store.state);
  ck("prevStep ei alittaa nollaa", store.state.currentStepIndex === 0);

  store.state.currentStepIndex = 0;
  const v0 = validateCurrentStep(store.state);
  ck(
    "validateCurrentStep havaitsee puuttuvan q02_sex",
    !v0.isValid && v0.errors.some(e => e.questionId === "q02_sex")
  );

  store.setAnswer("q02_sex", "male");
  store.setAnswer("q03_weight", 91);
  const v0b = validateCurrentStep(store.state);
  ck("validateCurrentStep läpäisee kun pakolliset täytetty", v0b.isValid);

  // Range-validointi: q01_age yli rajan
  store.setAnswer("q01_age", 200);
  const v0c = validateCurrentStep(store.state);
  ck(
    "validateCurrentStep havaitsee range-virheen",
    !v0c.isValid && v0c.errors.some(e => e.questionId === "q01_age")
  );

  // Schema-invariantit
  ck("WIZARD_QUESTIONS.length = 25", WIZARD_QUESTIONS.length === SCHEMA_INVARIANTS.totalQuestions);
  ck("WIZARD_STAGES.length = 7", WIZARD_STAGES.length === SCHEMA_INVARIANTS.totalStages);

  // goToStep
  goToStep(store.state, 3);
  ck("goToStep liikuttaa annettuun indeksiin", store.state.currentStepIndex === 3);
  const bad = goToStep(store.state, 99);
  ck("goToStep hylkää virheellisen indeksin", bad === false && store.state.currentStepIndex === 3);

  unsub();
  return report;
}
