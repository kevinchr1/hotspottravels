const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const admin = require("firebase-admin");

initializeApp();

// Brug kun A-Z og 0-9 for “pænne” koder
function makeCode(len = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function isNonEmptyString(x) {
  return typeof x === "string" && x.trim().length > 0;
}

exports.createGroup = onCall(
  {
    region: "europe-west1",
    // database er optional her, men fint at være eksplicit:
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    // 1) Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    // 2) Admin claim check
    const claims = request.auth.token || {};
    if (claims.admin !== true) {
      throw new HttpsError("permission-denied", "Admins only.");
    }

    // 3) Input
    const data = request.data || {};
    const name = isNonEmptyString(data.name) ? data.name.trim() : null;
    const description = isNonEmptyString(data.description) ? data.description.trim() : "";
    const city = isNonEmptyString(data.city) ? data.city.trim() : null; // fx "Copenhagen" eller "KRAKOW"
    const startDate = isNonEmptyString(data.startDate) ? data.startDate.trim() : ""; // "YYYY-MM-DD"
    const endDate = isNonEmptyString(data.endDate) ? data.endDate.trim() : ""; // "YYYY-MM-DD"

    if (!name) throw new HttpsError("invalid-argument", "Missing 'name'.");
    if (!city) throw new HttpsError("invalid-argument", "Missing 'city'.");

    const db = getDatabase();

    // 4) Lav groupId (push key)
    const groupRef = db.ref("groups").push();
    const groupId = groupRef.key;
    if (!groupId) {
      throw new HttpsError("internal", "Could not generate groupId.");
    }

    // 5) Find unik kode
    let code = null;
    for (let i = 0; i < 20; i++) {
      const candidate = makeCode(6);
      const snap = await db.ref(`groupCodes/${candidate}`).get();
      if (!snap.exists()) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new HttpsError("internal", "Could not generate unique code.");
    }

    const uid = request.auth.uid;

    // 6) Multi-location update (atomisk)
    const updates = {};

    // Group data (matcher eksisterende struktur)
    updates[`groups/${groupId}`] = {
      name,
      description,
      city,
      startDate,
      endDate,
      code,
    };

    // Code -> group
    updates[`groupCodes/${code}`] = {
      groupId,
    };

    // Gør creator til host + sæt currentGroup
    updates[`groupMembers/${groupId}/${uid}`] = {
      role: "host",
      joinedAt: Date.now(),
    };

    updates[`userGroups/${uid}/${groupId}`] = {
      role: "host",
      status: "active",
      joinedAt: Date.now(),
    };

    updates[`users/${uid}/currentGroupId`] = groupId;
    updates[`groupSchedules/${groupId}`] = {};

    await db.ref().update(updates);

    return {
      groupId,
      code,
    };
  }
);

exports.updateGroupMetadata = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const data = request.data || {};
    const groupId = isNonEmptyString(data.groupId) ? data.groupId.trim() : "";
    const name = isNonEmptyString(data.name) ? data.name.trim() : "";
    const description = typeof data.description === "string" ? data.description.trim() : "";
    const startDate = isNonEmptyString(data.startDate) ? data.startDate.trim() : "";
    const endDate = isNonEmptyString(data.endDate) ? data.endDate.trim() : "";

    if (!groupId) {
      throw new HttpsError("invalid-argument", "Missing 'groupId'.");
    }
    if (!name) {
      throw new HttpsError("invalid-argument", "Missing 'name'.");
    }
    if (!startDate || !endDate) {
      throw new HttpsError("invalid-argument", "Missing 'startDate' or 'endDate'.");
    }

    const db = getDatabase();
    await db.ref(`groups/${groupId}`).update({
      name,
      description,
      startDate,
      endDate,
    });

    return { success: true };
  }
);

exports.addGroupEvent = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const data = request.data || {};
    const groupId = isNonEmptyString(data.groupId) ? data.groupId.trim() : "";
    const locationId = isNonEmptyString(data.locationId) ? data.locationId.trim() : "";
    const destinationKey = isNonEmptyString(data.destinationKey) ? data.destinationKey.trim() : "";
    const startAt = Number(data.startAt);

    if (!groupId) {
      throw new HttpsError("invalid-argument", "Missing 'groupId'.");
    }
    if (!locationId) {
      throw new HttpsError("invalid-argument", "Missing 'locationId'.");
    }
    if (!destinationKey) {
      throw new HttpsError("invalid-argument", "Missing 'destinationKey'.");
    }
    if (!Number.isFinite(startAt)) {
      throw new HttpsError("invalid-argument", "Invalid 'startAt'.");
    }

    const db = getDatabase();
    await db.ref(`groupSchedules/${groupId}`).push({
      locationId,
      destinationKey,
      startAt,
    });

    return { success: true };
  }
);

