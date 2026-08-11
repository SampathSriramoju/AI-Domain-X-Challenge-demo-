import { Router, type IRouter } from "express";
import {
  GenerateMetroflowRationaleBody,
  GenerateMetroflowRationaleResponse,
  GetMetroflowDemoResponse,
  SimulateMetroflowBody,
  SimulateMetroflowResponse,
  UploadMetroflowDataBody,
  UploadMetroflowDataResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SATURATION_FLOW = 1900;
const DEFAULT_LANES = 2;
const DEFAULT_GREEN_RATIO = 0.45;
const CURRENT_CYCLE = 120;
const TOTAL_CLEARANCE = 4;
const MIN_PEDESTRIAN = 18;
const YELLOW = 4;

type TrafficRow = {
  timestamp: Date;
  intersectionId: string;
  approach: string;
  volume: number;
  lanes?: number;
  capacity?: number;
  name?: string;
  lat?: number;
  lng?: number;
};

type TimeBucket = {
  minute: number;
  volume: number;
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows: [] as TrafficRow[], errors: ["The uploaded dataset contains no rows."], headers: [] as string[] };

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);
  const find = (...names: string[]) => names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const timestampIndex = find("timestamp", "datetime", "date_time", "time");
  const intersectionIndex = find("intersection_id", "intersectionid", "intersection", "intersection_name", "location");
  const approachIndex = find("approach_direction", "approachdirection", "approach", "direction");
  const volumeIndex = find("volume", "traffic_volume", "count", "flow", "vph");
  const lanesIndex = find("lane_count", "lanecount", "lanes");
  const capacityIndex = find("capacity", "capacity_vph", "capacityvehperhour");
  const nameIndex = find("intersection_name", "intersectionname", "name");
  const latIndex = find("latitude", "lat");
  const lngIndex = find("longitude", "lng", "lon");

  const missing = [
    timestampIndex < 0 ? "Timestamp" : "",
    intersectionIndex < 0 ? "Intersection_ID" : "",
    approachIndex < 0 ? "Approach_Direction" : "",
    volumeIndex < 0 ? "Volume" : "",
  ].filter(Boolean);

  if (missing.length > 0) {
    return { rows: [] as TrafficRow[], errors: [`Missing required columns: ${missing.join(", ")}. Required columns are: Timestamp, Intersection_ID, Approach_Direction, Volume.`], headers };
  }

  const errors: string[] = [];
  const rows: TrafficRow[] = [];
  lines.slice(1).forEach((line, rowIndex) => {
    const cells = parseLine(line);
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) return;
    const timestamp = new Date(cells[timestampIndex]);
    const intersectionId = cells[intersectionIndex]?.trim();
    const approach = cells[approachIndex]?.trim();
    const volume = Number(cells[volumeIndex]);

    if (Number.isNaN(timestamp.getTime()) || !intersectionId || !approach || !Number.isFinite(volume) || volume < 0) {
      if (errors.length < 5) {
        errors.push(`Row ${rowIndex + 2} has an invalid timestamp, intersection ID, approach, or volume.`);
      }
      return;
    }

    const lanes = lanesIndex >= 0 ? Number(cells[lanesIndex]) : undefined;
    const capacity = capacityIndex >= 0 ? Number(cells[capacityIndex]) : undefined;
    rows.push({
      timestamp,
      intersectionId,
      approach,
      volume,
      lanes: lanes && lanes > 0 ? lanes : undefined,
      capacity: capacity && capacity > 0 ? capacity : undefined,
      name: nameIndex >= 0 ? cells[nameIndex]?.trim() || undefined : undefined,
      lat: latIndex >= 0 ? Number(cells[latIndex]) || undefined : undefined,
      lng: lngIndex >= 0 ? Number(cells[lngIndex]) || undefined : undefined,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No valid traffic data rows could be parsed from the CSV.");
  }

  return { rows, errors, headers };
}

function bucketMinute(date: Date) {
  return date.getHours() * 60 + Math.floor(date.getMinutes() / 15) * 15;
}

function formatClock(minute: number) {
  const normalized = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function getPeak(rows: TrafficRow[]) {
  const buckets = new Map<number, number>();
  rows.forEach((row) => buckets.set(bucketMinute(row.timestamp), (buckets.get(bucketMinute(row.timestamp)) ?? 0) + row.volume));
  const ordered = [...buckets.entries()].sort(([a], [b]) => a - b);
  if (ordered.length === 0) return { start: 0, end: 60, peakDemand: 0, buckets: [] as TimeBucket[] };
  const values = new Map(ordered);
  let best = { start: ordered[0][0], demand: -1 };
  ordered.forEach(([start]) => {
    const demand = [0, 15, 30, 45].reduce((sum, offset) => sum + (values.get(start + offset) ?? 0), 0);
    if (demand > best.demand) best = { start, demand };
  });
  return {
    start: best.start,
    end: best.start + 60,
    peakDemand: best.demand,
    buckets: ordered.map(([minute, volume]) => ({ minute, volume })),
  };
}

function losFor(vc: number) {
  if (vc <= 0.6) return "A";
  if (vc <= 0.7) return "B";
  if (vc <= 0.8) return "C";
  if (vc <= 0.9) return "D";
  if (vc <= 1) return "E";
  return "F";
}

function statusFor(vc: number) {
  return vc >= 1 ? ("critical" as const) : vc >= 0.85 ? ("watch" as const) : ("stable" as const);
}

function getAverageDays(rows: TrafficRow[]) {
  return new Set(rows.map((row) => row.timestamp.toISOString().slice(0, 10))).size || 1;
}

function buildPhases(worstVc: number, dominantApproach: string) {
  const delta = clamp(Math.round((worstVc - 0.8) * 20), -6, 10);
  const current = [30, 22, 30, 18];
  const recommended = [current[0] + delta, current[1], current[2] - delta, current[3]];
  return [
    { phase: "Phase 2", movement: `${dominantApproach} through`, currentGreen: current[0], recommendedGreen: recommended[0], minPed: MIN_PEDESTRIAN, yellow: YELLOW, status: delta === 0 ? ("held" as const) : ("adjusted" as const) },
    { phase: "Phase 4", movement: "Cross-street pedestrian", currentGreen: current[1], recommendedGreen: recommended[1], minPed: MIN_PEDESTRIAN, yellow: YELLOW, status: "locked" as const },
    { phase: "Phase 6", movement: "Secondary approach through", currentGreen: current[2], recommendedGreen: recommended[2], minPed: MIN_PEDESTRIAN, yellow: YELLOW, status: delta === 0 ? ("held" as const) : ("adjusted" as const) },
    { phase: "Phase 8", movement: "Side-street pedestrian", currentGreen: current[3], recommendedGreen: recommended[3], minPed: MIN_PEDESTRIAN, yellow: YELLOW, status: "locked" as const },
  ];
}

function buildAnalysis(rows: TrafficRow[], filename: string) {
  const peak = getPeak(rows);
  const days = getAverageDays(rows);
  const byIntersection = new Map<string, TrafficRow[]>();
  rows.forEach((row) => byIntersection.set(row.intersectionId, [...(byIntersection.get(row.intersectionId) ?? []), row]));
  const orderedIds = [...byIntersection.keys()].sort();

  const intersections = orderedIds.map((id, index) => {
    const intersectionRows = byIntersection.get(id) ?? [];
    const peakRows = intersectionRows.filter((row) => {
      const min = row.timestamp.getHours() * 60 + row.timestamp.getMinutes();
      return min >= peak.start && min < peak.end;
    });
    const effectivePeakRows = peakRows.length > 0 ? peakRows : intersectionRows;
    const totalPeakVolume = effectivePeakRows.reduce((sum, row) => sum + row.volume, 0) / days;
    const demand = totalPeakVolume * 4;
    const laneValues = intersectionRows.map((row) => row.lanes).filter((v): v is number => Boolean(v));
    const lanes = laneValues.length ? Math.max(...laneValues) : DEFAULT_LANES;
    const capacityValues = intersectionRows.map((row) => row.capacity).filter((v): v is number => Boolean(v));
    const capacity = capacityValues.length ? Math.max(...capacityValues) : lanes * SATURATION_FLOW * DEFAULT_GREEN_RATIO;
    const vc = demand / Math.max(capacity, 1);
    const delay = 15 + (vc <= 1 ? vc * 30 : 30 + (vc - 1) * 110);
    const queue = Math.max(0, Math.round((demand - capacity) * 0.08 + delay * 1.8));
    const first = intersectionRows[0];
    const approaches = new Map<string, number>();
    effectivePeakRows.forEach((row) => approaches.set(row.approach, (approaches.get(row.approach) ?? 0) + row.volume));
    const approach = [...approaches.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? first?.approach ?? "Main";

    return {
      id,
      name: first?.name ?? id,
      order: index + 1,
      vc: round(vc, 2),
      los: losFor(vc),
      delay: round(delay, 1),
      queue,
      lanes,
      demand: Math.round(demand),
      capacity: Math.round(capacity),
      approach,
      lat: first?.lat ?? 0,
      lng: first?.lng ?? 0,
      status: statusFor(vc),
    };
  });

  const ranked = intersections.slice().sort((a, b) => b.vc - a.vc || b.delay - a.delay || a.id.localeCompare(b.id));
  const worst = ranked[0];
  const dominantApproach = worst?.approach ?? "Dominant";
  const phases = buildPhases(worst?.vc ?? 0, dominantApproach);

  const hourlyMap = new Map<number, number>();
  rows.forEach((row) => {
    const hour = row.timestamp.getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + row.volume);
  });

  const hourlyVolume = Array.from({ length: 24 }, (_, hour) => {
    const volume = Math.round(((hourlyMap.get(hour) ?? 0) / days) * 4);
    const peakHourStart = Math.floor(peak.start / 60);
    const peakHourEnd = Math.floor((peak.end - 1) / 60);
    const isPeak = hour >= peakHourStart && hour <= peakHourEnd;
    const peakType = isPeak ? (peakHourStart < 12 ? "am" : "pm") : "off";
    return { hour: `${String(hour).padStart(2, "0")}:00`, volume, peak: peakType as "am" | "midday" | "pm" | "off" };
  });

  const avgDelay = intersections.reduce((sum, item) => sum + item.delay, 0) / Math.max(intersections.length, 1);
  const corridorName = `${worst?.id ?? "Uploaded"} Corridor`;
  const peakWindow = `${formatClock(peak.start)} – ${formatClock(peak.end)}`;

  return GetMetroflowDemoResponse.parse({
    project: {
      name: `Analysis of ${filename}`,
      corridor: corridorName,
      datasetLabel: `${filename} · ${rows.length.toLocaleString()} rows`,
      updatedAt: new Date().toISOString(),
    },
    kpis: {
      intersections: intersections.length,
      peakWindow,
      worstVc: worst?.vc ?? 0,
      worstIntersection: worst?.id ?? "—",
      averageDelay: round(avgDelay, 1),
      recommendationCount: intersections.length,
    },
    hourlyVolume,
    intersections,
    phases,
    assumptions: [
      `Dataset: ${filename} (${rows.length.toLocaleString()} total observations).`,
      "Traffic volume is calculated as vehicles/hr from observed intervals.",
      `Capacity is calculated as ${SATURATION_FLOW} veh/hr/lane × lane count × ${Math.round(DEFAULT_GREEN_RATIO * 100)}% green ratio.`,
      "Peak window detection finds the highest 60-minute rolling sum.",
      "Signal timing preserves pedestrian safety minimums and a 120-second cycle.",
      "All metrics are offline advisory recommendations and simulated estimates.",
    ],
    activities: [
      { title: "Dataset parsed & active", detail: `${rows.length.toLocaleString()} valid traffic rows drive this canonical analysis.`, time: "now", tone: "success" as const },
      { title: "Peak window identified", detail: `${peakWindow} · aggregate peak demand identified`, time: "now", tone: "info" as const },
      { title: "Primary bottleneck ranked", detail: `Worst intersection: ${worst?.id ?? "—"} (V/C: ${worst?.vc.toFixed(2) ?? "0.00"}, Delay: ${worst?.delay.toFixed(1) ?? "0.0"}s, LOS: ${worst?.los ?? "A"})`, time: "now", tone: "warning" as const },
    ],
  });
}

const demoRows: TrafficRow[] = Array.from({ length: 5 }, (_, intersectionIndex) =>
  Array.from({ length: 24 }, (_, hour) => ({
    timestamp: new Date(Date.UTC(2026, 7, 8, hour)),
    intersectionId: `INT_0${intersectionIndex + 1}`,
    approach: intersectionIndex === 3 ? "Eastbound" : "Westbound",
    volume: [260, 290, 330, 360, 420, 520, 700, 1000, 1180, 920, 760, 700, 720, 760, 810, 920, 1100, 1300, 1180, 920, 620, 450, 340, 280][hour] * (intersectionIndex === 3 ? 1.3 : 0.72 + intersectionIndex * 0.04),
    lanes: intersectionIndex === 2 || intersectionIndex === 3 ? 2 : 3,
    name: `Main St & ${[1, 3, 4, 5, 7][intersectionIndex]}th Ave`,
  })),
).flat();
const demo = buildAnalysis(demoRows, "DEMO DATASET · weekday_counts.csv");

function calculateSimulation(input: ReturnType<typeof SimulateMetroflowBody.parse>) {
  const multiplier = input.demandMultiplier;
  const baselineDelay = (input.baselineDelay ?? 44.8) * multiplier;
  const baselineQueue = (input.baselineQueue ?? 82) * multiplier;
  const baselineThroughput = (input.baselineThroughput ?? 3900) * multiplier;
  const recommendedDelay = (input.recommendedDelay ?? baselineDelay * 0.82) * multiplier;
  const recommendedQueue = (input.recommendedQueue ?? baselineQueue * 0.78) * multiplier;
  const recommendedThroughput = (input.recommendedThroughput ?? baselineThroughput * 1.06) * multiplier;
  const los = (delay: number) => delay > 70 ? "F" : delay > 55 ? "E" : delay > 40 ? "D" : delay > 30 ? "C" : "B";
  const reduction = round((1 - recommendedDelay / Math.max(baselineDelay, 0.1)) * 100, 1);
  return SimulateMetroflowResponse.parse({
    demandMultiplier: multiplier,
    baseline: { delay: round(baselineDelay), queue: Math.round(baselineQueue), los: los(baselineDelay), throughput: Math.round(baselineThroughput), reduction: 0 },
    recommended: { delay: round(recommendedDelay), queue: Math.round(recommendedQueue), los: los(recommendedDelay), throughput: Math.round(recommendedThroughput), reduction },
    limitations: "SIMULATED ESTIMATE · Uses the active dataset's calculated metrics with a bounded demand multiplier. Field results vary with arrivals, pedestrians, incidents, weather, and physical signal controller settings.",
  });
}

router.get("/metroflow/demo", (_req, res): void => {
  res.json(demo);
});

router.post("/metroflow/upload", (req, res): void => {
  const parsed = UploadMetroflowDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { filename, rows, content, hasRequiredColumns = true } = parsed.data;
  const warnings: string[] = [];
  const errors: string[] = [];
  let parsedRows: TrafficRow[] = [];
  let preview: Array<{ timestamp: string; intersectionId: string; approach: string; volume: number }> = [];

  if (!filename.toLowerCase().endsWith(".csv")) {
    errors.push("Traffic count files must use the .csv format.");
  }

  if (content) {
    const result = parseCsv(content);
    parsedRows = result.rows;
    errors.push(...result.errors);
    preview = parsedRows.slice(0, 5).map((row) => ({ timestamp: row.timestamp.toISOString(), intersectionId: row.intersectionId, approach: row.approach, volume: row.volume }));
  } else {
    if (!hasRequiredColumns) errors.push("Missing required columns: Timestamp, Intersection_ID, Approach_Direction, Volume.");
    if (rows === 0) errors.push("The uploaded dataset contains no rows.");
  }

  if (content && parsedRows.length > 0 && parsedRows.length < 50) {
    warnings.push("Small sample detected (<50 rows). Results reflect provided sample slice.");
  }

  const analysis = errors.length === 0 && parsedRows.length > 0 ? buildAnalysis(parsedRows, filename) : undefined;
  res.json(UploadMetroflowDataResponse.parse({
    status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid",
    rowsProcessed: errors.length > 0 ? 0 : (content ? parsedRows.length : rows),
    warnings,
    errors,
    preview,
    analysis,
  }));
});

router.post("/metroflow/simulate", (req, res): void => {
  const parsed = SimulateMetroflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(calculateSimulation(parsed.data));
});
router.post("/metroflow/rationale", (req, res): void => {
  const parsed = GenerateMetroflowRationaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const phaseDelta = input.phaseAfter - input.phaseBefore;
  const delayReduction = input.simulationBefore && input.simulationAfter
    ? input.simulationAfter.reduction
    : round((1 - input.delayAfter / Math.max(input.delayBefore, 0.1)) * 100, 1);
  const currentSignal = input.currentSignal ?? `${input.phaseBefore}s green`;
  const recommendedSignal = input.recommendedSignal ?? `${input.phaseAfter}s green`;

  const markdown = [
    "### Engineering finding",
    `**WHAT happened?** Bottleneck identified at **${input.intersectionId}** during peak window **${input.peakWindow}**.\n\n` +
    `**WHERE?** Intersection **${input.intersectionId}**.\n\n` +
    `**WHY?** Peak V/C ratio reached **${input.vcRatio.toFixed(2)}** with an estimated baseline delay of **${input.delayBefore.toFixed(1)}s** per vehicle and a queue of **${input.queue ?? 0} ft**.\n\n` +
    `**WHAT is recommended?** Adjust phase timing from **${currentSignal}** to **${recommendedSignal}** (phase delta: ${phaseDelta >= 0 ? "+" : ""}${phaseDelta}s) while maintaining safety constraints and pedestrian minimums.\n\n` +
    `**WHAT does the simulation estimate?** Modeled delay reduction of **${delayReduction}%** with safety status **${input.safetyStatus}**.\n\n` +
    `**WHAT assumptions apply?**\n` +
    (input.assumptions ?? ["Deterministic analysis based strictly on the uploaded active dataset."]).map((a) => `- ${a}`).join("\n") + "\n\n" +
    `**WHAT are the limitations?** This is an offline simulated estimate. Field conditions, driver behavior, weather, and live controller constraints may affect actual performance.`,
  ].join("\n\n");

  res.json(GenerateMetroflowRationaleResponse.parse({ source: "deterministic-fallback", markdown }));
});

export default router;
