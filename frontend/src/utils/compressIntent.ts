/**
 * Girdiyi anlami bozmadan mumkun olan en kisa karaktere sikistirir.
 * - Fazla bosluk, satir sonlari ve tekrarlayan noktalama birlestirilir.
 */
export function compressIntent(text: string): string {
  if (!text || !text.trim()) return text;

  return (
    text
      .trim()
      // Birden fazla boslugu/satir sonunu tek bosluga indir
      .replace(/\s+/g, ' ')
      // Noktalama etrafindaki gereksiz bosluklari kaldir ( . ; : ! ? )
      .replace(/\s*([,.;:!?])\s*/g, '$1 ')
      .replace(/\s+([,.;:!?])\s*/g, '$1 ')
      // Bas/sondaki bosluklari tekrar clear
      .trim()
  );
}
