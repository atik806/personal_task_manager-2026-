import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function tapHaptic(): void {
  if (Platform.OS === "web") return;
  try {
    Haptics.selectionAsync();
  } catch {
    // ignore — simulators and unsupported platforms can throw
  }
}

export function completeHaptic(): void {
  if (Platform.OS === "web") return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore — simulators and unsupported platforms can throw
  }
}

export function deleteHaptic(): void {
  if (Platform.OS === "web") return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // ignore — simulators and unsupported platforms can throw
  }
}
