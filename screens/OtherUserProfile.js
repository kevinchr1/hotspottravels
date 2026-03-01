import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth } from "firebase/auth";
import { getDatabase, get, ref } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";
const PLACEHOLDER = "#6B7280";

export default function OtherUserProfile({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const auth = getAuth();
  const db = getDatabase();
  const functions = getFunctions(undefined, "europe-west1");

  const viewedUid = route?.params?.userId || "";

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const currentUid = auth.currentUser?.uid || "";
  const canReport = Boolean(viewedUid) && viewedUid !== currentUid;

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      if (!viewedUid) {
        setLoading(false);
        setUserData(null);
        return;
      }

      try {
        const snap = await get(ref(db, `users/${viewedUid}`));
        if (cancelled) return;

        if (snap.exists()) {
          setUserData(snap.val());
        } else {
          setUserData(null);
        }
      } catch (e) {
        console.log("OtherUserProfile load error:", e);
        if (!cancelled) setUserData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [db, viewedUid]);

  const displayName = useMemo(() => {
    if (userData?.username) return userData.username;
    if (userData?.displayName) return userData.displayName;
    if (userData?.name) return userData.name;
    if (route?.params?.userName) return route.params.userName;
    return viewedUid ? `User ${viewedUid.slice(0, 6)}` : "Unknown user";
  }, [route?.params?.userName, userData, viewedUid]);

  const handleSubmitReport = async () => {
    if (!reportReason) {
      Alert.alert("Select a reason");
      return;
    }
    if (!viewedUid) {
      Alert.alert("Error", "Missing user to report.");
      return;
    }

    try {
      setSubmittingReport(true);
      const createUserReport = httpsCallable(functions, "createUserReport");
      await createUserReport({
        reportedUid: viewedUid,
        reason: reportReason,
        description: reportDescription,
      });

      Alert.alert("Report submitted", "Thank you. We will review this.");
      setReportModalVisible(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      Alert.alert("Error", error?.message || "Could not submit report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const ReasonOption = ({ label }) => {
    const selected = reportReason === label;
    return (
      <TouchableOpacity
        style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
        onPress={() => setReportReason(label)}
      >
        <Text style={[styles.reasonOptionText, selected && styles.reasonOptionTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.muted}>Loading...</Text>
          ) : (
            <>
              <View style={styles.profileRow}>
                {userData?.photoURL ? (
                  <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(displayName || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.profileText}>
                  <Text style={styles.name}>{displayName}</Text>
                  <Text style={styles.subtle}>UID: {viewedUid || "N/A"}</Text>
                </View>
              </View>

              {canReport && (
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setReportModalVisible(true)}
                >
                  <Text style={styles.reportButtonText}>Report user</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Report user</Text>

            <ReasonOption label="Harassment" />
            <ReasonOption label="Spam" />
            <ReasonOption label="Inappropriate behaviour" />

            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Optional description"
              placeholderTextColor={PLACEHOLDER}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
            />

            <TouchableOpacity
              style={styles.primaryButton}
              disabled={submittingReport}
              onPress={handleSubmitReport}
            >
              <Text style={styles.primaryButtonText}>
                {submittingReport ? "Submitting..." : "Submit report"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setReportModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEE",
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFD9A3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#CC7A00",
    fontSize: 22,
    fontWeight: "800",
  },
  profileText: {
    flex: 1,
  },
  name: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "800",
  },
  subtle: {
    color: "#666",
    marginTop: 2,
    fontSize: 12,
  },
  muted: {
    color: "#666",
    fontSize: 14,
  },
  reportButton: {
    marginTop: 20,
    alignItems: "center",
  },
  reportButtonText: {
    color: "#B00020",
    fontWeight: "700",
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  reasonOption: {
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  reasonOptionSelected: {
    backgroundColor: "#FFF4E5",
  },
  reasonOptionText: {
    fontSize: 14,
    color: NAVY,
  },
  reasonOptionTextSelected: {
    color: "#B35A00",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginTop: 10,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#B00020",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
});
