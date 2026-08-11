import React, { useState } from "react";
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
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

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
        placeholderTextColor={colors.inkMuted}
        selectionColor={colors.accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.accent : colors.line,
          backgroundColor: colors.fieldBg,
          paddingHorizontal: 12,
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: 15,
          ...(focused && !error
            ? {
                shadowColor: colors.accent,
                shadowOpacity: 0.18,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
                elevation: 2,
              }
            : {}),
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
