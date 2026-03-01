import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, onValue, ref, update } from "firebase/database";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

const formatDate = (ms) => {
  if (!ms) return "Unknown date";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString();
};

export default function AdminReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [reports, setReports] = useState([]);
  const [resolvingId, setResolvingId] = useState("");

  useEffect(() => {
    let unsubscribeReports = null;

    const init = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setIsAdmin(false);
          setReports([]);
          return;
        }

        const token = await getIdTokenResult(user, true);
        const hasAdmin = token?.claims?.admin === true;
        setIsAdmin(hasAdmin);
        if (!hasAdmin) {
          setReports([]);
          return;
        }

        const db = getDatabase();
        unsubscribeReports = onValue(ref(db, "reports"), (snapshot) => {
          if (!snapshot.exists()) {
            setReports([]);
            setLoading(false);
            return;
          }

          const data = snapshot.val() || {};
          const openReports = Object.keys(data)
            .map((reportId) => ({
              reportId,
              ...data[reportId],
            }))
            .filter((item) => item.status === "open")
            .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

          setReports(openReports);
          setLoading(false);
        });
      } catch (e) {
        console.log("AdminReportsScreen init error:", e);
        setIsAdmin(false);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (typeof unsubscribeReports === "function") unsubscribeReports();
    };
  }, []);

  const handleResolve = async (reportId) => {
    try {
      setResolvingId(reportId);
      const db = getDatabase();
      await update(ref(db, `reports/${reportId}`), { status: "resolved" });
      Alert.alert("Updated", "Report marked as resolved.");
    } catch (e) {
      console.log("Resolve report error:", e);
      Alert.alert("Error", e?.message || "Could not update report.");
    } finally {
      setResolvingId("");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Reports</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={ORANGE} />
            <Text style={styles.muted}>Loading reports...</Text>
          </View>
        ) : !isAdmin ? (
          <View style={styles.card}>
            <Text style={styles.noAccessTitle}>No access</Text>
            <Text style={styles.muted}>This page is only available for admins.</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>No open reports.</Text>
          </View>
        ) : (
          reports.map((item) => (
            <View key={item.reportId} style={styles.card}>
              <Text style={styles.sectionTitle}>Report</Text>

              <Text style={styles.metaLine}>Reporter: {item.reporterUid || "N/A"}</Text>
              <Text style={styles.metaLine}>Reported: {item.reportedUid || "N/A"}</Text>
              <Text style={styles.metaLine}>Reason: {item.reason || "N/A"}</Text>
              <Text style={styles.metaLine}>
                Description: {item.description ? item.description : "No description"}
              </Text>
              <Text style={styles.dateLine}>{formatDate(item.createdAt)}</Text>

              <TouchableOpacity
                style={styles.primaryButton}
                disabled={resolvingId === item.reportId}
                onPress={() => handleResolve(item.reportId)}
              >
                <Text style={styles.primaryButtonText}>
                  {resolvingId === item.reportId ? "Updating..." : "Mark resolved"}
                </Text>
              </TouchableOpacity>
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
  sectionTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  metaLine: {
    color: NAVY,
    fontSize: 13,
    marginBottom: 4,
  },
  dateLine: {
    marginTop: 4,
    marginBottom: 12,
    color: "#666",
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  muted: {
    marginTop: 8,
    color: "#666",
    fontSize: 14,
  },
  noAccessTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 18,
  },
});
