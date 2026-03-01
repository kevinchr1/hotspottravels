import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, getIdTokenResult } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import DateTimePicker from "@react-native-community/datetimepicker";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function ManageGroupDetails({ navigation, route }) {
  const groupId = route?.params?.groupId;
  const functions = getFunctions(undefined, "europe-west1");

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [group, setGroup] = useState(null);
  const [events, setEvents] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [eventDurationHours, setEventDurationHours] = useState("2");

  useEffect(() => {
    let unsubscribeGroup = null;
    let unsubscribeSchedule = null;

    const init = async () => {
      try {
        if (!groupId) {
          setIsAdmin(false);
          return;
        }

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setIsAdmin(false);
          return;
        }

        const token = await getIdTokenResult(user, true);
        const hasAdmin = token?.claims?.admin === true;
        setIsAdmin(hasAdmin);
        if (!hasAdmin) return;

        const db = getDatabase();

        unsubscribeGroup = onValue(ref(db, `groups/${groupId}`), (snapshot) => {
          const data = snapshot.exists() ? snapshot.val() : null;
          setGroup(data);

          setName(data?.name || "");
          setDescription(data?.description || "");
          setStartDate(data?.startDate || "");
          setEndDate(data?.endDate || "");

          if (data?.city) {
            const cityKey = String(data.city).toLowerCase();
            onValue(
              ref(db, `locations/${cityKey}`),
              (locationsSnap) => {
                if (!locationsSnap.exists()) {
                  setAvailableLocations([]);
                  return;
                }
                const locationsData = locationsSnap.val();
                const list = Object.keys(locationsData).map((id) => ({
                  id,
                  ...locationsData[id],
                }));
                setAvailableLocations(list);
              },
              { onlyOnce: true }
            );
          } else {
            setAvailableLocations([]);
          }

          setLoading(false);
        });

        unsubscribeSchedule = onValue(
          ref(db, `groupSchedules/${groupId}`),
          (snapshot) => {
            if (!snapshot.exists()) {
              setEvents([]);
              return;
            }
            const data = snapshot.val();
            const list = Object.keys(data).map((eventId) => ({
              eventId,
              ...data[eventId],
            }));
            list.sort((a, b) => Number(a.startAt || 0) - Number(b.startAt || 0));
            setEvents(list);
          }
        );
      } catch (e) {
        console.log("ManageGroupDetails init error:", e);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (typeof unsubscribeGroup === "function") unsubscribeGroup();
      if (typeof unsubscribeSchedule === "function") unsubscribeSchedule();
    };
  }, [groupId]);

  const handleSaveChanges = async () => {
    if (!groupId) return;
    if (!name.trim()) {
      Alert.alert("Missing name", "Group name is required.");
      return;
    }

    try {
      setSaving(true);
      const updateGroupMetadata = httpsCallable(
        functions,
        "updateGroupMetadata"
      );

      await updateGroupMetadata({
        groupId,
        name: name.trim(),
        description: description || "",
        startDate,
        endDate,
      });
      Alert.alert("Success", "Group updated successfully");
    } catch (error) {
      console.log("Update group error:", error);
      Alert.alert("Error", error?.message || "Could not update group");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!groupId || !eventId) return;
    try {
      const deleteGroupEvent = httpsCallable(functions, "deleteGroupEvent");
      await deleteGroupEvent({
        groupId,
        eventId,
      });
    } catch (error) {
      console.log("Delete event error:", error);
      Alert.alert("Error", error?.message || "Could not delete event");
    }
  };

  const handleAddEvent = () => {
    setEventDate(new Date());
    setEventDurationHours("2");
    setEventModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedLocation) {
      Alert.alert("Select location");
      return;
    }
    const duration = Number(eventDurationHours);
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert("Invalid duration", "Please enter duration in hours.");
      return;
    }

    try {
      const addGroupEvent = httpsCallable(functions, "addGroupEvent");
      await addGroupEvent({
        groupId,
        locationId: selectedLocation.id,
        destinationKey: (group?.city || "").toLowerCase(),
        startAt: eventDate.getTime(),
      });

      setEventModalVisible(false);
      setSelectedLocation(null);
      setEventDurationHours("2");
    } catch (error) {
      console.log("Add event error:", error);
      Alert.alert("Error", error?.message || "Could not add event");
    }
  };

  if (!isAdmin && !loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>{"<"} Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Manage Group</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.stateWrap}>
          <View style={styles.card}>
            <Text style={styles.noAccessTitle}>No access</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Group</Text>
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
            <Text style={styles.muted}>Loading...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Group Info</Text>

              <Text style={styles.label}>Group name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Group name"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                multiline
              />

              <Text style={styles.label}>Start date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.label}>End date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.codeText}>
                Join code: {group?.code || "N/A"}
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.disabledButton]}
                onPress={handleSaveChanges}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save changes"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              {events.length === 0 ? (
                <Text style={styles.muted}>No events added yet.</Text>
              ) : (
                events.map((event) => (
                  <View key={event.eventId} style={styles.eventCard}>
                    <Text style={styles.eventDate}>
                      {new Date(Number(event.startAt || 0)).toLocaleString()}
                    </Text>
                    <Text style={styles.eventLocation}>
                      Location: {
                        availableLocations.find((loc) => loc.id === event.locationId)?.title ||
                        event.locationId ||
                        event.markerId ||
                        "TEMP"
                      }
                    </Text>
                    <Text style={styles.eventMeta}>
                      Duration: {
                        Number.isFinite(Number(event.durationHours))
                          ? `${Number(event.durationHours)}h`
                          : Number(event.endAt) > Number(event.startAt)
                            ? `${(
                                (Number(event.endAt) - Number(event.startAt)) /
                                (60 * 60 * 1000)
                              ).toFixed(1)}h`
                            : "N/A"
                      }
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(event.eventId)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAddEvent}
            >
              <Text style={styles.primaryButtonText}>Add event</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={eventModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Add Event</Text>

            <ScrollView style={styles.modalLocationList}>
              {availableLocations.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.locationItem,
                    selectedLocation?.id === loc.id && styles.locationSelected,
                  ]}
                  onPress={() => setSelectedLocation(loc)}
                >
                  <Text style={styles.locationTitle}>
                    {loc.title || "Untitled location"}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {loc.address || "No address"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={eventDate}
                mode="datetime"
                display="default"
                onChange={(_e, selected) => {
                  if (selected) setEventDate(selected);
                }}
              />
            </View>

            <Text style={styles.label}>Duration (hours)</Text>
            <TextInput
              style={styles.input}
              value={eventDurationHours}
              onChangeText={setEventDurationHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
            />

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalPrimaryButton]}
              onPress={handleSaveEvent}
            >
              <Text style={styles.primaryButtonText}>Save Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEventModalVisible(false);
                setSelectedLocation(null);
                setEventDurationHours("2");
              }}
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
    marginBottom: 12,
  },
  label: {
    color: "#666",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  codeText: {
    marginTop: 14,
    marginBottom: 12,
    color: "#777",
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#E6E6E6",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  muted: {
    color: "#666",
    fontSize: 14,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  eventDate: {
    color: NAVY,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventLocation: {
    color: "#555",
    marginBottom: 6,
  },
  eventMeta: {
    color: "#666",
    fontSize: 12,
    marginBottom: 10,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FCE8E8",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: "#B00020",
    fontWeight: "700",
    fontSize: 12,
  },
  stateWrap: {
    flex: 1,
    padding: 16,
  },
  noAccessTitle: {
    color: NAVY,
    fontWeight: "800",
    fontSize: 18,
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
  modalLocationList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  datePickerWrap: {
    marginBottom: 8,
  },
  locationItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 6,
  },
  locationSelected: {
    borderColor: ORANGE,
    backgroundColor: "#FFF4E5",
  },
  locationTitle: {
    fontWeight: "700",
    color: NAVY,
  },
  locationAddress: {
    fontSize: 12,
    color: "#666",
  },
  cancelButton: {
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#B00020",
    fontWeight: "700",
  },
  modalPrimaryButton: {
    marginTop: 10,
  },
});
