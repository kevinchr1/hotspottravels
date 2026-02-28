import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import DatePickerModal from "../components/DatePickerModal";
import { getDatabase, get, ref } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

const formatYMD = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function CreateGroupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const db = getDatabase();

  const [groupName, setGroupName] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [selectedDestinationKey, setSelectedDestinationKey] = useState("");
  const [showDestinationMenu, setShowDestinationMenu] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.key === selectedDestinationKey) || null,
    [destinations, selectedDestinationKey]
  );

  const validateDates = useMemo(() => {
    return new Date(endDate) >= new Date(startDate);
  }, [startDate, endDate]);

  const loadDestinations = useCallback(async () => {
    try {
      const snap = await get(ref(db, "destinations"));
      if (!snap.exists()) {
        setDestinations([]);
        setSelectedDestinationKey("");
        return;
      }

      const data = snap.val();
      const list = Object.keys(data).map((key) => ({
        key,
        name: data[key].name || key,
        country: data[key].country || "",
      }));

      list.sort((a, b) => a.name.localeCompare(b.name));
      setDestinations(list);
      setSelectedDestinationKey((prev) =>
        prev && list.some((d) => d.key === prev) ? prev : list[0].key
      );
    } catch (_e) {
      Alert.alert("Error", "Could not load destinations.");
    }
  }, [db]);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Missing name", "Please enter a group name.");
      return;
    }
    if (!selectedDestination) {
      Alert.alert(
        "Missing destination",
        "Please select a destination."
      );
      return;
    }

    if (!validateDates) {
      Alert.alert("Dates invalid", "End date must be after start date.");
      return;
    }

    try {
      setLoading(true);

      const functions = getFunctions(undefined, "europe-west1");
      const createGroup = httpsCallable(functions, "createGroup");

      const result = await createGroup({
        name: groupName.trim(),
        description: groupName.trim(),
        city: selectedDestination.name,
        startDate: formatYMD(startDate),
        endDate: formatYMD(endDate),
      });
      const { code } = result.data || {};
      if (!code) throw new Error("Missing join code from createGroup.");

      Alert.alert(
        "Group created",
        `Join code: ${code}`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (e) {
      console.log("Create group error:", e);
      Alert.alert("Error", e?.message || "Could not create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          borderBottomWidth: 2,
          borderBottomColor: ORANGE,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 70 }}
        >
          <Text style={{ color: NAVY, fontWeight: "600" }}>
            {"<"} Back
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontWeight: "800", fontSize: 20, color: NAVY }}>
            Create group
          </Text>
        </View>

        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 28,
        }}
      >
        {/* Basics */}
        <View style={cardStyle}>
          <Text style={titleStyle}>Basics</Text>

          <Text style={labelStyle}>Group name</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="E.g. Hotspot Krakow Feb"
            style={inputStyle}
          />

          <Text style={labelStyle}>Destination (city)</Text>
          <TouchableOpacity
            style={inputStyle}
            onPress={() =>
              setShowDestinationMenu((prev) => !prev)
            }
          >
            <Text style={{ fontWeight: "700", color: NAVY }}>
              {selectedDestination
                ? selectedDestination.country
                  ? `${selectedDestination.name}, ${selectedDestination.country}`
                  : selectedDestination.name
                : destinations.length
                  ? "Select destination"
                  : "No destinations found"}
            </Text>
          </TouchableOpacity>

          {showDestinationMenu && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#E6E6E6",
                borderRadius: 12,
                backgroundColor: "#fff",
                maxHeight: 220,
              }}
            >
              <ScrollView nestedScrollEnabled>
                {destinations.map((destination) => {
                  const isSelected =
                    destination.key === selectedDestinationKey;
                  return (
                    <TouchableOpacity
                      key={destination.key}
                      onPress={() => {
                        setSelectedDestinationKey(destination.key);
                        setShowDestinationMenu(false);
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: isSelected
                          ? "#FFF3DE"
                          : "#fff",
                        borderBottomWidth: 1,
                        borderBottomColor: "#F3F3F3",
                      }}
                    >
                      <Text
                        style={{
                          color: NAVY,
                          fontWeight: isSelected ? "800" : "600",
                        }}
                      >
                        {destination.country
                          ? `${destination.name}, ${destination.country}`
                          : destination.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={cardStyle}>
          <Text style={titleStyle}>Dates</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Start date</Text>
              <TouchableOpacity
                style={inputStyle}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={{ fontWeight: "700", color: NAVY }}>
                  {formatYMD(startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>End date</Text>
              <TouchableOpacity
                style={inputStyle}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={{ fontWeight: "700", color: NAVY }}>
                  {formatYMD(endDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!validateDates && (
            <Text style={{ marginTop: 8, color: "#B00020" }}>
              End date must be after start date.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: loading ? "#E6E6E6" : ORANGE,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
          disabled={loading}
          onPress={handleCreateGroup}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            {loading ? "Creating..." : "Create group"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartPicker}
        value={startDate}
        title="Start date"
        onClose={(date) => {
          setShowStartPicker(false);
          if (date) setStartDate(date);
        }}
      />

      <DatePickerModal
        visible={showEndPicker}
        value={endDate}
        title="End date"
        minimumDate={startDate}
        onClose={(date) => {
          setShowEndPicker(false);
          if (date) setEndDate(date);
        }}
      />
    </View>
  );
}

const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
};

const titleStyle = {
  fontSize: 18,
  fontWeight: "800",
  color: NAVY,
};

const labelStyle = {
  marginTop: 14,
  fontSize: 13,
  color: "#666",
};

const inputStyle = {
  marginTop: 8,
  borderWidth: 1,
  borderColor: "#E6E6E6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 14,
  backgroundColor: "#fff",
};
