const { onValueCreated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// SKIFT region til din RTDB location i console (eksempel: europe-west1)
// database = din instance (står i mailen / console)
exports.createGroupCode = onValueCreated(
  {
    ref: "/groups/{groupId}",
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (event) => {
    const groupId = event.params.groupId;
    const db = getDatabase();

    for (let i = 0; i < 8; i++) {
      const code = makeCode();
      const codeRef = db.ref(`groupCodes/${code}`);
      const snap = await codeRef.get();

      if (!snap.exists()) {
        await codeRef.set({
          groupId,
          createdAt: Date.now(),
        });
        console.log(`Created group code ${code} for group ${groupId}`);
        return;
      }
    }

    throw new Error("Could not generate a unique code after multiple attempts.");
  }
);