import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, ref, get, update } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const GOOGLE_GEOCODING_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY || "";
const NAVY = "#1E3250";
const ORANGE = "#FFA500";
const PLACEHOLDER = "#6B7280";
const LOCATION_TYPES = [
  "Activity",
  "Food",
  "Bar",
  "Sightseeing",
  "Nightlife",
];

export default function AdminManageDestinations({ navigation }) {
  const insets = useSafeAreaInsets();
  const db = getDatabase();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestinationKey, setSelectedDestinationKey] = useState("");

  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locations, setLocations] = useState([]);

  const [editingDestinationKey, setEditingDestinationKey] = useState("");
  const [destinationDraft, setDestinationDraft] = useState({
    name: "",
    country: "",
  });

  const [editingLocationId, setEditingLocationId] = useState("");
  const [locationDraft, setLocationDraft] = useState({
    title: "",
    address: "",
    description: "",
    imageUrl: "",
    type: "Activity",
    lat: null,
    lng: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSort, setLocationSort] = useState("az"); // "az" | "newest"
  const [toastMessage, setToastMessage] = useState("");

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.key === selectedDestinationKey) || null,
    [destinations, selectedDestinationKey]
  );

  const requireAdmin = useCallback(async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return false;
    const token = await getIdTokenResult(user, true);
    return token?.claims?.admin === true;
  }, []);

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
    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) throw new Error("No geocoding result found.");
    return {
      lat: loc.lat,
      lng: loc.lng,
    };
  };

  const loadDestinations = useCallback(async () => {
    try {
      setLoadingDestinations(true);
      const snap = await get(ref(db, "destinations"));
      if (!snap.exists()) {
        setDestinations([]);
        setSelectedDestinationKey("");
        return;
      }

      const data = snap.val();
      const list = Object.keys(data).map((key) => ({
        key,
        name: data[key]?.name || key,
        country: data[key]?.country || "",
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setDestinations(list);
      setSelectedDestinationKey((prev) =>
        prev && list.some((d) => d.key === prev) ? prev : list[0]?.key || ""
      );
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not load destinations.");
    } finally {
      setLoadingDestinations(false);
    }
  }, [db]);

  const loadLocations = useCallback(
    async (destinationKey) => {
      if (!destinationKey) {
        setLocations([]);
        return;
      }
      try {
        setLoadingLocations(true);
        const snap = await get(ref(db, `locations/${destinationKey}`));
        if (!snap.exists()) {
          setLocations([]);
          return;
        }
        const data = snap.val();
        const list = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        setLocations(list);
      } catch (e) {
        Alert.alert("Error", e?.message || "Could not load locations.");
      } finally {
        setLoadingLocations(false);
      }
    },
    [db]
  );

  const buildScheduleCleanupUpdates = async ({
    destinationKey,
    locationId = null,
  }) => {
    const updates = {};
    let affectedEvents = 0;
    const scheduleSnap = await get(ref(db, "groupSchedules"));
    if (!scheduleSnap.exists()) return { updates, affectedEvents };

    const scheduleData = scheduleSnap.val();
    for (const groupId of Object.keys(scheduleData || {})) {
      const events = scheduleData[groupId] || {};
      for (const eventId of Object.keys(events)) {
        const event = events[eventId] || {};
        const destinationMatch = event.destinationKey === destinationKey;
        const locationMatch = locationId ? event.locationId === locationId : true;
        if (destinationMatch && locationMatch) {
          updates[`groupSchedules/${groupId}/${eventId}`] = null;
          affectedEvents += 1;
        }
      }
    }
    return { updates, affectedEvents };
  };

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? "" : current));
    }, 2200);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setCheckingAdmin(true);
        const ok = await requireAdmin();
        setIsAdmin(ok);
        if (ok) {
          await loadDestinations();
        }
      } catch (_e) {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    bootstrap();
  }, [requireAdmin, loadDestinations]);

  useEffect(() => {
    if (isAdmin) {
      loadLocations(selectedDestinationKey);
    }
  }, [isAdmin, selectedDestinationKey, loadLocations]);

  const filteredSortedLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    let list = locations;
    if (q) {
      list = list.filter((loc) => {
        const text = `${loc.title || ""} ${loc.address || ""} ${loc.type || ""}`.toLowerCase();
        return text.includes(q);
      });
    }
    const sorted = [...list];
    if (locationSort === "newest") {
      sorted.sort(
        (a, b) =>
          Number(b.updatedAt || b.createdAt || 0) -
          Number(a.updatedAt || a.createdAt || 0)
      );
    } else {
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    return sorted;
  }, [locations, locationSearch, locationSort]);

  const startEditDestination = (destination) => {
    setEditingDestinationKey(destination.key);
    setDestinationDraft({
      name: destination.name || "",
      country: destination.country || "",
    });
  };

  const cancelEditDestination = () => {
    setEditingDestinationKey("");
    setDestinationDraft({ name: "", country: "" });
  };

  const handleSaveDestination = async (destinationKey) => {
    if (!(await requireAdmin())) return;
    const name = destinationDraft.name.trim();
    const country = destinationDraft.country.trim();
    if (name.length < 2 || country.length < 2) {
      Alert.alert("Validation", "Name and country must be at least 2 characters.");
      return;
    }
    try {
      await update(ref(db, `destinations/${destinationKey}`), {
        name,
        country,
      });
      cancelEditDestination();
      await loadDestinations();
      showToast("Destination updated");
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not update destination.");
    }
  };

  const handleDeleteDestination = async (destinationKey) => {
    if (!(await requireAdmin())) return;
    const locationSnap = await get(ref(db, `locations/${destinationKey}`));
    const locationCount = locationSnap.exists()
      ? Object.keys(locationSnap.val() || {}).length
      : 0;
    const { affectedEvents } = await buildScheduleCleanupUpdates({
      destinationKey,
    });
    Alert.alert(
      "Delete destination",
      `This will delete destination, ${locationCount} location(s), and ${affectedEvents} scheduled event(s). Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updates = {
                [`destinations/${destinationKey}`]: null,
                [`locations/${destinationKey}`]: null,
              };
              const { updates: scheduleCleanup, affectedEvents: deletedEvents } =
                await buildScheduleCleanupUpdates({
                destinationKey,
              });
              await update(ref(db), { ...updates, ...scheduleCleanup });
              if (selectedDestinationKey === destinationKey) {
                setEditingLocationId("");
              }
              await loadDestinations();
              showToast(
                `Deleted destination (${locationCount} locations, ${deletedEvents} schedule events)`
              );
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not delete destination.");
            }
          },
        },
      ]
    );
  };

  const startEditLocation = (location) => {
    setEditingLocationId(location.id);
    setLocationDraft({
      title: location.title || "",
      address: location.address || "",
      description: location.description || "",
      imageUrl: location.imageUrl || "",
      type: LOCATION_TYPES.includes(location.type) ? location.type : "Activity",
      lat: Number.isFinite(Number(location.lat)) ? Number(location.lat) : null,
      lng: Number.isFinite(Number(location.lng)) ? Number(location.lng) : null,
    });
  };

  const cancelEditLocation = () => {
    setEditingLocationId("");
    setLocationDraft({
      title: "",
      address: "",
      description: "",
      imageUrl: "",
      type: "Activity",
      lat: null,
      lng: null,
    });
  };

  const handlePickLocationImage = async () => {
    if (!(await requireAdmin())) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need photo access to upload image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setUploadingImage(true);
      const auth = getAuth();
      const uid = auth.currentUser?.uid || "admin";
      const storage = getStorage();
      const ext =
        (asset?.fileName?.split(".").pop() || "jpg").toLowerCase();
      const path = `locationImages/${selectedDestinationKey || "unknown"}/${uid}/${Date.now()}.${ext}`;
      const fileRef = storageRef(storage, path);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      setLocationDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveLocation = async (locationId) => {
    if (!(await requireAdmin())) return;
    if (!selectedDestination || !locationId) return;

    const title = locationDraft.title.trim();
    const address = locationDraft.address.trim();
    if (title.length < 2 || address.length < 2) {
      Alert.alert("Validation", "Title and address are required.");
      return;
    }
    try {
      const fullAddress =
        `${address}, ${selectedDestination.name}, ${selectedDestination.country}`;
      const coords = await geocodeAddress(fullAddress);

      await update(ref(db, `locations/${selectedDestinationKey}/${locationId}`), {
        title,
        address,
        description: locationDraft.description.trim(),
        imageUrl: locationDraft.imageUrl || "",
        type: locationDraft.type || "Activity",
        lat: coords.lat,
        lng: coords.lng,
        updatedAt: Date.now(),
      });
      cancelEditLocation();
      await loadLocations(selectedDestinationKey);
      showToast("Location updated");
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not update location.");
    }
  };

  const handleDuplicateLocation = async (location) => {
    if (!(await requireAdmin())) return;
    if (!selectedDestinationKey || !location?.id) return;
    try {
      const newId = ref(db, `locations/${selectedDestinationKey}`).push().key;
      if (!newId) throw new Error("Could not create duplicate id.");

      const baseTitle = location.title || "Location";
      const copy = {
        ...location,
        title: `${baseTitle} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      delete copy.id;
      await update(ref(db), {
        [`locations/${selectedDestinationKey}/${newId}`]: copy,
      });
      await loadLocations(selectedDestinationKey);
      showToast("Location duplicated");
    } catch (e) {
      Alert.alert("Error", e?.message || "Could not duplicate location.");
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!(await requireAdmin())) return;
    if (!selectedDestinationKey || !locationId) return;
    const location = locations.find((l) => l.id === locationId);
    const { affectedEvents } = await buildScheduleCleanupUpdates({
      destinationKey: selectedDestinationKey,
      locationId,
    });

    Alert.alert(
      "Delete location",
      `Delete "${location?.title || "location"}"? This will also remove ${affectedEvents} scheduled event(s).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { updates: scheduleCleanup, affectedEvents } =
                await buildScheduleCleanupUpdates({
                destinationKey: selectedDestinationKey,
                locationId,
              });
              await update(ref(db), {
                [`locations/${selectedDestinationKey}/${locationId}`]: null,
                ...scheduleCleanup,
              });
              if (editingLocationId === locationId) cancelEditLocation();
              await loadLocations(selectedDestinationKey);
              showToast(
                `Location deleted (${affectedEvents} schedule events removed)`
              );
            } catch (e) {
              Alert.alert("Error", e?.message || "Could not delete location.");
            }
          },
        },
      ]
    );
  };

  if (checkingAdmin) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.noAccessTitle}>No access</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {!!toastMessage && (
        <View style={[styles.toast, { top: insets.top + 8 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Destinations</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destinations</Text>
          {loadingDestinations ? (
            <ActivityIndicator color={ORANGE} />
          ) : destinations.length === 0 ? (
            <Text style={styles.muted}>No destinations created yet.</Text>
          ) : (
            destinations.map((destination) => {
              const editing = editingDestinationKey === destination.key;
              return (
                <View key={destination.key} style={styles.itemCard}>
                  {editing ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Destination name"
                        placeholderTextColor={PLACEHOLDER}
                        value={destinationDraft.name}
                        onChangeText={(v) =>
                          setDestinationDraft((prev) => ({ ...prev, name: v }))
                        }
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Country"
                        placeholderTextColor={PLACEHOLDER}
                        value={destinationDraft.country}
                        onChangeText={(v) =>
                          setDestinationDraft((prev) => ({
                            ...prev,
                            country: v,
                          }))
                        }
                      />
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={styles.primaryHalfButton}
                          onPress={() => handleSaveDestination(destination.key)}
                        >
                          <Text style={styles.primaryButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryHalfButton}
                          onPress={cancelEditDestination}
                        >
                          <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => setSelectedDestinationKey(destination.key)}
                      >
                        <Text style={styles.itemTitle}>
                          {destination.name}
                          {destination.country ? `, ${destination.country}` : ""}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.itemMeta}>Key: {destination.key}</Text>
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={styles.secondaryHalfButton}
                          onPress={() => startEditDestination(destination)}
                        >
                          <Text style={styles.secondaryButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dangerHalfButton}
                          onPress={() => handleDeleteDestination(destination.key)}
                        >
                          <Text style={styles.dangerText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Locations{selectedDestination ? ` · ${selectedDestination.name}` : ""}
          </Text>
          <Text style={styles.label}>Select destination</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationPickerRow}
          >
            {destinations.map((destination) => {
              const isSelected = destination.key === selectedDestinationKey;
              return (
                <TouchableOpacity
                  key={destination.key}
                  style={[
                    styles.destinationChip,
                    isSelected && styles.destinationChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedDestinationKey(destination.key);
                    cancelEditLocation();
                  }}
                >
                  <Text
                    style={[
                      styles.destinationChipText,
                      isSelected && styles.destinationChipTextSelected,
                    ]}
                  >
                    {destination.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!selectedDestinationKey ? (
            <Text style={styles.muted}>Select a destination above.</Text>
          ) : loadingLocations ? (
            <ActivityIndicator color={ORANGE} />
          ) : locations.length === 0 ? (
            <Text style={styles.muted}>
              No locations for {selectedDestination?.name || "this destination"} yet.
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search locations"
                placeholderTextColor={PLACEHOLDER}
                value={locationSearch}
                onChangeText={setLocationSearch}
              />
              <View style={styles.sortRow}>
                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    locationSort === "az" && styles.sortChipSelected,
                  ]}
                  onPress={() => setLocationSort("az")}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      locationSort === "az" && styles.sortChipTextSelected,
                    ]}
                  >
                    A-Z
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortChip,
                    locationSort === "newest" && styles.sortChipSelected,
                  ]}
                  onPress={() => setLocationSort("newest")}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      locationSort === "newest" && styles.sortChipTextSelected,
                    ]}
                  >
                    Newest
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredSortedLocations.length === 0 ? (
                <Text style={styles.muted}>No matching locations.</Text>
              ) : (
                filteredSortedLocations.map((location) => {
              const editing = editingLocationId === location.id;
              return (
                <View key={location.id} style={styles.itemCard}>
                  {editing ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Location title"
                        placeholderTextColor={PLACEHOLDER}
                        value={locationDraft.title}
                        onChangeText={(v) =>
                          setLocationDraft((prev) => ({ ...prev, title: v }))
                        }
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Address"
                        placeholderTextColor={PLACEHOLDER}
                        value={locationDraft.address}
                        onChangeText={(v) =>
                          setLocationDraft((prev) => ({ ...prev, address: v }))
                        }
                      />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Description"
                        placeholderTextColor={PLACEHOLDER}
                        multiline
                        value={locationDraft.description}
                        onChangeText={(v) =>
                          setLocationDraft((prev) => ({
                            ...prev,
                            description: v,
                          }))
                        }
                      />

                      <Text style={styles.label}>Category</Text>
                      <View style={styles.typeList}>
                        {LOCATION_TYPES.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.typeItem,
                              locationDraft.type === type &&
                                styles.typeItemSelected,
                            ]}
                            onPress={() =>
                              setLocationDraft((prev) => ({
                                ...prev,
                                type,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.typeText,
                                locationDraft.type === type &&
                                  styles.typeTextSelected,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.secondaryButton,
                          uploadingImage && styles.disabledButton,
                        ]}
                        onPress={handlePickLocationImage}
                        disabled={uploadingImage}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {uploadingImage ? "Uploading image..." : "Upload image"}
                        </Text>
                      </TouchableOpacity>
                      {!!locationDraft.imageUrl && (
                        <Image
                          source={{ uri: locationDraft.imageUrl }}
                          style={styles.previewImage}
                        />
                      )}

                      <View style={styles.row}>
                        <TouchableOpacity
                          style={styles.primaryHalfButton}
                          onPress={() => handleSaveLocation(location.id)}
                        >
                          <Text style={styles.primaryButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.secondaryHalfButton}
                          onPress={cancelEditLocation}
                        >
                          <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.itemTitle}>
                        {location.title || "Untitled location"}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {location.type || "Activity"} · {location.address || "No address"}
                      </Text>
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={styles.secondaryThirdButton}
                          onPress={() => startEditLocation(location)}
                        >
                          <Text style={styles.secondaryButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.tertiaryThirdButton}
                          onPress={() => handleDuplicateLocation(location)}
                        >
                          <Text style={styles.tertiaryButtonText}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dangerThirdButton}
                          onPress={() => handleDeleteLocation(location.id)}
                        >
                          <Text style={styles.dangerText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
                })
              )}
            </>
          )}
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
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    backgroundColor: "#fff",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 60,
    paddingVertical: 6,
  },
  backText: {
    color: NAVY,
    fontWeight: "600",
  },
  headerTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 20,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  muted: {
    color: "#666",
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  itemTitle: {
    color: NAVY,
    fontWeight: "700",
    fontSize: 15,
  },
  itemMeta: {
    color: "#666",
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
    color: NAVY,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  label: {
    color: "#666",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  primaryHalfButton: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryHalfButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  dangerHalfButton: {
    flex: 1,
    backgroundColor: "#FCE8E8",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: NAVY,
    fontWeight: "700",
  },
  dangerText: {
    color: "#B00020",
    fontWeight: "700",
  },
  tertiaryHalfButton: {
    flex: 1,
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryThirdButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  tertiaryThirdButton: {
    flex: 1,
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  dangerThirdButton: {
    flex: 1,
    backgroundColor: "#FCE8E8",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  tertiaryButtonText: {
    color: "#B35A00",
    fontWeight: "700",
  },
  noAccessTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "800",
  },
  typeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  typeItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  typeItemSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  typeText: {
    color: NAVY,
    fontSize: 13,
  },
  typeTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#E6E6E6",
  },
  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#F3F3F3",
  },
  destinationPickerRow: {
    paddingBottom: 10,
  },
  destinationChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  destinationChipSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  destinationChipText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "600",
  },
  destinationChipTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#fff",
  },
  sortChipSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  sortChipText: {
    color: NAVY,
    fontWeight: "600",
  },
  sortChipTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  toastText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});
