type Interaction = {
  actionName: string;
  args: {
    variable: string[];
    operation: Operations;
    value?: string;
  };
};

// eslint-disable-next-line no-shadow
enum Operations {
  NEW_VALUE = 0,
  CLEAR_VALUE,
}

export { Interaction, Operations };
