const { onValueCreated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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

function makeReadableCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateUniqueCode() {
  const db = getDatabase();
  for (let i = 0; i < 20; i++) {
    const code = makeReadableCode();
    const snap = await db.ref(`groupCodes/${code}`).get();
    if (!snap.exists()) return code;
  }
  throw new Error("Could not generate unique code");
}

exports.createGroup = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    if (auth.token.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    const name = (data?.name || "").trim();
    const city = (data?.city || "Copenhagen").trim();
    const description = (data?.description || "").trim();
    const startDate = (data?.startDate || "").trim();
    const endDate = (data?.endDate || "").trim();

    if (!name) {
      throw new HttpsError("invalid-argument", "Group name required.");
    }

    const db = getDatabase();
    const groupId = db.ref("groups").push().key;
    const code = await generateUniqueCode();
    const now = Date.now();
    const uid = auth.uid;

    const updates = {};

    updates[`groups/${groupId}`] = {
      name,
      description,
      city,
      startDate,
      endDate,
      code,
      createdAt: now,
      createdBy: uid,
    };

    updates[`groupCodes/${code}`] = {
      groupId,
      createdAt: now,
      createdBy: uid,
    };

    updates[`groupMembers/${groupId}/${uid}`] = {
      role: "admin",
      joinedAt: now,
    };

    updates[`userGroups/${uid}/${groupId}`] = {
      role: "admin",
      status: "active",
      joinedAt: now,
    };

    updates[`users/${uid}/currentGroupId`] = groupId;

    await db.ref().update(updates);

    return { groupId, code };
  }
);