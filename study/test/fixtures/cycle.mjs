// A made-up two-host cycle with an internal loop and a dead end, to exercise the cycle view.
export default {
  chunk: 7, fig: "Fig 7", title: "Cycle fixture <b>&</b>",
  view: "cycle",
  cycle: {
    hosts: [
      { key: "h", label: "Host & co", role: "definitive host" },
      { key: "o", label: "Outside", role: "soil" },
    ],
    stages: [
      { key: "egg", label: "Egg", host: "o", how: "hatches" },
      { key: "lar", label: "Larva", host: "o", where: "free", how: "enters the host through the skin" },
      { key: "mig", label: "Migrant", host: "h", how: "reaches the gut" },
      { key: "adu", label: "Adult", host: "h", where: "gut", how: "lays eggs in feces" },
    ],
    side: [
      { key: "auto", label: "Internal larva", host: "h", from: "adu", how: "hatches inside", back: "mig", backHow: "re-enters" },
      { key: "dead", label: "Stray cyst", host: "h", from: "lar", how: "wrong host" },
    ],
    cuts: {
      "Shoes": { links: ["lar>mig"], text: "no skin entry; the internal loop carries on." },
      "Drug": { links: ["adu>auto"], text: "stops the internal loop." },
      "Sewage": { links: ["adu>egg"], text: "no eggs outside." },
    },
  },
  facts: [["Entry", "Skin <b>&</b>."], ["Site", "Gut."]],
  sources: ["fixture"],
  simplified: ["fixture"],
};
