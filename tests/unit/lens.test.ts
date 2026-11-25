import { describe, expect, test } from 'vitest';
import { ultraWide } from '../../src/lib/scanner';

const cam = (label: string, deviceId = label) => ({ kind: 'videoinput', label, deviceId, groupId: '' }) as MediaDeviceInfo;

describe('ultraWide (R7b): the iPhone lens that focuses close, named in the phone language', () => {
  test.each([
    'Back Ultra Wide Camera',
    'Cámara ultra gran angular posterior',
    'Caméra arrière ultra grand-angle',
    'Rückseitige Ultraweitwinkelkamera',
    '背面超広角カメラ',
    '后置超广角摄像头',
    '後置超廣角相機',
    '후면 울트라 와이드 카메라',
    'กล้องอัลตร้าไวด์ด้านหลัง',
    'Задняя сверхширокоугольная камера',
    'Camera góc siêu rộng mặt sau',
  ])('finds %s among the other lenses', (label) => {
    expect(ultraWide([cam('Front Camera'), cam('Back Camera'), cam('Back Triple Camera'), cam(label, 'uw')])).toBe('uw');
  });

  test('never a front lens, a microphone, or an Android camera', () => {
    expect(ultraWide([cam('Front Ultra Wide Camera'), cam('Cámara frontal ultra gran angular'), cam('前置超广角摄像头')])).toBeNull();
    expect(ultraWide([{ kind: 'audioinput', label: 'Ultra mic', deviceId: 'm', groupId: '' } as MediaDeviceInfo])).toBeNull();
    expect(ultraWide([cam('camera2 0, facing back'), cam('camera2 2, facing back')])).toBeNull();
  });
});
