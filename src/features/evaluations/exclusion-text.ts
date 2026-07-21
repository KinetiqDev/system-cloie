const sensitiveOtherExplanationPattern =
  /\b(?:medical|diagnos(?:is|ed)|illness|disease|disability|medication|therapy|treatment|doctor|hospital|disciplin(?:ary|e)|misconduct|suspension|expulsion|cheating|plagiarism|harassment|sanction)\b/i;

export function isNeutralOtherExplanation(value: string) {
  return !sensitiveOtherExplanationPattern.test(value);
}
