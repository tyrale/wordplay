import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * ActionBar displays a row of icon-only action buttons: move, add, remove, submit, invalid.
 * @param actions - array of action configs
 */
export type ActionType = 'move' | 'add' | 'remove' | 'submit' | 'invalid';

export interface ActionBarAction {
  type: ActionType;
  onPress: () => void;
  disabled?: boolean;
}

export interface ActionBarProps {
  actions: ActionBarAction[];
}

const ICONS: Record<ActionType, string> = {
  move: '\u2194', // <->
  add: '+',
  remove: '-',
  submit: '\u2713', // ✓
  invalid: '\u00D7', // ×
};

export const ActionBar: React.FC<ActionBarProps> = ({ actions }) => {
  return (
    <View style={styles.container}>
      {actions.map((action, i) => (
        <TouchableOpacity
          key={action.type + i}
          onPress={action.onPress}
          disabled={action.disabled}
          style={[styles.button, action.disabled && styles.disabled]}
          accessibilityLabel={action.type}
        >
          <Text style={[styles.icon, action.disabled && styles.iconDisabled]}>
            {ICONS[action.type]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4FC3F7', // light blue from design
    textAlign: 'center',
  },
  iconDisabled: {
    color: '#B0BEC5',
  },
}); 