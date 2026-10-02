// Tests de la conversion Polymarket → questions. Lancer : npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { categorize, eventsToQuestions, resolvedAnswer, type GammaEvent } from "./polymarket.ts";

const now = Date.parse("2026-10-02T15:00:00Z");
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();
const yesNo = (yes: number) => ({ outcomes: '["Yes", "No"]', outcomePrices: JSON.stringify([String(yes), String(1 - yes)]) });

const fed: GammaEvent = {
  id: "1",
  slug: "fed-decision-in-october",
  title: "Fed decision in October?",
  endDate: inDays(26),
  tags: [{ label: "Economy" }, { label: "Fed Rates" }],
  markets: [
    { groupItemTitle: "50+ bps decrease", ...yesNo(0.03) },
    { groupItemTitle: "25 bps decrease", ...yesNo(0.81) },
    { groupItemTitle: "No change", ...yesNo(0.15) },
    { groupItemTitle: "25+ bps increase", ...yesNo(0.005) },
    { groupItemTitle: "Hike 100 bps", ...yesNo(0.001) },
    { groupItemTitle: "Closed one", ...yesNo(0.9), closed: true },
  ],
};

const bitcoin: GammaEvent = {
  id: "2",
  slug: "btc-150k",
  title: "Will Bitcoin hit $150k by December 31?",
  endDate: inDays(90),
  tags: [{ label: "Crypto" }],
  markets: [{ question: "Will Bitcoin hit $150k by December 31?", outcomes: ["Yes", "No"], outcomePrices: ["0.22", "0.78"] }],
};

const match: GammaEvent = {
  id: "3",
  title: "PSG vs Marseille",
  endDate: inDays(3),
  tags: [{ label: "Soccer" }],
  markets: [{ question: "PSG vs. Marseille", outcomes: '["PSG", "Marseille"]', outcomePrices: '["0.7", "0.3"]' }],
};

test("convertit un QCM (plusieurs marchés) en gardant les 4 issues les plus probables", () => {
  const [q] = eventsToQuestions([fed], { now });
  assert.equal(q.id, "pm-1");
  assert.equal(q.category, "Macroéconomie");
  assert.deepEqual(q.options, ["25 bps decrease", "No change", "50+ bps decrease", "25+ bps increase"]);
  assert.ok(q.pools["25 bps decrease"] > q.pools["No change"]);
  assert.equal(q.source?.url, "https://polymarket.com/event/fed-decision-in-october");
});

test("traduit Yes/No en Oui/Non et respecte les probabilités", () => {
  const [q] = eventsToQuestions([bitcoin], { now });
  assert.deepEqual(q.options, ["Oui", "Non"]);
  assert.equal(q.category, "Tech & crypto");
  assert.equal(q.pools.Oui, 1100);
  assert.equal(q.pools.Non, 3900);
});

test("garde les issues nommées d'un marché simple", () => {
  const [q] = eventsToQuestions([match], { now });
  assert.deepEqual(q.options, ["PSG", "Marseille"]);
  assert.equal(q.category, "Sport");
});

test("écarte les événements inutilisables", () => {
  const bad: GammaEvent[] = [
    { id: "4", title: "Trop loin", endDate: inDays(400), markets: [yesNo(0.5)] },
    { id: "5", title: "Presque fini", endDate: inDays(0.01), markets: [yesNo(0.5)] },
    { id: "6", title: "Prix cassés", endDate: inDays(5), markets: [{ outcomes: '["Yes","No"]', outcomePrices: "oops" }] },
    { id: "7", title: "Sans marché", endDate: inDays(5), markets: [] },
    { id: "8", title: "Fermé", endDate: inDays(5), closed: true, markets: [yesNo(0.5)] },
  ];
  assert.equal(eventsToQuestions(bad, { now }).length, 0);
});

test("catégorise d'après les tags puis le titre", () => {
  assert.equal(categorize([{ label: "Courts" }, { label: "Politics" }]), "Droit public");
  assert.equal(categorize([{ label: "Movies" }]), "Pop culture");
  assert.equal(categorize([], "Something unusual"), "Monde & politique");
});

test("détermine la réponse gagnante d'un événement terminé", () => {
  assert.equal(resolvedAnswer(bitcoin, ["Oui", "Non"]), undefined, "pas encore terminé");
  const btcDone = { ...bitcoin, closed: true, markets: [{ ...bitcoin.markets![0], outcomePrices: ["0", "1"] }] };
  assert.equal(resolvedAnswer(btcDone, ["Oui", "Non"]), "Non");

  const options = ["25 bps decrease", "No change"];
  const fedDone: GammaEvent = {
    ...fed,
    closed: true,
    markets: [
      { groupItemTitle: "25 bps decrease", ...yesNo(0), closed: true },
      { groupItemTitle: "No change", ...yesNo(1), closed: true },
    ],
  };
  assert.equal(resolvedAnswer(fedDone, options), "No change");
  assert.equal(resolvedAnswer(fedDone, ["25 bps decrease"]), null, "issue hors de nos options → annulation");
});
