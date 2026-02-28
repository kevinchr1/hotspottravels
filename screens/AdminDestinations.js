import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, ref, get, set, push } from "firebase/database";

const GOOGLE_GEOCODING_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY || "";
const NAVY = "#1E3250";
const ORANGE = "#FFA500";

const slugifyKey = (name) =>
  (name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

export default function AdminDestinations() {
  const insets = useSafeAreaInsets();
  const db = getDatabase();

  const [destinations, setDestinations] = useState([]);

  // Create destination
  const [newDestination, setNewDestination] = useState("");
  const [newCountry, setNewCountry] = useState("");

  // Create location
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [locationTitle, setLocationTitle] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationDescription, setLocationDescription] = useState("");

  const canCreateDestination = useMemo(
    () =>
      newDestination.trim().length > 1 &&
      newCountry.trim().length > 1,
    [newDestination, newCountry]
  );

  const canCreateLocation = useMemo(
    () =>
      selectedDestination &&
      locationTitle.trim().length > 1 &&
      locationAddress.trim().length > 1,
    [selectedDestination, locationTitle, locationAddress]
  );

  const requireAdmin = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return false;
    const token = await getIdTokenResult(user, true);
    return token?.claims?.admin === true;
  };

  const geocodeAddress = async (fullAddress) => {
    if (!GOOGLE_GEOCODING_KEY) {
      throw new Error("Missing EXPO_PUBLIC_GOOGLE_GEOCODING_KEY");
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        fullAddress
      )}&key=${GOOGLE_GEOCODING_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error("Geocoding failed: " + data.status);
    }

    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  };

  const loadDestinations = useCallback(async () => {
    try {
      const snap = await get(ref(db, "destinations"));
      if (!snap.exists()) {
        setDestinations([]);
        return;
      }

      const data = snap.val();
      const list = Object.keys(data).map((key) => ({
        key,
        name: data[key].name,
        country: data[key].country || "",
      }));

      list.sort((a, b) => a.name.localeCompare(b.name));
      setDestinations(list);
    } catch (e) {
      console.log("Load destinations error:", e);
      Alert.alert("Error", "Could not load destinations.");
    }
  }, [db]);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const handleCreateDestination = async () => {
    if (!(await requireAdmin())) return;

    const name = newDestination.trim();
    const key = slugifyKey(name);

    try {
      const existing = await get(ref(db, `destinations/${key}`));
      if (existing.exists()) {
        Alert.alert("Already exists", "Destination already exists.");
        return;
      }

      await set(ref(db, `destinations/${key}`), {
        name,
        country: newCountry.trim(),
        key,
        createdAt: Date.now(),
      });

      setNewDestination("");
      setNewCountry("");
      await loadDestinations();
      Alert.alert("Created", "Destination created.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCreateLocation = async () => {
    if (!(await requireAdmin())) return;

    try {
      const destination = destinations.find(
        (d) => d.key === selectedDestination
      );
      if (!destination) {
        Alert.alert("Error", "Select a destination first.");
        return;
      }
      if (!locationAddress.trim()) {
        Alert.alert("Error", "Address is required for geocoding.");
        return;
      }
      if (!destination.country?.trim()) {
        Alert.alert(
          "Error",
          "Selected destination is missing country."
        );
        return;
      }

      const fullAddress =
        `${locationAddress.trim()}, ` +
        `${destination.name}, ` +
        `${destination.country}`;
      const coords = await geocodeAddress(fullAddress);
      console.log("Geocoded:", coords);

      const listRef = ref(db, `locations/${selectedDestination}`);
      const newRef = push(listRef);

      await set(newRef, {
        title: locationTitle.trim(),
        address: locationAddress.trim() || "",
        description: locationDescription.trim() || "",
        lat: coords.lat,
        lng: coords.lng,
        createdAt: Date.now(),
      });

      setLocationTitle("");
      setLocationAddress("");
      setLocationDescription("");

      Alert.alert("Created", "Location created.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Create Destination & Location</Text>

        {/* Create Destination */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Destination</Text>

          <TextInput
            style={styles.input}
            placeholder="Barcelona"
            value={newDestination}
            onChangeText={setNewDestination}
          />

          <TextInput
            style={styles.input}
            placeholder="Country (e.g. Spain)"
            value={newCountry}
            onChangeText={setNewCountry}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canCreateDestination && styles.disabledButton,
            ]}
            disabled={!canCreateDestination}
            onPress={handleCreateDestination}
          >
            <Text style={styles.primaryButtonText}>
              Create Destination
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Location</Text>

          <Text style={styles.label}>Select Destination</Text>
          <View style={styles.destinationList}>
            {destinations.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.destinationItem,
                  selectedDestination === d.key &&
                    styles.destinationItemSelected,
                ]}
                onPress={() => setSelectedDestination(d.key)}
              >
                <Text
                  style={[
                    styles.destinationText,
                    selectedDestination === d.key &&
                      styles.destinationTextSelected,
                  ]}
                >
                  {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Location title"
            value={locationTitle}
            onChangeText={setLocationTitle}
          />

          <TextInput
            style={styles.input}
            placeholder="Address"
            value={locationAddress}
            onChangeText={setLocationAddress}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            multiline
            value={locationDescription}
            onChangeText={setLocationDescription}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canCreateLocation && styles.disabledButton,
            ]}
            disabled={!canCreateLocation}
            onPress={handleCreateLocation}
          >
            <Text style={styles.primaryButtonText}>
              Create Location
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    backgroundColor: "#E6E6E6",
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    color: "#666",
  },
  destinationList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  destinationItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
    marginBottom: 8,
  },
  destinationItemSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  destinationText: {
    fontSize: 13,
    color: NAVY,
  },
  destinationTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
});
