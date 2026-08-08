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

const hourlyVolume = [
  1180, 1040, 920, 860, 980, 1320, 2480, 4380, 5120, 4020, 3220, 2960,
  3180, 3340, 3460, 3810, 4720, 5380, 4960, 3540, 2640, 1980, 1540, 1280,
].map((volume, index) => ({
  hour: `${String(index).padStart(2, "0")}:00`,
  volume,
  peak:
    index >= 7 && index <= 9
      ? ("am" as const)
      : index >= 16 && index <= 18
        ? ("pm" as const)
        : index >= 11 && index <= 14
          ? ("midday" as const)
          : ("off" as const),
}));

const intersections = [
  {
    id: "INT_01",
    name: "Main St & 1st Ave",
    order: 1,
    vc: 0.72,
    los: "C",
    delay: 24.8,
    queue: 46,
    lanes: 3,
    demand: 2960,
    capacity: 4100,
    approach: "Eastbound",
    lat: 40.7124,
    lng: -74.0064,
    status: "stable" as const,
  },
  {
    id: "INT_02",
    name: "Main St & 3rd Ave",
    order: 2,
    vc: 0.88,
    los: "D",
    delay: 37.6,
    queue: 68,
    lanes: 3,
    demand: 3510,
    capacity: 3990,
    approach: "Eastbound",
    lat: 40.7129,
    lng: -74.0034,
    status: "watch" as const,
  },
  {
    id: "INT_03",
    name: "Main St & 4th Ave",
    order: 3,
    vc: 0.96,
    los: "E",
    delay: 51.2,
    queue: 91,
    lanes: 2,
    demand: 3280,
    capacity: 3420,
    approach: "Eastbound",
    lat: 40.7134,
    lng: -74.0002,
    status: "watch" as const,
  },
  {
    id: "INT_04",
    name: "Main St & 5th Ave",
    order: 4,
    vc: 1.12,
    los: "F",
    delay: 68.4,
    queue: 120,
    lanes: 2,
    demand: 3820,
    capacity: 3410,
    approach: "Eastbound",
    lat: 40.7139,
    lng: -73.997,
    status: "critical" as const,
  },
  {
    id: "INT_05",
    name: "Main St & 7th Ave",
    order: 5,
    vc: 0.81,
    los: "D",
    delay: 42.1,
    queue: 72,
    lanes: 3,
    demand: 3160,
    capacity: 3900,
    approach: "Westbound",
    lat: 40.7144,
    lng: -73.9938,
    status: "stable" as const,
  },
];

const phases = [
  {
    phase: "Phase 2",
    movement: "Eastbound through",
    currentGreen: 36,
    recommendedGreen: 50,
    minPed: 18,
    yellow: 4,
    status: "adjusted" as const,
  },
  {
    phase: "Phase 4",
    movement: "Northbound pedestrian",
    currentGreen: 18,
    recommendedGreen: 18,
    minPed: 18,
    yellow: 4,
    status: "locked" as const,
  },
  {
    phase: "Phase 6",
    movement: "Westbound through",
    currentGreen: 42,
    recommendedGreen: 34,
    minPed: 18,
    yellow: 4,
    status: "adjusted" as const,
  },
  {
    phase: "Phase 8",
    movement: "Southbound pedestrian",
    currentGreen: 18,
    recommendedGreen: 18,
    minPed: 18,
    yellow: 4,
    status: "locked" as const,
  },
];

const demo = GetMetroflowDemoResponse.parse({
  project: {
    name: "Main Street Corridor Retiming",
    corridor: "Main Street · Downtown Arterial",
    datasetLabel: "DEMO DATASET · 7 days · 15-minute counts",
    updatedAt: "August 8, 2026 · 09:42",
  },
  kpis: {
    intersections: 5,
    peakWindow: "07:45 – 09:15",
    worstVc: 1.12,
    worstIntersection: "INT_04",
    averageDelay: 44.8,
    recommendationCount: 5,
  },
  hourlyVolume,
  intersections,
  phases,
  assumptions: [
    "Webster cycle-length baseline with 1,900 veh/hr/lane saturation flow.",
    "M/M/1 queue approximation under stable, steady-state arrivals.",
    "Pedestrian minimums held at 18 seconds; yellow intervals held at 4 seconds.",
    "Outputs are offline advisory recommendations and simulated estimates only.",
  ],
  activities: [
    {
      title: "Safety validation passed",
      detail: "All recommended phase splits meet minimum pedestrian clearance.",
      time: "09:42",
      tone: "success" as const,
    },
    {
      title: "Primary bottleneck identified",
      detail: "INT_04 · Main St & 5th Ave · V/C 1.12 · LOS F",
      time: "09:40",
      tone: "warning" as const,
    },
    {
      title: "Baseline dataset loaded",
      detail: "7 days of synthetic 15-minute counts are ready for review.",
      time: "09:38",
      tone: "info" as const,
    },
  ],
});

