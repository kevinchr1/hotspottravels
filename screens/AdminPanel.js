import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getAuth, getIdTokenResult } from "firebase/auth";
import Colors from "../constants/Colors";
import { getFunctions, httpsCallable } from "firebase/functions";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function AdminPanel({ navigation }) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);

  // ----- Create group form state -----
  const [groupName, setGroupName] = useState("");
  const [city, setCity] = useState("Copenhagen");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("2026-02-01");
  const [endDate, setEndDate] = useState("2026-02-02");

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // { groupId, code }

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

  // ----- CALLABLE: createGroup -----
  const handleCreateGroup = async () => {
    try {
      if (!groupName.trim()) {
        Alert.alert("Missing", "Please enter a group name.");
        return;
      }
      if (!city.trim()) {
        Alert.alert("Missing", "Please enter a city key (e.g. Copenhagen / KRAKOW).");
        return;
      }
      if (!startDate.trim() || !endDate.trim()) {
        Alert.alert("Missing", "Please enter start and end date (YYYY-MM-DD).");
        return;
      }

      setCreating(true);
      setCreated(null);

      // region skal matche din deploy (du har europe-west1)
      const functions = getFunctions(undefined, "europe-west1");
      const createGroup = httpsCallable(functions, "createGroup");

      const payload = {
        name: groupName.trim(),
        city: city.trim(),
        description: description.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      };

      const res = await createGroup(payload);
      const data = res.data;

      // forventer { groupId, code }
      if (!data?.groupId || !data?.code) {
        console.log("Unexpected createGroup response:", data);
        Alert.alert("Error", "createGroup returned unexpected response.");
        return;
      }

      setCreated(data);

      Alert.alert("Created", `Group created.\nCode: ${data.code}`);
    } catch (e) {
      console.log("createGroup error:", e);

      // Firebase callable errors kan ligge i e.details / e.message
      Alert.alert("Error", e?.message || "Could not create group");
    } finally {
      setCreating(false);
    }
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
  
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Admin panel</Text>
            <Text style={styles.sub}>
              {checking ? "Checking admin access..." : "You have admin access."}
            </Text>
          </View>
  
          {/* CREATE */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Create</Text>
  
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("AdminCreateGroup")}
            >
              <Text style={styles.primaryButtonText}>Create group</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("AdminDestinations")}
            >
              <Text style={styles.secondaryButtonText}>Create destinations / locations</Text>
            </TouchableOpacity>
          </View>
  
          {/* MANAGE */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage</Text>
  
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("AdminManageGroups")}
            >
              <Text style={styles.secondaryButtonText}>Manage groups</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("AdminManageDestinations")}
            >
              <Text style={styles.secondaryButtonText}>Manage destinations / locations</Text>
            </TouchableOpacity>
          </View>
  
         
        </View>
      </ScrollView>
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
    marginTop: 10,
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

  // små ekstra styles (uden at ændre dit look)
  input: {
    height: 44,
    borderColor: "#E5E5E5",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    marginTop: 6,
    marginBottom: 6,
    color: NAVY,
  },
  resultBox: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  resultTitle: { fontSize: 13, fontWeight: "700", color: NAVY, marginBottom: 4 },
  resultText: { fontSize: 12, color: "#555", marginTop: 2 },
});