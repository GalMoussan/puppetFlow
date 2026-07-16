/**
 * Prisma Seed Script
 *
 * Creates initial data for development:
 * - A demo theme pack with canon data
 * - Block definitions for each block type
 * - A sample flow template
 *
 * Run with: pnpm prisma db seed
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Decode the actual database URL from the Prisma proxy URL
function getDatabaseUrl(): string {
  const proxyUrl = process.env.DATABASE_URL;
  if (!proxyUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Extract api_key from prisma+postgres:// URL
  const match = proxyUrl.match(/api_key=([^&]+)/);
  if (match) {
    try {
      const decoded = JSON.parse(Buffer.from(match[1], "base64").toString());
      return decoded.databaseUrl;
    } catch {
      // Fall back to proxy URL if decoding fails
    }
  }

  // If it's a direct postgres:// URL, use it as-is
  return proxyUrl.replace("prisma+postgres://", "postgres://");
}

const connectionString = getDatabaseUrl();
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Character definitions with detailed lock text for image prompts */
const DEMO_CHARACTERS = [
  {
    name: "Shika",
    description: "The puppet master - a tall, elegant dog with knowing eyes",
    lockText: `**CRITICAL SHIKA IMAGE LOCK:** Shika must be based directly on the provided Shika reference image. Do not infer Shika from text. Do not reinterpret Shika as a different breed, different coat pattern, different ears, different eyes, different muzzle, or different body shape. Follow how the dog in the image appears exactly as is. No add-ons, no extra characteristics or characteristics that are not in the image. Her expression and posture should match her role in the scene's emotional dynamic, but her physical identity is locked to the reference image absolutely. Shika is the ONLY dog in the scene.`,
  },
  {
    name: "Shilshul",
    description: "The puppet - a life-sized animatronic T-Rex with oblivious joy",
    lockText: `**CRITICAL SHILSHUL IMAGE LOCK:** Shilshul is a life-sized, hyperrealistic, animatronic-grade T-Rex with detailed green-brown scales, amber eyes, a massive expressive dinosaur face, comically tiny arms, and a long heavy tail. His face carries oblivious joy — genuine, unguarded happiness. Shilshul must NEVER become a dog, small animal, mascot, cartoon creature, duplicate of Shika, or any other species. Keep him visually distinct: huge green-brown scaly T-Rex with amber eyes, giant dinosaur head, powerful legs, long tail, and tiny arms. He is the ONLY T-Rex in the scene.`,
  },
];

/** Universe rules for the puppet world */
const DEMO_UNIVERSE_RULES = [
  "Shika controls Shilshul through invisible gesture control - no visible strings or cords anywhere in frame",
  "The puppet visual manifests as eerie half-second synchronization: Shilshul's movements mirror Shika's with a slight delay",
  "Shilshul is completely unaware he is being controlled - his joy is genuine and unguarded",
  "The control is beautiful on the verge of collapse - precise yet precarious",
  "All scenes are hyperrealistic photographs, not illustrations or animations",
  "Technical frame: ARRI Alexa look, cinematic lenses (24-85mm), shallow depth of field",
];

