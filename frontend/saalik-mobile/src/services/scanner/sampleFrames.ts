import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled real monument frames for the iOS Simulator / conference-room demo.
 * Tapping one sends the JPEG through POST /api/heritage/scan-image so the
 * live CLIP worker on port 8099 can rank it.
 */
export interface SampleMonumentFrame {
  id: string;
  label: string;
  monumentId: string;
  source: ImageSourcePropType;
}

export const SAMPLE_MONUMENT_FRAMES: SampleMonumentFrame[] = [
  {
    id: 'krishna',
    label: 'Krishna Mandir',
    monumentId: 'pat_krishna_mandir',
    source: require('../../../assets/images/sample_frames/krishna_mandir.jpg'),
  },
  {
    id: 'nyatapola',
    label: 'Nyatapola',
    monumentId: 'bkt_nyatapola',
    source: require('../../../assets/images/sample_frames/nyatapola.jpg'),
  },
  {
    id: 'boudhanath',
    label: 'Boudhanath',
    monumentId: 'bdh_boudha_mahachaitya',
    source: require('../../../assets/images/sample_frames/boudhanath.jpg'),
  },
  {
    id: 'kumari',
    label: 'Kumari Ghar',
    monumentId: 'ktm_kumari_ghar',
    source: require('../../../assets/images/sample_frames/kumari_ghar.jpg'),
  },
];

/** Resolve a bundled require() asset to a base64 JPEG payload (no data: prefix). */
export async function sampleFrameToBase64(source: ImageSourcePropType): Promise<string> {
  const asset = Asset.fromModule(source as number);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Sample frame asset has no local URI');
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}
