import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../AppText';
import { CAPTURE_ANGLE_LABELS, type CaptureAngle } from '../../types/heritage';

const LINE = 'rgba(21, 255, 117, 0.55)';

function ThirdsGrid() {
  return (
    <>
      <View style={[styles.vLine, { left: '33.3%' }]} />
      <View style={[styles.vLine, { left: '66.6%' }]} />
      <View style={[styles.hLine, { top: '33.3%' }]} />
      <View style={[styles.hLine, { top: '66.6%' }]} />
    </>
  );
}

function Guides({ angle }: { angle: CaptureAngle }) {
  switch (angle) {
    case 'ESTABLISHING_FRONT':
      return (
        <>
          <View style={[styles.vLine, { left: '50%' }]} />
          <View style={[styles.hLine, { top: '82%' }]} />
          <View style={styles.silhouetteBox} />
        </>
      );
    case 'LEFT_45':
      return (
        <>
          <ThirdsGrid />
          <View style={[styles.diagonal, { transform: [{ rotate: '-45deg' }] }]} />
        </>
      );
    case 'RIGHT_45':
      return (
        <>
          <ThirdsGrid />
          <View style={[styles.diagonal, { transform: [{ rotate: '45deg' }] }]} />
        </>
      );
    case 'CLOSE_UP_ICONOGRAPHY':
      return (
        <>
          <View style={styles.reticle} />
          <View style={[styles.vLine, { left: '50%', top: '44%', bottom: '44%' }]} />
          <View style={[styles.hLine, { top: '50%', left: '44%', right: '44%' }]} />
        </>
      );
    case 'WIDE_COURTYARD_CONTEXT':
      return (
        <>
          <ThirdsGrid />
          <View style={[styles.hLine, { top: '50%', borderStyle: 'dashed' }]} />
        </>
      );
    default:
      return null;
  }
}

const HINTS: Record<CaptureAngle, string> = {
  ESTABLISHING_FRONT: 'Centre the main axis; keep the full roofline and plinth inside the box.',
  LEFT_45: 'Step 45 degrees to the left; let the facade run along the diagonal.',
  RIGHT_45: 'Step 45 degrees to the right; let the facade run along the diagonal.',
  CLOSE_UP_ICONOGRAPHY: 'Fill the reticle with the deity, strut or inscription. Hold steady.',
  WIDE_COURTYARD_CONTEXT: 'Back up and include neighbouring buildings; horizon on the dashed line.',
};

export function AngleFramingOverlay({ angle, framingNote }: { angle: CaptureAngle; framingNote?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Guides angle={angle} />
      <View style={styles.caption}>
        <AppText style={styles.captionTitle}>{CAPTURE_ANGLE_LABELS[angle]}</AppText>
        <AppText style={styles.captionText}>{framingNote ?? HINTS[angle]}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: LINE },
  hLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: LINE, borderColor: LINE },
  silhouetteBox: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '12%',
    bottom: '18%',
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 8,
  },
  diagonal: { position: 'absolute', left: '-20%', right: '-20%', top: '50%', height: 2, backgroundColor: LINE },
  reticle: {
    position: 'absolute',
    left: '25%',
    right: '25%',
    top: '30%',
    bottom: '30%',
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 12,
  },
  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    gap: 2,
  },
  captionTitle: { color: '#15ff75', fontSize: 14 },
  captionText: { color: '#f8fff4', fontSize: 12 },
});
