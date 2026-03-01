import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function AdminManageGroups({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [groups, setGroups] = useState([]);

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
            <TouchableOpacity
              key={group.groupId}
              style={styles.card}
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
