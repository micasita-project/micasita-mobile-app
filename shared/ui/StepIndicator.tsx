/**
 * @layer shared/ui
 * @description Componente visual de pasos para wizard/onboarding.
 * Genérico y reutilizable en cualquier flujo multi-paso.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/shared/config/colors';

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  labels?: string[];
}

export function StepIndicator({ totalSteps, currentStep, labels }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <React.Fragment key={step}>
            {/* Connector line (before each step except first) */}
            {i > 0 && (
              <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />
            )}

            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>
                    {step}
                  </Text>
                )}
              </View>
              {labels?.[i] && (
                <Text
                  style={[
                    styles.label,
                    isActive && styles.labelActive,
                    isCompleted && styles.labelCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {labels[i]}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 58,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  circleCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  stepNumActive: {
    color: Colors.textOnPrimary,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textOnPrimary,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 15,
    marginHorizontal: 2,
  },
  connectorCompleted: {
    backgroundColor: Colors.success,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  labelCompleted: {
    color: Colors.success,
  },
});
