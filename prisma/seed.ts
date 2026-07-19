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

  // ==========================================================================
  // Seed Content Preset Block Types
  // ==========================================================================

  const presetBlockSpecs = [
    // GLITCH_EFFECT blocks
    {
      type: "GLITCH_EFFECT",
      name: "VHS Tracking",
      promptFragment: "VHS tracking artifacts: horizontal lines, color bleeding, static noise at frame edges",
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    {
      type: "GLITCH_EFFECT",
      name: "RGB Split",
      promptFragment: "RGB channel separation: red, green, blue layers offset creating chromatic aberration",
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    {
      type: "GLITCH_EFFECT",
      name: "Screen Shake",
      promptFragment: "Camera shake effect: frame jitters rapidly, simulating impact or bass drop",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    {
      type: "GLITCH_EFFECT",
      name: "Deep Fried",
      promptFragment: "Deep-fried visual: oversaturated colors, extreme contrast, JPEG artifacts, noise overlay",
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    {
      type: "GLITCH_EFFECT",
      name: "Motion Blur",
      promptFragment: "Extreme motion blur: subjects streak across frame during rapid movement",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    {
      type: "GLITCH_EFFECT",
      name: "Datamosh",
      promptFragment: "Datamosh effect: compression artifacts bleed between frames, subjects morph unnaturally",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "glitch",
    },
    // SOUND_CUE blocks
    {
      type: "SOUND_CUE",
      name: "Bass Drop",
      promptFragment: "Visual sync with bass drop: everything freezes for a beat, then impacts with energy release",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "sound",
    },
    {
      type: "SOUND_CUE",
      name: "Vine Boom",
      promptFragment: "Vine boom moment: dramatic pause, subject freezes mid-action, emphasis beat",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "sound",
    },
    {
      type: "SOUND_CUE",
      name: "Record Scratch",
      promptFragment: "Record scratch freeze: everything stops, subject looks at camera, confused expression",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "sound",
    },
    {
      type: "SOUND_CUE",
      name: "Windows Error",
      promptFragment: "Windows error sound moment: subject glitches, error popup appears in frame",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "sound",
    },
    {
      type: "SOUND_CUE",
      name: "Airhorn",
      promptFragment: "Airhorn hype moment: subject celebrates, crowd energy peaks, hands raised",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "sound",
    },
    // TEXT_OVERLAY blocks
    {
      type: "TEXT_OVERLAY",
      name: "Bouncing Caption",
      promptFragment: "Kinetic text: words bounce and scale with the beat, emphasized syllables larger",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "text",
    },
    {
      type: "TEXT_OVERLAY",
      name: "Flying Text",
      promptFragment: "Flying text effect: words enter from edges, zoom past camera, 3D perspective",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "text",
    },
    {
      type: "TEXT_OVERLAY",
      name: "Typewriter",
      promptFragment: "Typewriter text: characters appear one by one with cursor, retro terminal style",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "text",
    },
    {
      type: "TEXT_OVERLAY",
      name: "Shake Text",
      promptFragment: "Shaking text: words vibrate intensely, emphasizing intensity or chaos",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "text",
    },
    // EXPLAINER_VISUAL blocks
    {
      type: "EXPLAINER_VISUAL",
      name: "Diagram Overlay",
      promptFragment: "Educational diagram: labeled arrows point to key elements, clean infographic style",
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "explainer",
    },
    {
      type: "EXPLAINER_VISUAL",
      name: "Comparison Split",
      promptFragment: "Split screen comparison: before/after or A/B side by side, divider line visible",
      stageScope: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "explainer",
    },
    {
      type: "EXPLAINER_VISUAL",
      name: "Highlight Glow",
      promptFragment: "Highlight effect: key element glows or pulses, drawing viewer attention",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "explainer",
    },
    {
      type: "EXPLAINER_VISUAL",
      name: "Arrow Pointer",
      promptFragment: "Animated arrow: points at important element, follows movement if needed",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "explainer",
    },
    // CHOREO_BEAT blocks
    {
      type: "CHOREO_BEAT",
      name: "Sync Hit",
      promptFragment: "Perfect sync hit: all dancers/puppets hit the same pose simultaneously on beat",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "choreo",
    },
    {
      type: "CHOREO_BEAT",
      name: "Wave Propagate",
      promptFragment: "Wave effect: movement ripples through group from one side to the other",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "choreo",
    },
    {
      type: "CHOREO_BEAT",
      name: "Mirror Match",
      promptFragment: "Mirror choreography: two subjects perform identical moves facing each other",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "choreo",
    },
    {
      type: "CHOREO_BEAT",
      name: "Pose Hold",
      promptFragment: "Pose hold: freeze in dramatic position, camera circles or zooms",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "choreo",
    },
    {
      type: "CHOREO_BEAT",
      name: "Style Switch",
      promptFragment: "Style switch: abrupt change from one dance style to another on beat",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "choreo",
    },
    {
      type: "CHOREO_BEAT",
      name: "Group Freeze",
      promptFragment: "Group freeze: entire ensemble stops mid-movement, tableau moment",
      stageScope: ["EXTEND_END"],
      rotationGroup: "choreo",
    },
    // STORY_BEAT blocks
    {
      type: "STORY_BEAT",
      name: "Inciting Incident",
      promptFragment: "Story setup: establish normal state, then introduce the disruption or challenge",
      stageScope: ["GLOBAL"],
      rotationGroup: "story",
    },
    {
      type: "STORY_BEAT",
      name: "Rising Action",
      promptFragment: "Tension builds: stakes increase, obstacles mount, energy escalates",
      stageScope: ["GLOBAL"],
      rotationGroup: "story",
    },
    {
      type: "STORY_BEAT",
      name: "Climax",
      promptFragment: "Peak moment: maximum tension, decisive action, point of no return",
      stageScope: ["GLOBAL"],
      rotationGroup: "story",
    },
    {
      type: "STORY_BEAT",
      name: "Resolution",
      promptFragment: "Satisfying close: tension resolves, new equilibrium established, emotional payoff",
      stageScope: ["GLOBAL"],
      rotationGroup: "story",
    },
    // EMOTION_MARKER blocks
    {
      type: "EMOTION_MARKER",
      name: "Joy Burst",
      promptFragment: "Joy expression: wide smile, raised arms, body language of celebration and triumph",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "emotion",
    },
    {
      type: "EMOTION_MARKER",
      name: "Tension Build",
      promptFragment: "Tension expression: narrowed eyes, clenched fists, body coiled, anticipation",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "emotion",
    },
    {
      type: "EMOTION_MARKER",
      name: "Surprise Reveal",
      promptFragment: "Surprise expression: wide eyes, open mouth, body recoils, double-take",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "emotion",
    },
    {
      type: "EMOTION_MARKER",
      name: "Relief Drop",
      promptFragment: "Relief expression: shoulders drop, exhale visible, tension releases from body",
      stageScope: ["EXTEND_MIDDLE", "EXTEND_END"],
      rotationGroup: "emotion",
    },
    {
      type: "EMOTION_MARKER",
      name: "Determination Set",
      promptFragment: "Determination expression: jaw set, eyes focused, body squares up, ready stance",
      stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
      rotationGroup: "emotion",
    },
  ] as const;

  const presetBlocks = [];
  for (const spec of presetBlockSpecs) {
    presetBlocks.push(await upsertSeedBlock({ ...spec }));
  }

  console.log(`✅ Preset blocks ready: ${presetBlocks.length} new block types`);

  // ==========================================================================
  // Seed Template Presets
  // ==========================================================================

  const systemPresets = [
    {
      name: "Festival Hype",
      description: "The core Master of Puppets aesthetic. High-energy festival moments with puppet synchronization.",
      category: "FESTIVAL" as const,
      canonOverrides: {},
      defaultRunConfig: {
        batchSize: 5,
        loopMode: true,
        pacingStyle: "normal",
      },
      defaultBlocks: [],
      guidelines: [
        "Use dramatic camera moves to capture festival energy",
        "Emphasize puppet-crowd synchronization moments",
        "Build to satisfying payoffs with confetti/light explosions",
      ],
      isSystem: true,
    },
    {
      name: "Brainrot Chaos",
      description: "Hyper-stimulating, dopamine-maximizing chaos. Fast cuts, multiple gags, absurdist humor.",
      category: "BRAINROT" as const,
      canonOverrides: {
        hooks: ["record scratch", "jumpscare", "mid-sentence start", "wrong audio", "sus alert"],
        gags: ["ragdoll physics", "T-pose freeze", "clip through floor", "item dupe", "wrong texture"],
        payoffs: ["bass boosted drop", "screen explosion", "windows error", "vine boom", "airhorn spam"],
        chaosThreads: ["amogus", "spinning rat", "dancing cockroach", "flying text", "random stock photo"],
      },
      defaultRunConfig: {
        batchSize: 10,
        loopMode: true,
        pacingStyle: "chaotic",
        beatInterval: 0.5,
      },
      defaultBlocks: [
        { lane: "VIDEO_START", blockTypes: ["GLITCH_EFFECT", "SOUND_CUE"], rotationGroups: ["glitch", "sound"] },
        { lane: "EXTEND_MIDDLE", blockTypes: ["GLITCH_EFFECT", "TEXT_OVERLAY"], rotationGroups: ["glitch", "text"] },
      ],
      guidelines: [
        "Maximize visual chaos with glitch effects",
        "Stack multiple gags per scene",
        "Use absurdist hooks that subvert expectations",
        "Fast beat intervals (0.5s) for hyperstimulation",
      ],
      isSystem: true,
    },
    {
      name: "Edutainment Explainer",
      description: "Puppet as teacher/presenter. Clear structure, deliberate pacing, concept visualization.",
      category: "EDUCATIONAL" as const,
      canonOverrides: {
        stageAreas: ["Lecture Hall", "Workshop Tent", "Demo Stage", "TED Pavilion"],
        festivalMoments: ["Morning Workshop", "Afternoon Session", "Q&A Hour"],
        hooks: ["question hook", "problem statement", "Did you know...", "myth bust"],
        gags: ["confused reaction", "lightbulb moment", "facepalm", "eureka jump"],
        payoffs: ["summary recap", "call-to-action", "Now you know", "subscribe prompt"],
        chaosThreads: [],
      },
      defaultRunConfig: {
        batchSize: 3,
        loopMode: false,
        pacingStyle: "slow",
        beatInterval: 4,
      },
      defaultBlocks: [
        { lane: "GLOBAL", blockTypes: ["CHARACTER_LOCK"], rotationGroups: [] },
        { lane: "VIDEO_START", blockTypes: ["EXPLAINER_VISUAL"], rotationGroups: ["explainer"] },
      ],
      guidelines: [
        "One clear concept per video",
        "Presenter puppet stays consistent throughout",
        "Use explainer visuals for key concepts",
        "Slow pacing for comprehension",
      ],
      isSystem: true,
    },
    {
      name: "Dance Viral",
      description: "Choreography-focused content for TikTok dance trends. Sync to beat, repeatable moves.",
      category: "DANCE" as const,
      canonOverrides: {
        stageAreas: ["Dance Floor", "Mirror Room", "Spotlight Circle", "Battle Arena"],
        dynamics: ["synchronized perfect", "mirror challenge", "wave propagate", "battle face-off"],
        hooks: ["iconic first move", "challenge intro", "Try this dance"],
        payoffs: ["final pose hold", "group sync", "mirror break", "style reveal"],
      },
      defaultRunConfig: {
        batchSize: 5,
        loopMode: true,
        pacingStyle: "fast",
        beatInterval: 1,
      },
      defaultBlocks: [
        { lane: "VIDEO_START", blockTypes: ["CHOREO_BEAT"], rotationGroups: ["choreo"] },
        { lane: "EXTEND_MIDDLE", blockTypes: ["CHOREO_BEAT"], rotationGroups: ["choreo"] },
        { lane: "EXTEND_END", blockTypes: ["CHOREO_BEAT"], rotationGroups: ["choreo"] },
      ],
      guidelines: [
        "Loop mode critical for dance content",
        "Beat-synced movements throughout",
        "End with memorable pose hold",
        "Keep moves simple enough to replicate",
      ],
      isSystem: true,
    },
    {
      name: "Story Arc",
      description: "Mini-narrative with beginning, middle, end. Character development, emotional payoff.",
      category: "NARRATIVE" as const,
      canonOverrides: {
        festivalMoments: ["Inciting Incident", "Rising Action", "Crisis", "Resolution"],
        dynamics: ["character reaction", "relationship shift", "conflict", "resolution"],
        hooks: ["in medias res", "flashback hint", "mystery object", "danger signal"],
        payoffs: ["emotional climax", "twist reveal", "satisfying closure", "cliffhanger"],
      },
      defaultRunConfig: {
        batchSize: 3,
        loopMode: false,
        pacingStyle: "normal",
      },
      defaultBlocks: [
        { lane: "GLOBAL", blockTypes: ["STORY_BEAT", "CHARACTER_LOCK"], rotationGroups: ["story"] },
        { lane: "VIDEO_START", blockTypes: ["EMOTION_MARKER"], rotationGroups: ["emotion"] },
      ],
      guidelines: [
        "Establish clear character and stakes",
        "Build tension through middle section",
        "Deliver satisfying emotional payoff",
        "Linear narrative, no loop mode",
      ],
      isSystem: true,
    },
    {
      name: "Experimental Blend",
      description: "Mix-and-match styles. Subvert expectations, avant-garde aesthetics.",
      category: "EXPERIMENTAL" as const,
      canonOverrides: {
        festivalMoments: ["Non-linear time", "Dream sequence", "Style shift", "Reality break"],
        hooks: ["subverted expectation", "genre fake-out", "fourth wall break"],
        gags: ["format break", "style parody", "self-aware comment"],
        payoffs: ["unexpected resolution", "anti-climax", "infinite loop"],
        chaosThreads: ["reality glitch", "dimension bleed", "time skip"],
      },
      defaultRunConfig: {
        batchSize: 5,
        loopMode: true,
        styleConsistency: false,
      },
      defaultBlocks: [],
      guidelines: [
        "Style consistency disabled - embrace chaos",
        "Mix elements from different presets",
        "Subvert viewer expectations",
        "Experiment with unconventional structures",
      ],
      isSystem: true,
    },
  ];

  const presets = [];
  for (const preset of systemPresets) {
    const existing = await prisma.templatePreset.findFirst({
      where: { name: preset.name, isSystem: true },
    });

    if (existing) {
      presets.push(await prisma.templatePreset.update({
        where: { id: existing.id },
        data: {
          description: preset.description,
          category: preset.category,
          canonOverrides: preset.canonOverrides,
          defaultRunConfig: preset.defaultRunConfig,
          defaultBlocks: preset.defaultBlocks,
          guidelines: preset.guidelines,
        },
      }));
    } else {
      presets.push(await prisma.templatePreset.create({
        data: {
          name: preset.name,
          description: preset.description,
          category: preset.category,
          canonOverrides: preset.canonOverrides,
          defaultRunConfig: preset.defaultRunConfig,
          defaultBlocks: preset.defaultBlocks,
          guidelines: preset.guidelines,
          isSystem: true,
        },
      }));
    }
  }

  console.log(`✅ Template presets ready: ${presets.length} system presets`);

  console.log("\n🎉 Seed complete!");
  console.log(`   Theme Pack ID: ${themePack.id}`);
  console.log(`   Block Definitions: ${blocks.length + presetBlocks.length}`);
  console.log(`   Template Presets: ${presets.length}`);
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
