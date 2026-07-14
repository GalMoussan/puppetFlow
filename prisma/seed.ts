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

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo theme pack
  const themePack = await prisma.themePack.create({
    data: {
      name: "Festival Demo Pack",
      active: true,
      canon: {
        hooks: ["surprise entrance", "dramatic lighting", "crowd chant"],
        cameras: ["dolly", "pan", "crane up", "whip pan", "tracking shot"],
        dynamics: ["synchronized", "call-response", "wave", "mirror"],
        visuals: ["neon strings", "golden glow", "puppet shadows", "sparkle trail"],
        gags: ["tangled strings", "puppet falls", "wrong puppet", "delayed reaction"],
        payoffs: ["crowd sync", "confetti burst", "puppet bow", "stage reveal"],
        chaosThreads: ["rogue balloon", "lost phone", "drunk fan", "pyro misfire"],
        stages: ["Main Stage", "Pyramid Stage", "The Other Stage", "West Holts"],
        moments: ["Sunset Arrival", "Peak Hour", "Headliner", "Secret Set", "Dawn Chorus"],
        languages: ["en", "hi", "ja", "es"],
        subgenres: ["psycore", "techno", "house", "dubstep", "drum and bass"],
      },
    },
  });

  console.log(`✅ Created theme pack: ${themePack.name} (${themePack.id})`);

  // Create block definitions
  const blocks = await Promise.all([
    // Hook blocks
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "HOOK",
        name: "Dramatic Entrance",
        promptFragment: "The puppet makes a dramatic entrance with {visual}, surprising the crowd",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
        rotationGroup: "hooks",
      },
    }),
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "HOOK",
        name: "Crowd Chant",
        promptFragment: "The crowd starts chanting in unison, the puppet responds with {dynamic}",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
        rotationGroup: "hooks",
      },
    }),

    // Camera moves
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "CAMERA_MOVE",
        name: "Whip Pan",
        promptFragment: "Quick whip pan to follow the action, motion blur emphasizing speed",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
        rotationGroup: "cameras",
      },
    }),
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "CAMERA_MOVE",
        name: "Crane Up",
        promptFragment: "Sweeping crane shot rising to reveal the full stage panorama",
        stageScope: ["VIDEO_START", "EXTEND_END"],
        rotationGroup: "cameras",
      },
    }),

    // Puppet dynamics
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "PUPPET_DYNAMIC",
        name: "Synchronized Dance",
        promptFragment: "Puppets move in perfect synchronization, mirroring each other's movements",
        stageScope: ["GLOBAL", "VIDEO_START", "EXTEND_MIDDLE"],
        rotationGroup: "dynamics",
      },
    }),

    // Puppet visuals (IMAGE lane)
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "PUPPET_VISUAL",
        name: "Neon Strings",
        promptFragment: "Puppet strings glow with vibrant neon colors, pulsing to the beat",
        stageScope: ["GLOBAL", "IMAGE"],
        rotationGroup: "visuals",
      },
    }),
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "PUPPET_VISUAL",
        name: "Wide Establishing Shot",
        promptFragment:
          "Wide festival establishing frame: packed crowd, LED walls, golden-hour haze, two puppets center stage",
        stageScope: ["IMAGE"],
        rotationGroup: "visuals",
      },
    }),
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "STAGE_AREA",
        name: "Image Main Stage Plate",
        promptFragment:
          "Main Stage environment plate for still generation: LED backdrop, UV haze, dense crowd midground",
        stageScope: ["IMAGE", "GLOBAL"],
        rotationGroup: null,
      },
    }),

    // Physical gags
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "PHYSICAL_GAG",
        name: "Tangled Strings",
        promptFragment: "The puppet's strings get hilariously tangled, comical struggle ensues",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
        rotationGroup: "gags",
      },
    }),

    // Payoffs
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "PAYOFF",
        name: "Confetti Burst",
        promptFragment: "Massive confetti explosion fills the frame, celebration moment",
        stageScope: ["EXTEND_END"],
        rotationGroup: "payoffs",
      },
    }),

    // Chaos threads
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "CHAOS_THREAD",
        name: "Rogue Balloon",
        promptFragment: "A balloon escapes and floats across the stage, puppet tries to catch it",
        stageScope: ["VIDEO_START", "EXTEND_MIDDLE"],
        rotationGroup: "chaos",
      },
    }),

    // Global blocks
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "STAGE_AREA",
        name: "Main Stage",
        promptFragment: "Set on the Main Stage, massive LED screens, packed crowd",
        stageScope: ["GLOBAL"],
        rotationGroup: null,
      },
    }),
    prisma.blockDefinition.create({
      data: {
        themePackId: themePack.id,
        type: "FESTIVAL_MOMENT",
        name: "Sunset Arrival",
        promptFragment: "Golden hour lighting, silhouettes against orange sky",
        stageScope: ["GLOBAL"],
        rotationGroup: null,
      },
    }),
  ]);

  console.log(`✅ Created ${blocks.length} block definitions`);

  // Create a sample flow template (full CanvasGraph so agent never sees missing runConfig)
  const template = await prisma.flowTemplate.create({
    data: {
      name: "Demo Festival Flow",
      themePackId: themePack.id,
      graph: {
        version: 1,
        lanes: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
        nodes: [],
        edges: [],
        runConfig: {
          loopMode: true,
          languages: { hi: 3, ja: 2 },
          batchSize: 5,
        },
      },
    },
  });

  console.log(`✅ Created template: ${template.name} (${template.id})`);

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
