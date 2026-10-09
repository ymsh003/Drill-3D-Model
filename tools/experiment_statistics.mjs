// Balanced full-factorial deterministic variance decomposition; not inference.
function keyFor(values) {
  return values.join("|");
}

function groupMeans(data, groupKeys, metric) {
  const groups = new Map();
  for (const row of data) {
    const key = keyFor(groupKeys.map((name) => row[name]));
    const group = groups.get(key) || { sum: 0, count: 0 };
    group.sum += row[metric];
    group.count += 1;
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => [key, group.sum / group.count]));
}

export function functionalAnova(data, metric) {
  const factors = ["drill_angle_deg", "pin_pap_in", "val_angle_deg"];
  const grandMean = data.reduce((sum, row) => sum + row[metric], 0) / data.length;
  const oneWayMeans = Object.fromEntries(factors.map((factor) => [factor, groupMeans(data, [factor], metric)]));
  const pairs = [
    ["drill_angle_deg", "pin_pap_in"],
    ["drill_angle_deg", "val_angle_deg"],
    ["pin_pap_in", "val_angle_deg"]
  ];
  const pairMeans = Object.fromEntries(pairs.map((pair) => [pair.join("*"), groupMeans(data, pair, metric)]));
  const sums = {
    drill_angle_deg: 0,
    pin_pap_in: 0,
    val_angle_deg: 0,
    "drill_angle_deg*pin_pap_in": 0,
    "drill_angle_deg*val_angle_deg": 0,
    "pin_pap_in*val_angle_deg": 0,
    three_way: 0
  };
  const pairExtremes = Object.fromEntries(pairs.map((pair) => [pair.join("*"), { value: 0, at: null }]));
  let total = 0;
  for (const row of data) {
    const main = Object.fromEntries(factors.map((factor) => [
      factor,
      oneWayMeans[factor].get(keyFor([row[factor]])) - grandMean
    ]));
    const pairEffects = {};
    for (const pair of pairs) {
      const name = pair.join("*");
      const effect = pairMeans[name].get(keyFor(pair.map((factor) => row[factor])))
        - grandMean - main[pair[0]] - main[pair[1]];
      pairEffects[name] = effect;
      if (Math.abs(effect) > Math.abs(pairExtremes[name].value)) {
        pairExtremes[name] = {
          value: effect,
          at: Object.fromEntries(pair.map((factor) => [factor, row[factor]]))
        };
      }
    }
    const predictedWithoutThreeWay = grandMean
      + factors.reduce((sum, factor) => sum + main[factor], 0)
      + Object.values(pairEffects).reduce((sum, effect) => sum + effect, 0);
    const threeWay = row[metric] - predictedWithoutThreeWay;
    factors.forEach((factor) => { sums[factor] += main[factor] ** 2; });
    Object.entries(pairEffects).forEach(([name, effect]) => { sums[name] += effect ** 2; });
    sums.three_way += threeWay ** 2;
    total += (row[metric] - grandMean) ** 2;
  }
  const shares = Object.fromEntries(Object.entries(sums).map(([name, sum]) => [name, total > 1e-18 ? sum / total * 100 : 0]));
  return {
    grand_mean: grandMean,
    total_sum_of_squares: total,
    variance_share_pct: shares,
    strongest_pair_effect: pairExtremes
  };
}
