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