exports.deleteGroupEvent = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const data = request.data || {};
    const groupId = isNonEmptyString(data.groupId) ? data.groupId.trim() : "";
    const eventId = isNonEmptyString(data.eventId) ? data.eventId.trim() : "";

    if (!groupId) {
      throw new HttpsError("invalid-argument", "Missing 'groupId'.");
    }
    if (!eventId) {
      throw new HttpsError("invalid-argument", "Missing 'eventId'.");
    }

    const db = getDatabase();
    await db.ref(`groupSchedules/${groupId}/${eventId}`).remove();

    return { success: true };
  }
);

exports.deleteGroup = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const data = request.data || {};
    const groupId = isNonEmptyString(data.groupId) ? data.groupId.trim() : "";
    if (!groupId) {
      throw new HttpsError("invalid-argument", "Missing 'groupId'.");
    }

    const db = getDatabase();
    const groupRef = db.ref(`groups/${groupId}`);
    const membersRef = db.ref(`groupMembers/${groupId}`);

    const [groupSnap, membersSnap] = await Promise.all([
      groupRef.get(),
      membersRef.get(),
    ]);

    if (!groupSnap.exists()) {
      throw new HttpsError("not-found", "Group not found.");
    }

    const group = groupSnap.val() || {};
    const code = isNonEmptyString(group.code) ? group.code.trim() : "";
    const memberUids = membersSnap.exists() ? Object.keys(membersSnap.val() || {}) : [];

    const updates = {
      [`groups/${groupId}`]: null,
      [`groupSchedules/${groupId}`]: null,
      [`groupMembers/${groupId}`]: null,
    };

    if (code) {
      updates[`groupCodes/${code}`] = null;
    }

    for (const uid of memberUids) {
      updates[`userGroups/${uid}/${groupId}`] = null;
    }

    if (memberUids.length > 0) {
      const currentGroupSnaps = await Promise.all(
        memberUids.map((uid) => db.ref(`users/${uid}/currentGroupId`).get())
      );

      currentGroupSnaps.forEach((snap, idx) => {
        if (snap.exists() && snap.val() === groupId) {
          updates[`users/${memberUids[idx]}/currentGroupId`] = null;
        }
      });
    }

    await db.ref().update(updates);
    return { success: true, removedMembers: memberUids.length };
  }
);

exports.removeGroupMember = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    if (request.auth.token?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin only");
    }

    const data = request.data || {};
    const groupId = isNonEmptyString(data.groupId) ? data.groupId.trim() : "";
    const memberUid = isNonEmptyString(data.memberUid) ? data.memberUid.trim() : "";

    if (!groupId) {
      throw new HttpsError("invalid-argument", "Missing 'groupId'.");
    }
    if (!memberUid) {
      throw new HttpsError("invalid-argument", "Missing 'memberUid'.");
    }

    const db = getDatabase();
    const memberRef = db.ref(`groupMembers/${groupId}/${memberUid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists()) {
      throw new HttpsError("not-found", "Member not found in group.");
    }

    const member = memberSnap.val() || {};
    if (member.role === "host") {
      throw new HttpsError("failed-precondition", "Host cannot be removed.");
    }

    const updates = {
      [`groupMembers/${groupId}/${memberUid}`]: null,
      [`userGroups/${memberUid}/${groupId}`]: null,
    };

    const currentGroupSnap = await db.ref(`users/${memberUid}/currentGroupId`).get();
    if (currentGroupSnap.exists() && currentGroupSnap.val() === groupId) {
      updates[`users/${memberUid}/currentGroupId`] = null;
    }

    await db.ref().update(updates);
    return { success: true };
  }
);

exports.createUserReport = onCall(
  {
    region: "europe-west1",
    database: "hotspot-8eff0-default-rtdb",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const reporterUid = request.auth.uid;
    const data = request.data || {};
    const reportedUid = typeof data.reportedUid === "string" ? data.reportedUid.trim() : "";
    const reason = typeof data.reason === "string" ? data.reason.trim() : "";
    const descriptionRaw = data.description;

    if (!reportedUid) {
      throw new HttpsError("invalid-argument", "Invalid reported user.");
    }
    if (reporterUid === reportedUid) {
      throw new HttpsError("failed-precondition", "You cannot report yourself.");
    }
    if (!reason) {
      throw new HttpsError("invalid-argument", "Reason is required.");
    }
    if (
      typeof descriptionRaw !== "undefined" &&
      descriptionRaw !== null &&
      typeof descriptionRaw !== "string"
    ) {
      throw new HttpsError("invalid-argument", "Description must be a string.");
    }

    const reportRef = admin.database().ref("reports").push();
    await reportRef.set({
      reporterUid,
      reportedUid,
      reason,
      description: typeof descriptionRaw === "string" ? descriptionRaw.trim() : "",
      createdAt: Date.now(),
      status: "open",
    });

    return { success: true };
  }
);
