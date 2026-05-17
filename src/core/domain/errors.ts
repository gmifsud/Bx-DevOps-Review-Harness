export class DomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NetworkError extends DomainError {
  constructor(message: string) {
    super('NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }
}

export class ConfigError extends DomainError {
  constructor(message: string) {
    super('CONFIG_ERROR', message);
    this.name = 'ConfigError';
  }
}

export class AmbiguousMatchError extends DomainError {
  constructor(message: string) {
    super('AMBIGUOUS_MATCH_ERROR', message);
    this.name = 'AmbiguousMatchError';
  }
}

export class MergeError extends DomainError {
  constructor(message: string) {
    super('MERGE_ERROR', message);
    this.name = 'MergeError';
  }
}

export class PatchNotFoundError extends DomainError {
  constructor(message: string) {
    super('PATCH_NOT_FOUND_ERROR', message);
    this.name = 'PatchNotFoundError';
  }
}
