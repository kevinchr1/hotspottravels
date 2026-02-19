// scripts/setAdmin.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Sæt din UID her:
const uid = "BBJvqkHCZSP5UuA5dASTwhl0gxg1";

async function main() {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Done. Admin claim set for UID: ${uid}`);

  // Optional: verify
  const user = await admin.auth().getUser(uid);
  console.log("Custom claims:", user.customClaims);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});