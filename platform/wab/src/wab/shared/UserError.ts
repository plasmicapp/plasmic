export class UserError extends Error {
  constructor(public message: string, public description: string) {
    super(message);
  }
}

export class ComponentCycleUserError extends UserError {
  constructor() {
    super(
      "Component cycle detected",
      "You cannot insert a component into itself."
    );
  }
}

export class NestedTplSlotsError extends UserError {
  constructor() {
    super(
      "Nested slots detected",
      "You cannot insert a slot as the default contents of another slot."
    );
  }
}

export class WaitForClipError extends UserError {
  constructor() {
    super(
      "Wait for export",
      "Please wait for the export to complete, then try pasting again."
    );
  }
}
