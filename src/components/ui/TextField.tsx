import React from "react";
import { Text, TextInput, View, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "../../hooks/use-theme";
import { fonts } from "../../lib/theme";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string | null;
  hint?: string;
  inputStyle?: TextStyle;
  /** Layout style for the wrapping container. */
  style?: ViewStyle;
}

export function TextField({ label, error, hint, inputStyle, style, ...inputProps }: TextFieldProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text
          style={{
            fontFamily: fonts.bodyMedium,
            fontSize: 13,
            color: colors.inkSecondary,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={isDark ? "#5A5F6E" : "#9BA0B0"}
        selectionColor={colors.accent}
        style={{
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.line,
          backgroundColor: isDark ? "#14161C" : "#F6F7FB",
          paddingHorizontal: 12,
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: 15,
          ...inputStyle,
        }}
        {...inputProps}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.danger }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSecondary }}>{hint}</Text>
      ) : null}
    </View>
  );
}
