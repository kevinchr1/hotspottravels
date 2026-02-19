import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getAuth, getIdTokenResult } from "firebase/auth";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function AdminPanel({ navigation }) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);

  const checkAdmin = useCallback(async () => {
    try {
      setChecking(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Not logged in", "You need to be logged in.");
        navigation.goBack();
        return;
      }

      // Force refresh så vi altid får nyeste claims
      const token = await getIdTokenResult(user, true);
      const isAdmin = token?.claims?.admin === true;

      if (!isAdmin) {
        Alert.alert("No access", "This page is only for admins.");
        navigation.goBack();
        return;
      }
    } catch (e) {
      console.log("AdminPanel admin check error:", e);
      Alert.alert("Error", "Could not verify admin access.");
      navigation.goBack();
    } finally {
      setChecking(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      checkAdmin();
    }, [checkAdmin])
  );

  const comingSoon = (title) => {
    Alert.alert("Coming soon", `${title} will be wired to Cloud Functions next.`);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image source={require("../assets/hotspotflame.png")} style={styles.headerLogoImage} />
        </View>

        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Admin panel</Text>
          <Text style={styles.sub}>
            {checking ? "Checking admin access..." : "You have admin access."}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => comingSoon("Create group")}>
            <Text style={styles.primaryButtonText}>Create group</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => comingSoon("Create destination/city")}>
            <Text style={styles.secondaryButtonText}>Create destination</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => comingSoon("Create marker/location")}>
            <Text style={styles.secondaryButtonText}>Create location (marker)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage</Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => comingSoon("Edit groups")}>
            <Text style={styles.secondaryButtonText}>Manage groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => comingSoon("Manage destinations")}>
            <Text style={styles.secondaryButtonText}>Manage destinations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => comingSoon("Manage locations")}>
            <Text style={styles.secondaryButtonText}>Manage locations</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Next step: we wire “Create group” to a Cloud Function, and lock database writes down in rules.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.primary },
  headerContainer: {
    backgroundColor: "#fff",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backBtn: { width: 60, paddingVertical: 6 },
  backText: { color: NAVY, fontSize: 14, fontWeight: "600" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerLogoImage: { width: 44, height: 44, resizeMode: "contain" },

  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: "700", color: NAVY },
  sub: { marginTop: 6, fontSize: 13, color: "#666", lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: NAVY, marginBottom: 10 },

  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  secondaryButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButtonText: { color: NAVY, fontWeight: "600", fontSize: 13 },

  footnote: { fontSize: 11, color: "#777", lineHeight: 16, marginTop: 6, paddingHorizontal: 4 },
});