/** Full canon pools — variety engine needs ≥ batchSize unique values per axis (batch up to 10). */
const DEMO_CANON = {
  characters: DEMO_CHARACTERS,
  universeRules: DEMO_UNIVERSE_RULES,
  festivalName: "Master of Puppets Festival",
  hooks: [
    "surprise entrance",
    "dramatic lighting",
    "crowd chant",
    "sudden silence",
    "UV blackout",
    "string snap tease",
    "mirror reveal",
    "pyro flash",
    "crowd part",
    "silhouette rise",
  ],
  cameras: [
    "dolly",
    "pan",
    "crane up",
    "whip pan",
    "tracking shot",
    "push-in",
    "pull-back",
    "steadicam",
    "handheld",
    "aerial",
  ],
  dynamics: [
    "synchronized",
    "call-response",
    "wave",
    "mirror",
    "tandem",
    "battle",
    "orbit",
    "leapfrog",
    "lockstep",
    "duet break",
  ],
  visuals: [
    "neon strings",
    "golden glow",
    "puppet shadows",
    "sparkle trail",
    "UV reactive",
    "smoke",
    "particles",
    "laser lattice",
    "strobe freeze",
    "hologram flicker",
  ],
  gags: [
    "tangled strings",
    "puppet falls",
    "wrong puppet",
    "delayed reaction",
    "wrong stage",
    "collision",
    "stuck",
    "hat steal",
    "mic drop fail",
    "shoe fly",
  ],
  payoffs: [
    "crowd sync",
    "confetti burst",
    "puppet bow",
    "stage reveal",
    "light explosion",
    "freeze",
    "unity",
    "chant peak",
    "drop impact",
    "hands skyward",
  ],
  chaosThreads: [
    "rogue balloon",
    "lost phone",
    "drunk fan",
    "pyro misfire",
    "beach ball",
    "smoke drift",
    "confetti",
    "security jog",
    "flag wave",
    "drone buzz",
  ],
  stages: [
    "Main Stage",
    "Pyramid Stage",
    "The Other Stage",
    "West Holts",
    "Secret Stage",
    "Campground",
    "The Park",
    "Arcadia",
    "Glade",
    "Field of Avalon",
  ],
  moments: [
    "Sunset Arrival",
    "Peak Hour",
    "Headliner",
    "Secret Set",
    "Dawn Chorus",
    "After Hours",
    "Midnight",
    "Golden Hour",
    "Blue Hour",
    "Dawn",
  ],
  languages: ["hi", "ja"],
  subgenres: [
    "psycore",
    "techno",
    "house",
    "dubstep",
    "drum and bass",
    "trance",
    "hardstyle",
    "minimal",
    "progressive",
    "breaks",
  ],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert demo theme pack so re-seed refreshes thin canon pools
  const themePack = await prisma.themePack.upsert({
    where: { name: "Festival Demo Pack" },
    create: {
      name: "Festival Demo Pack",
      active: true,
      canon: DEMO_CANON,
    },
    update: {
      active: true,
      canon: DEMO_CANON,
    },
  });

  console.log(`✅ Theme pack ready: ${themePack.name} (${themePack.id})`);

  /**
   * Upsert a seed block by (themePackId, name).
   * NEVER deleteMany on the whole pack — that wiped user-created blocks.
   */
  async function upsertSeedBlock(data: {
    type: string;
    name: string;
    promptFragment: string;
    stageScope: readonly string[];
    rotationGroup?: string | null;
  }) {
    const existing = await prisma.blockDefinition.findFirst({
      where: { themePackId: themePack.id, name: data.name },
    });
    if (existing) {
      return prisma.blockDefinition.update({
        where: { id: existing.id },
        data: {
          type: data.type as never,
          promptFragment: data.promptFragment,
          stageScope: [...data.stageScope],
          rotationGroup: data.rotationGroup ?? null,
          archived: false,
        },
      });
    }
    return prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: data.type as never,
        name: data.name,
        promptFragment: data.promptFragment,
        stageScope: [...data.stageScope],
        rotationGroup: data.rotationGroup ?? null,
      },
    });
  }

  const seedBlockSpecs = [
    // IMAGE-specific detailed blocks
    {
      type: "STYLE_LOCK",
      name: "Cinematic Realism Frame",
      promptFragment:
        "A real, unedited photograph. Hyperrealistic cinematic realism, full color, no animation, no cartoon, no illustration. ARRI Alexa look, 35mm lens, f/2.2, golden-hour festival grade.",
      stageScope: ["IMAGE"],
      rotationGroup: null,
    },
    {
      type: "CHARACTER_LOCK",
      name: "Shika Character Lock",
      promptFragment:
        "Shika — The dog EXACTLY as she appears in the provided reference image — no deviation in breed, coat, size, expression, body shape, or any feature. No add-ons, no extra characteristics not present in the reference image. Trust the image completely.",
      stageScope: ["IMAGE", "GLOBAL"],
      rotationGroup: null,
    },
    {
      type: "CHARACTER_LOCK",
      name: "Shilshul Character Lock",
      promptFragment:
        "Shilshul — A life-sized, hyperrealistic, animatronic-grade T-Rex with detailed green-brown scales, amber eyes, a massive expressive dinosaur face, comically tiny arms, and a long heavy tail. His face carries oblivious joy — genuine, unguarded happiness.",
      stageScope: ["IMAGE", "GLOBAL"],
      rotationGroup: null,
    },
    {
      type: "PUPPET_VISUAL",
      name: "Invisible Control Dynamic",
      promptFragment:
        "The Puppet Visual — Invisible gesture control: no strings or cords anywhere in frame. Instead, an eerie half-second synchronization — Shilshul's movement mirrors Shika's gesture with a beat delay, unmistakable once noticed.",
      stageScope: ["IMAGE"],
      rotationGroup: null,
    },
    {
      type: "STYLE_LOCK",
      name: "Image Negative Constraints",
      promptFragment:
        "Mood: beautiful control on the verge of collapse. No distorted animals, no extra dogs, no extra dinosaurs, no cartoon features, no illustration, correct anatomy, no floating text, no real-celebrity faces, no real band logos.",
      stageScope: ["IMAGE"],
      rotationGroup: null,
    },
    {
      type: "HOOK",
      name: "Dramatic Entrance",
      promptFragment:
        "The puppet makes a dramatic entrance with {visual}, surprising the crowd",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "hooks",
    },
    {
      type: "HOOK",
      name: "Crowd Chant",
      promptFragment:
        "The crowd starts chanting in unison, the puppet responds with {dynamic}",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "hooks",
    },
    {
      type: "CAMERA_MOVE",
      name: "Whip Pan",
      promptFragment:
        "Quick whip pan to follow the action, motion blur emphasizing speed",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "cameras",
    },
    {
      type: "CAMERA_MOVE",
      name: "Crane Up",
      promptFragment:
        "Sweeping crane shot rising to reveal the full stage panorama",
      stageScope: ["VIDEO_START", "EXTEND_END"],
      rotationGroup: "cameras",
    },
    {
      type: "PUPPET_DYNAMIC",
      name: "Synchronized Dance",
      promptFragment:
        "Puppets move in perfect synchronization, mirroring each other's movements",
      stageScope: ["GLOBAL", "VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "dynamics",
    },
    {
      type: "PUPPET_VISUAL",
      name: "Neon Strings",
      promptFragment:
        "Puppet strings glow with vibrant neon colors, pulsing to the beat",
      stageScope: ["GLOBAL", "IMAGE"],
      rotationGroup: "visuals",
    },
    {
      type: "PUPPET_VISUAL",
      name: "Wide Establishing Shot",
      promptFragment:
        "Wide festival establishing frame composition: Shika positioned on elevated platform stage left, Shilshul center stage. Packed crowd fills midground with raised arms, phone lights, festival flags. LED walls display abstract patterns. Golden-hour haze diffuses through the scene, volumetric light rays visible.",
      stageScope: ["IMAGE"],
      rotationGroup: "visuals",
    },
    {
      type: "STAGE_AREA",
      name: "Image Main Stage Plate",
      promptFragment:
        "Main Stage environment plate for still generation: LED backdrop, UV haze, dense crowd midground",
      stageScope: ["IMAGE", "GLOBAL"],
      rotationGroup: null,
    },
    {
      type: "PHYSICAL_GAG",
      name: "Tangled Strings",
      promptFragment:
        "The puppet's strings get hilariously tangled, comical struggle ensues",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "gags",
    },
    {
      type: "PAYOFF",
      name: "Confetti Burst",
      promptFragment:
        "Massive confetti explosion fills the frame, celebration moment",
      stageScope: ["EXTEND_END"],
      rotationGroup: "payoffs",
    },
    {
      type: "CHAOS_THREAD",
      name: "Rogue Balloon",
      promptFragment:
        "A balloon escapes and floats across the stage, puppet tries to catch it",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "chaos",
    },
    {
      type: "STAGE_AREA",
      name: "Main Stage",
      promptFragment:
        "Setting — Main Stage at {{stageArea}}: massive LED screens towering three stories, speaker stacks flanking the stage, metal barriers separating the pit, worn grass underfoot from thousands of dancing feet, equipment cases visible backstage, roadies in black moving between shadows.",
      stageScope: ["GLOBAL"],
      rotationGroup: null,
    },
    {
      type: "FESTIVAL_MOMENT",
      name: "Sunset Arrival",
      promptFragment: "Golden hour lighting: warm orange sun low on horizon, long shadows stretching across the crowd, silhouettes of raised arms against amber sky, dust particles floating in light beams, lens flare kissing the frame edge.",
      stageScope: ["GLOBAL"],
      rotationGroup: null,
    },
    {
      type: "CHAOS_THREAD",
      name: "Background Life",
      promptFragment:
        "Background chaos thread — a festival-goer with a flag pole weaving through the crowd, barely visible at frame edge.",
      stageScope: ["IMAGE"],
      rotationGroup: "chaos",
    },
    {
      type: "CUSTOM",
      name: "Crowd Atmosphere",
      promptFragment:
        "Crowd — The natural chaos of a festival crowd: a couple dancing obliviously in their own world, a group lifting a friend onto shoulders, someone recording on their phone, security watching from the edge, the dense mass of humanity united by the music.",
      stageScope: ["IMAGE"],
      rotationGroup: null,
    },
  ] as const;

  const blocks = [];
  for (const spec of seedBlockSpecs) {
    blocks.push(await upsertSeedBlock({ ...spec }));
  }

  const userBlockCount = await prisma.blockDefinition.count({
    where: {
      themePackId: themePack.id,
      name: { notIn: seedBlockSpecs.map((s) => s.name) },
    },
  });

  console.log(
    `✅ Seed blocks ready: ${blocks.length} (preserved ${userBlockCount} user-created block(s))`
  );

  // Upsert demo flow template (full CanvasGraph so agent never sees missing runConfig)
  const demoGraph = {
    version: 1,
    lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
    nodes: [],
    edges: [],
    runConfig: {
      loopMode: true,
      languages: { hi: 3, ja: 2 },
      batchSize: 5,
    },
  };

  const existingTemplate = await prisma.flowTemplate.findFirst({
    where: { name: "Demo Festival Flow", themePackId: themePack.id },
  });

  const template = existingTemplate
    ? await prisma.flowTemplate.update({
        where: { id: existingTemplate.id },
        data: { graph: demoGraph },
      })
    : await prisma.flowTemplate.create({
        data: {
          name: "Demo Festival Flow",
          themePackId: themePack.id,
          graph: demoGraph,
        },
      });

  console.log(`✅ Template ready: ${template.name} (${template.id})`);

  console.log("\n🎉 Seed complete!");
  console.log(`   Theme Pack ID: ${themePack.id}`);
  console.log(`   Block Definitions: ${blocks.length}`);
  console.log(`   Templates: 1`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
