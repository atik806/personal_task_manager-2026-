import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { fonts } from "../../lib/theme";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accentSoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Feather name={icon} size={24} color={colors.accent} />
      </View>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink, textAlign: "center" }}>
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.inkSecondary,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}
