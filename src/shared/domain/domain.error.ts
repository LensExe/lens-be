export class DomainError extends Error {
  constructor(
    public readonly code:
      'invalid' | 'forbidden' | 'missing' | 'conflict' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

export function ensure(
  condition: unknown,
  message: string,
  code: DomainError['code'] = 'invalid',
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
