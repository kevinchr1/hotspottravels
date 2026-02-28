import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";

export default function DatePickerModal({
  visible,
  value,
  mode = "date",
  title = "Select date",
  minimumDate,
  onClose,
}) {
  const [tempDate, setTempDate] = useState(value ?? new Date());

  useEffect(() => {
    if (visible) {
      setTempDate(value ?? new Date());
    }
  }, [visible, value]);

  const handleConfirmIOS = () => {
    onClose(tempDate);
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") {
      if (event?.type === "dismissed") {
        onClose(null);
        return;
      }
      onClose(selectedDate ?? null);
      return;
    }

    if (selectedDate) setTempDate(selectedDate);
  };

  if (Platform.OS !== "ios") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value ?? new Date()}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "flex-end",
        }}
        onPress={() => onClose(null)}
      >
        <Pressable
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 20,
          }}
          onPress={() => {}}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: "#EEE",
            }}
          >
            <Text style={{ fontWeight: "700", color: NAVY }}>
              {title}
            </Text>

            <TouchableOpacity onPress={handleConfirmIOS}>
              <Text style={{ fontWeight: "800", color: ORANGE }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            themeVariant="light"
            style={{ height: 216 }}
            onChange={handleChange}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}