import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image as RNImage,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get, onValue, off } from "firebase/database";
import Colors from "../constants/Colors";

const NAVY = "#1E3250";
const ORANGE = "#FFA500";
const IMAGE_FALLBACK_BG = "#F3F4F6";
const ACTIVITY_TYPES = ["Activity", "Food", "Bar", "Sightseeing", "Nightlife"];

const normalizeType = (rawType) => {
  if (!rawType || typeof rawType !== "string") return "Activity";
  const match = ACTIVITY_TYPES.find(
    (item) => item.toLowerCase() === rawType.trim().toLowerCase()
  );
  return match || "Activity";
};

const ActivitiesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [activities, setActivities] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const auth = getAuth();
      const user = auth.currentUser;
      const db = getDatabase();

      let activitiesRef = null;
      let cancelled = false;

      const fetchData = async () => {
        if (!user) {
          if (cancelled) return;
          setCurrentGroup(null);
          setActivities([]);
          setLoading(false);
          return;
        }

        setLoading(true);

        try {
          const userRef = ref(db, "users/" + user.uid);
          const userSnap = await get(userRef);
          if (!userSnap.exists()) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          const userData = userSnap.val();
          const currentGroupId = userData.currentGroupId;
          if (!currentGroupId) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          const groupRef = ref(db, "groups/" + currentGroupId);
          const groupSnap = await get(groupRef);
          if (!groupSnap.exists()) {
            if (cancelled) return;
            setCurrentGroup(null);
            setActivities([]);
            setLoading(false);
            return;
          }

          if (cancelled) return;
          setCurrentGroup({
            id: currentGroupId,
            ...groupSnap.val(),
          });

          activitiesRef = ref(db, `groupSchedules/${currentGroupId}`);
          onValue(activitiesRef, async (snapshot) => {
            if (cancelled) return;

            const scheduleData = snapshot.val();
            if (!scheduleData) {
              setActivities([]);
              setLoading(false);
              return;
            }

            try {
              const events = Object.keys(scheduleData)
                .map((eventId) => ({
                  id: eventId,
                  ...scheduleData[eventId],
                }))
                .sort((a, b) => (a.startAt || 0) - (b.startAt || 0));

              const activitiesArray = [];

              for (const event of events) {
                const { locationId, destinationKey, startAt } = event;
                if (!locationId || !destinationKey) continue;

                const locationRef = ref(
                  db,
                  `locations/${destinationKey}/${locationId}`
                );
                const locationSnap = await get(locationRef);

                if (!locationSnap.exists()) {
                  activitiesArray.push({
                    id: event.id,
                    title: "⚠ Deleted location",
                    description: "This location no longer exists.",
                    address: "",
                    type: "Activity",
                    imageUrl: "",
                    latlng: null,
                    startAt,
                  });
                  continue;
                }

                const location = locationSnap.val();
                activitiesArray.push({
                  id: event.id,
                  title: location.title || "Hotspot activity",
                  description: location.description || "",
                  address: location.address || "",
                  imageUrl: location.imageUrl || "",
                  type: normalizeType(location.type),
                  latlng:
                    location.lat && location.lng
                      ? {
                          latitude: Number(location.lat),
                          longitude: Number(location.lng),
                        }
                      : null,
                  startAt,
                });
              }

              setActivities(activitiesArray);
            } catch (err) {
              console.log("Schedule load error:", err);
              setActivities([]);
            }

            setLoading(false);
          });
        } catch (error) {
          console.log("ActivitiesScreen error:", error);
          if (!cancelled) setLoading(false);
        }
      };

      fetchData();

      return () => {
        cancelled = true;
        if (activitiesRef) off(activitiesRef);
      };
    }, [])
  );

  const handleGoToProfile = () => {
    navigation.navigate("Profile");
  };

  const handleViewOnMap = (activity) => {
    navigation.navigate("Map", {
      focusMarker: {
        markerId: activity.id,
        latlng: activity.latlng,
      },
    });
  };

  const handleViewDetails = (activity) => {
    navigation.navigate("View_marker", { marker: activity });
  };

  useEffect(() => {
    const urls = [
      ...new Set(
        activities
      .map((a) => a.imageUrl)
      .filter((u) => typeof u === "string" && u.startsWith("http"))
      ),
    ].slice(0, 20);
    if (urls.length) {
      ExpoImage.prefetch(urls).catch(() => {});
    }
  }, [activities]);

  return (
    <View style={styles.screen}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLogo}>
          <RNImage
            source={require("../assets/hotspotflame.png")}
            style={styles.headerLogoImage}
          />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.contentWrapper}>
        {currentGroup ? (
          <View style={styles.tripCard}>
            <Text style={styles.tripLabel}>Current trip</Text>
            <Text style={styles.tripTitle}>{currentGroup.name || "Your Hotspot trip"}</Text>

            <Text style={styles.tripMeta}>
              {currentGroup.startDate && currentGroup.endDate
                ? `${currentGroup.startDate} – ${currentGroup.endDate}${
                    currentGroup.city ? ` · ${currentGroup.city}` : ""
                  }`
                : currentGroup.city
                  ? currentGroup.city
                  : "Trip dates will be added later"}
            </Text>

            <TouchableOpacity
              style={styles.tripButton}
              onPress={() =>
                Alert.alert("Coming soon", "Trip details will be added later.")
              }
            >
              <Text style={styles.tripButtonText}>View trip details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active trip</Text>
            <Text style={styles.emptyText}>
              You are currently not part of a Hotspot group. Join a trip from your
              profile page to see your activity schedule here.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGoToProfile}>
              <Text style={styles.primaryButtonText}>Go to profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentGroup && (
          <>
            {loading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Loading activities...</Text>
                <Text style={styles.emptyText}>
                  Please wait while we load your trip schedule.
                </Text>
                <View style={styles.skeletonList}>
                  <ActivitySkeletonCard />
                  <ActivitySkeletonCard />
                </View>
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No activities yet</Text>
                <Text style={styles.emptyText}>
                  Your trip does not have any activities loaded yet. Ask your trip
                  host to add the schedule in Hotspot Travels.
                </Text>
              </View>
            ) : (
              <View style={styles.activitiesList}>
                <Text style={styles.sectionTitle}>Your activities</Text>

                {activities.map((activity) => {
                  const title = activity.title || "Hotspot activity";
                  const typeLabel = normalizeType(activity.type);
                  const address = activity.address || "Location to be announced";
                  const description =
                    activity.description || "Details will be added later";
                  const imageUrl = activity.imageUrl || "";

                  return (
                    <View key={activity.id} style={styles.activityCard}>
                      <View style={styles.activityImagePlaceholder}>
                        {imageUrl ? (
                          <ExpoImage
                            source={imageUrl}
                            style={styles.activityImage}
                            contentFit="cover"
                            transition={180}
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <Text style={styles.activityImagePlaceholderText}>Activity</Text>
                        )}
                      </View>

                      <View style={styles.activityContent}>
                        <Text style={styles.activityDay}>{typeLabel}</Text>
                        <Text style={styles.activityTitle}>{title}</Text>
                        <Text style={styles.activityLocation}>{address}</Text>
                        <Text style={styles.activityType}>{description}</Text>

                        <View style={styles.activityButtonsRow}>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => handleViewOnMap(activity)}
                          >
                            <Text style={styles.secondaryButtonText}>View on map</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleViewDetails(activity)}
                          >
                            <Text style={styles.primaryButtonText}>Details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const ActivitySkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonBody}>
      <View style={[styles.skeletonLine, { width: "38%" }]} />
      <View style={[styles.skeletonLine, { width: "64%", height: 12 }]} />
      <View style={[styles.skeletonLine, { width: "82%" }]} />
      <View style={[styles.skeletonLine, { width: "70%" }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingBottom: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  headerLogo: {
    alignItems: "center",
  },
  headerLogoImage: {
    width: 52,
    height: 52,
    resizeMode: "contain",
  },
  scroll: {
    flex: 1,
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tripLabel: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: NAVY,
    marginTop: 4,
  },
  tripMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  tripButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tripButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NAVY,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
    marginBottom: 14,
  },
  activitiesList: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: NAVY,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    flexDirection: "row",
  },
  activityImagePlaceholder: {
    width: 96,
    height: 108,
    flexShrink: 0,
    backgroundColor: IMAGE_FALLBACK_BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  activityImage: {
    ...StyleSheet.absoluteFillObject,
  },
  activityImagePlaceholderText: {
    fontSize: 11,
    color: "#8B94A3",
    fontWeight: "600",
  },
  activityContent: {
    flex: 1,
    padding: 12,
  },
  activityDay: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: NAVY,
    marginTop: 2,
  },
  activityLocation: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  activityType: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  activityButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  secondaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F4F4F4",
    marginTop: 6,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: NAVY,
    fontWeight: "500",
  },
  primaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: ORANGE,
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  skeletonList: {
    marginTop: 10,
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    overflow: "hidden",
    flexDirection: "row",
  },
  skeletonImage: {
    width: 96,
    height: 108,
    backgroundColor: IMAGE_FALLBACK_BG,
  },
  skeletonBody: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
});

export default ActivitiesScreen;
