'use client';

// Bip curto ("ding-dong") via Web Audio — sem precisar de arquivo de áudio.
// O AudioContext só destrava depois de um gesto do usuário (política de
// autoplay do browser); criamos lazy e damos resume(). Se o browser bloquear,
// falha em silêncio — o badge do sino + o toast já avisam de qualquer forma.
let ctx: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;

    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };

    tone(880, 0, 0.18); // ding
    tone(1174, 0.16, 0.22); // dong
  } catch {
    // Sem som é aceitável — a experiência visual (badge + toast) permanece.
  }
}
