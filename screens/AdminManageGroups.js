import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function AdminManageGroups({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [groups, setGroups] = useState([]);
  const [duplicatingGroupId, setDuplicatingGroupId] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState("");

  useEffect(() => {
    let unsubscribeGroups = null;

    const bootstrap = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setIsAdmin(false);
          setGroups([]);
          return;
        }

        const token = await getIdTokenResult(user, true);
        const hasAdmin = token?.claims?.admin === true;
        setIsAdmin(hasAdmin);

        if (!hasAdmin) {
          setGroups([]);
          return;
        }

        const db = getDatabase();
        const groupsRef = ref(db, "groups");
        unsubscribeGroups = onValue(groupsRef, (snapshot) => {
          if (!snapshot.exists()) {
            setGroups([]);
            setLoading(false);
            return;
          }

          const data = snapshot.val();
          const list = Object.keys(data).map((groupId) => ({
            groupId,
            ...data[groupId],
          }));

          list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setGroups(list);
          setLoading(false);
        });
      } catch (e) {
        console.log("AdminManageGroups load error:", e);
        setGroups([]);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();

    return () => {
      if (typeof unsubscribeGroups === "function") unsubscribeGroups();
    };
  }, []);

  const handleDuplicateGroup = async (group) => {
    try {
      if (!group?.name || !group?.city || !group?.startDate || !group?.endDate) {
        Alert.alert("Error", "Group is missing required fields.");
        return;
      }

      setDuplicatingGroupId(group.groupId);
      const functions = getFunctions(undefined, "europe-west1");
      const createGroup = httpsCallable(functions, "createGroup");

      const result = await createGroup({
        name: `${group.name} (Copy)`,
        description: group.description || group.name || "",
        city: group.city,
        startDate: group.startDate,
        endDate: group.endDate,
      });

      const { code } = result?.data || {};
      Alert.alert(
        "Group duplicated",
        code ? `New join code: ${code}` : "Group duplicated successfully."
      );
    } catch (e) {
      console.log("Duplicate group error:", e);
      Alert.alert("Error", e?.message || "Could not duplicate group.");
    } finally {
      setDuplicatingGroupId("");
    }
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      "Delete group",
      `Delete "${group?.name || "this group"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingGroupId(group.groupId);
              const functions = getFunctions(undefined, "europe-west1");
              const deleteGroup = httpsCallable(functions, "deleteGroup");
              await deleteGroup({ groupId: group.groupId });
              Alert.alert("Group deleted", "The group was removed successfully.");
            } catch (e) {
              console.log("Delete group error:", e);
              Alert.alert("Error", e?.message || "Could not delete group.");
            } finally {
              setDeletingGroupId("");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Groups</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={ORANGE} />
            <Text style={styles.stateText}>Loading groups...</Text>
          </View>
        ) : !isAdmin ? (
          <View style={styles.stateCard}>
            <Text style={styles.noAccessTitle}>No access</Text>
            <Text style={styles.stateText}>
              This page is only available for admins.
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>No groups created yet.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.groupId} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ManageGroupDetails", {
                    groupId: group.groupId,
                  })
                }
              >
                <Text style={styles.groupName}>
                  {group.name || "Untitled group"}
                </Text>
                <Text style={styles.groupMeta}>
                  {group.city || "No city"}
                </Text>
                <Text style={styles.groupMeta}>
                  {(group.startDate || "No start date") +
                    " -> " +
                    (group.endDate || "No end date")}
                </Text>
                <Text style={styles.groupCode}>
                  Join code: {group.code || "N/A"}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.secondaryHalfButton}
                  disabled={deletingGroupId === group.groupId}
                  onPress={() =>
                    navigation.navigate("ManageGroupDetails", {
                      groupId: group.groupId,
                    })
                  }
                >
                  <Text style={styles.secondaryHalfButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tertiaryHalfButton}
                  disabled={
                    duplicatingGroupId === group.groupId ||
                    deletingGroupId === group.groupId
                  }
                  onPress={() => handleDuplicateGroup(group)}
                >
                  <Text style={styles.tertiaryHalfButtonText}>
                    {duplicatingGroupId === group.groupId ? "Duplicating..." : "Duplicate"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteHalfButton}
                  disabled={deletingGroupId === group.groupId}
                  onPress={() => handleDeleteGroup(group)}
                >
                  <Text style={styles.deleteHalfButtonText}>
                    {deletingGroupId === group.groupId ? "Deleting..." : "Delete"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    backgroundColor: "#fff",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 60,
    paddingVertical: 6,
  },
  backText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 20,
  },
  headerSpacer: {
    width: 60,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  groupName: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 4,
  },
  groupMeta: {
    color: NAVY,
    fontSize: 13,
    marginBottom: 2,
  },
  groupCode: {
    marginTop: 8,
    color: "#777",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  secondaryHalfButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryHalfButtonText: {
    color: NAVY,
    fontWeight: "700",
  },
  tertiaryHalfButton: {
    flex: 1,
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  tertiaryHalfButtonText: {
    color: "#B35A00",
    fontWeight: "700",
  },
  deleteHalfButton: {
    flex: 1,
    backgroundColor: "#FFE8E8",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  deleteHalfButtonText: {
    color: "#B00020",
    fontWeight: "700",
  },
  stateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  stateText: {
    marginTop: 8,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  noAccessTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 18,
  },
});