function calculateSimulation(demandMultiplier: number) {
  const baselineDelay = 68.4 * demandMultiplier;
  const baselineQueue = 120 * demandMultiplier;
  const baselineLos =
    baselineDelay > 55 ? "F" : baselineDelay > 35 ? "E" : baselineDelay > 25 ? "D" : "C";
  const recommendedDelay = 42.1 * demandMultiplier;
  const recommendedQueue = 75 * demandMultiplier;
  const recommendedLos =
    recommendedDelay > 55
      ? "F"
      : recommendedDelay > 35
        ? "E"
        : recommendedDelay > 25
          ? "D"
          : "C";
  const reduction = Math.round((1 - recommendedDelay / baselineDelay) * 1000) / 10;

  return SimulateMetroflowResponse.parse({
    demandMultiplier,
    baseline: {
      delay: Math.round(baselineDelay * 10) / 10,
      queue: Math.round(baselineQueue),
      los: baselineLos,
      throughput: Math.round(3820 * demandMultiplier),
      reduction: 0,
    },
    recommended: {
      delay: Math.round(recommendedDelay * 10) / 10,
      queue: Math.round(recommendedQueue),
      los: recommendedLos,
      throughput: Math.round(4130 * demandMultiplier),
      reduction,
    },
    limitations:
      "SIMULATED ESTIMATE · Webster delay and M/M/1 queue approximations assume stable flow. Actual field results vary with arrivals, pedestrians, incidents, weather, and implementation conditions.",
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

  const { filename, rows, hasRequiredColumns = true } = parsed.data;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!filename.toLowerCase().endsWith(".csv")) {
    errors.push("Traffic count files must use the .csv format.");
  }
  if (!hasRequiredColumns) {
    errors.push("Missing required columns: Timestamp, Intersection_ID, Approach_Direction, Volume.");
  }
  if (rows === 0) {
    errors.push("The uploaded dataset contains no rows.");
  }
  if (rows > 0 && rows < 100) {
    warnings.push("Small sample detected. Peak windows may be less representative than a 7-day baseline.");
  }

  res.json(
    UploadMetroflowDataResponse.parse({
      status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid",
      rowsProcessed: errors.length > 0 ? 0 : rows,
      warnings,
      errors,
      preview: [
        {
          timestamp: "2026-08-08 07:45:00",
          intersectionId: "INT_04",
          approach: "Eastbound",
          volume: 530,
        },
        {
          timestamp: "2026-08-08 08:00:00",
          intersectionId: "INT_04",
          approach: "Eastbound",
          volume: 548,
        },
        {
          timestamp: "2026-08-08 08:15:00",
          intersectionId: "INT_04",
          approach: "Eastbound",
          volume: 552,
        },
      ],
    }),
  );
});

router.post("/metroflow/simulate", (req, res): void => {
  const parsed = SimulateMetroflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(calculateSimulation(parsed.data.demandMultiplier));
});

router.post("/metroflow/rationale", (req, res): void => {
  const parsed = GenerateMetroflowRationaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const phaseDelta = input.phaseAfter - input.phaseBefore;
  const delayReduction = Math.round((1 - input.delayAfter / input.delayBefore) * 100);
  const direction = phaseDelta >= 0 ? "increased" : "reduced";
  const markdown = [
    `### Engineering rationale`,
    `The deterministic traffic engine identified **${input.intersectionId}** as the controlling bottleneck during the **${input.peakWindow}** peak, with a measured V/C ratio of **${input.vcRatio.toFixed(2)}**. To respond to the dominant approach demand, ${input.intersectionId}'s ${"Phase 2"} green time was ${direction} by **${Math.abs(phaseDelta)} seconds** while the recommended cycle moved from **${input.cycleBefore}s** to **${input.cycleAfter}s**.`,
    `The resulting comparison is a **simulated estimate**, not a guarantee: average control delay changes from **${input.delayBefore.toFixed(1)}s** to **${input.delayAfter.toFixed(1)}s per vehicle**, a modeled reduction of approximately **${delayReduction}%** under the stated assumptions. Safety status remains **${input.safetyStatus}**; pedestrian minimums and clearance intervals were not overridden.`,
    `This explanation is generated from structured deterministic outputs. The model uses Webster-style timing and a stable-flow queue approximation. Actual field performance will vary with demand variability, pedestrians, incidents, weather, and implementation conditions.`,
  ].join("\n\n");

  res.json(
    GenerateMetroflowRationaleResponse.parse({
      source: "deterministic-fallback",
      markdown,
    }),
  );
});

export default router;