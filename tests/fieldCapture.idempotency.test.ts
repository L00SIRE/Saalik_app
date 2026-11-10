import { FieldCaptureService } from '../src/server/services/fieldCapture.service';

describe('offline field-capture batch upsert idempotency', () => {
  let service: FieldCaptureService;

  beforeEach(() => {
    service = new FieldCaptureService();
  });

  const baseCapture = {
    clientCaptureId: 'cap_ktm_kasthamandap_front_001',
    monumentCode: 'ktm_kasthamandap',
    zoneCode: 'kathmandu_durbar',
    angle: 'ESTABLISHING_FRONT' as const,
    photoUri: 'file:///captures/ktm_kasthamandap_front_001.jpg',
    latitude: 27.7039,
    longitude: 85.3058,
    gpsAccuracyM: 7,
    lightingTag: 'DIRECT_SUN' as const,
    notes: 'Open pavilion from Maru',
    capturedAt: '2026-11-10T08:15:00.000Z',
  };

  test('first upsert creates a PENDING record', () => {
    const result = service.upsert(baseCapture);
    expect(result.created).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.record.status).toBe('PENDING');
    expect(result.record.payloadHash).toHaveLength(64);
    expect(service.size()).toBe(1);
  });

  test('identical re-upsert is a no-op duplicate', () => {
    service.upsert(baseCapture);
    const again = service.upsert({ ...baseCapture });
    expect(again.created).toBe(false);
    expect(again.updated).toBe(false);
    expect(again.duplicate).toBe(true);
    expect(service.size()).toBe(1);
  });

  test('batch upsert of the same clientCaptureId twice only stores one row', () => {
    const batch = service.batchUpsert([baseCapture, { ...baseCapture }, { ...baseCapture }]);
    expect(batch.created).toBe(1);
    expect(batch.duplicates).toBe(2);
    expect(batch.updated).toBe(0);
    expect(service.size()).toBe(1);
    expect(service.list()).toHaveLength(1);
  });

  test('same clientCaptureId with changed notes updates while PENDING', () => {
    service.upsert(baseCapture);
    const updated = service.upsert({
      ...baseCapture,
      notes: 'Revised note after custodian tip',
    });
    expect(updated.updated).toBe(true);
    expect(updated.duplicate).toBe(false);
    expect(updated.record.notes).toBe('Revised note after custodian tip');
    expect(service.size()).toBe(1);
  });

  test('after markUploaded, conflicting payload is rejected as duplicate', () => {
    service.upsert(baseCapture);
    service.markUploaded(baseCapture.clientCaptureId, 'srv_abc');
    const conflict = service.upsert({
      ...baseCapture,
      notes: 'should not overwrite uploaded',
    });
    expect(conflict.duplicate).toBe(true);
    expect(conflict.updated).toBe(false);
    expect(conflict.record.status).toBe('UPLOADED');
    expect(conflict.record.notes).toBe('Open pavilion from Maru');
  });

  test('batch of distinct captures creates one row each and replaying the batch is idempotent', () => {
    const captures = [
      baseCapture,
      {
        ...baseCapture,
        clientCaptureId: 'cap_ktm_kasthamandap_left_001',
        angle: 'LEFT_45' as const,
        photoUri: 'file:///captures/ktm_kasthamandap_left_001.jpg',
      },
      {
        ...baseCapture,
        clientCaptureId: 'cap_ktm_trailokya_front_001',
        monumentCode: 'ktm_trailokya_mohan',
        angle: 'ESTABLISHING_FRONT' as const,
        photoUri: 'file:///captures/ktm_trailokya_front_001.jpg',
        latitude: 27.7041,
        longitude: 85.3064,
      },
    ];

    const first = service.batchUpsert(captures);
    expect(first.created).toBe(3);
    expect(service.size()).toBe(3);

    const replay = service.batchUpsert(captures);
    expect(replay.created).toBe(0);
    expect(replay.duplicates).toBe(3);
    expect(service.size()).toBe(3);
  });
});
