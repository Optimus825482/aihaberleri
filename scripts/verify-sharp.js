#!/usr/bin/env node

/**
 * Sharp Verification Script
 * Tests if sharp is properly installed and working
 */

async function verifySharp() {
  console.log("🔍 Verifying Sharp Installation...\n");

  try {
    // Try to require sharp
    console.log("1. Requiring sharp module...");
    const sharp = require("sharp");
    console.log("   ✅ Sharp module loaded successfully\n");

    // Check sharp version
    console.log("2. Checking sharp version...");
    const version = sharp.versions;
    console.log(`   ✅ Sharp version: ${version.sharp}`);
    console.log(`   ✅ libvips version: ${version.vips}\n`);

    // Test basic sharp functionality
    console.log("3. Testing sharp functionality...");
    const testBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );

    const result = await sharp(testBuffer).resize(10, 10).webp().toBuffer();

    console.log(`   ✅ Image processing successful`);
    console.log(`   ✅ Output size: ${result.length} bytes\n`);

    // Test format support
    console.log("4. Checking format support...");
    const formats = sharp.format;
    const supportedFormats = Object.keys(formats).filter(
      (f) => formats[f].input.buffer,
    );
    console.log(`   ✅ Supported formats: ${supportedFormats.join(", ")}\n`);

    // Success
    console.log("✅ Sharp is properly installed and working!");
    console.log("✅ Image optimization is ready for production\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Sharp verification failed!\n");
    console.error("Error:", error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    console.error("\n🔧 Troubleshooting:");
    console.error("1. Check if sharp is installed: npm list sharp");
    console.error("2. Check if libvips is installed: ldconfig -p | grep vips");
    console.error("3. Try reinstalling: npm install --omit=dev sharp@0.33.5\n");

    process.exit(1);
  }
}

// Run verification
verifySharp();
