/**
 * God Mode output format uyumluluk olcumu.
 * JSON gecerliligi + adim/example varligi (uzunluk ve yapi kontrolleri).
 */

export interface GodModeCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface GodModeValidationResult {
  passed: boolean;
  score: number; // 0–100
  checks: GodModeCheck[];
}

/** Ciktida JSON blok gecerliligi (opsiyonel: gecerli JSON parse edilebiliyor mu) */
function checkJsonValidity(output: string): GodModeCheck {
  const jsonBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!jsonBlockMatch) {
    return {
      id: 'json_block',
      label: 'JSON block presence',
      passed: true,
      detail: 'No JSON block required; skipped',
    };
  }
  try {
    const block = jsonBlockMatch[1];
    if (block === undefined) return { id: 'json_valid', label: 'JSON validity', passed: false, detail: 'No JSON block' };
    JSON.parse(block.trim());
    return { id: 'json_valid', label: 'JSON validity', passed: true, detail: 'Valid JSON' };
  } catch {
    return {
      id: 'json_valid',
      label: 'JSON validity',
      passed: false,
      detail: 'JSON block found but parse failed',
    };
  }
}

/** Adim yapisi: "1. Adim" / "2. Adim" veya "Step 1" / "Step 2" vb. */
function checkStepPresence(output: string): GodModeCheck {
  const stepPatterns = [
    /\b[1-9]\.\s*Adim\b/i,
    /\b(?:Adim|Step)\s*[1-9]\b/i,
    /^#{1,3}\s*.*[1-9]\.\s*(?:Adim|Step)/im,
  ];
  const hasStep = stepPatterns.some(p => p.test(output));
  return {
    id: 'step_structure',
    label: 'Step structure (1. Adim / Step 1)',
    passed: hasStep,
    detail: hasStep ? 'Step markers found' : 'No step markers found',
  };
}

/** Example varligi: "Example 1:" / "Example 2:" veya "Example 1" / "Example 2" */
function checkExamplePresence(output: string): GodModeCheck {
  const examplePatterns = [
    /\bOrnek\s*[1-9]\s*[:.]/i,
    /\bExample\s*[1-9]\s*[:.]/i,
    /(?:Example|Example)\s*[1-9]\b/i,
  ];
  const hasExample = examplePatterns.some(p => p.test(output));
  return {
    id: 'example_structure',
    label: 'Example presence (Example 1: / Example 1)',
    passed: hasExample,
    detail: hasExample ? 'Example markers found' : 'No example markers found',
  };
}

/** Minimum uzunluk (God Mode ciktilari genelde zengin olmali) */
function checkMinLength(output: string, minLen: number = 200): GodModeCheck {
  const passed = output.length >= minLen;
  return {
    id: 'min_length',
    label: `Min length ${minLen} chars`,
    passed,
    detail: `${output.length} chars`,
  };
}

/**
 * God Mode output format uyumlulugunu degerlendirir.
 * JSON validity + adim/example varligi + min length.
 */
export function validateGodModeOutput(
  output: string,
  options: { requireSteps?: boolean; requireExamples?: boolean; minLength?: number } = {}
): GodModeValidationResult {
  const checks: GodModeCheck[] = [];
  checks.push(checkJsonValidity(output));
  checks.push(checkStepPresence(output));
  checks.push(checkExamplePresence(output));
  checks.push(checkMinLength(output, options.minLength ?? 200));

  const stepCheck = checks.find(c => c.id === 'step_structure')!;
  const exampleCheck = checks.find(c => c.id === 'example_structure')!;
  if (options.requireSteps && !stepCheck.passed) {
    stepCheck.passed = false;
    stepCheck.detail = 'Required for God Mode';
  }
  if (options.requireExamples && !exampleCheck.passed) {
    exampleCheck.passed = false;
    exampleCheck.detail = 'Required for God Mode';
  }

  const passedCount = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;
  // Zorunlu: minLength + (JSON varsa gecerli). Adim/example yoksa sadece skoru dusurur, gecisi kirmaz.
  const minLenCheck = checks.find(c => c.id === 'min_length');
  const jsonCheck = checks.find(c => c.id === 'json_valid' || c.id === 'json_block');
  const requiredPassed = [minLenCheck, jsonCheck].every(c => !c || c.passed);
  const passed =
    requiredPassed &&
    (options.requireSteps ? stepCheck.passed : true) &&
    (options.requireExamples ? exampleCheck.passed : true);

  return { passed, score, checks };
}
