export class CustomError extends Error {
  name: string;
  constructor(msg?: string) {
    super(msg);
    this.name = this.constructor.name;
    ({ message: this.message, stack: this.stack } = this);
  }
}

export class CyclicStatesReferencesError extends Error {
  constructor(stateAccessCycle: string[]) {
    super(
      "Cyclic reference found in state initialization: " +
        stateAccessCycle.join(" -> ")
    );
  }
}

export class InvalidOperation extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export class UnknownError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}
