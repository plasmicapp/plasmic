export function getInputTypeOptions(type: string) {
  const optionPools = [
    [
      "text",
      "password",
      "hidden",
      "number",
      "date",
      "datetime-local",
      "time",
      "email",
      "tel",
    ],
    ["checkbox", "radio"],
  ];

  for (const pool of optionPools) {
    if (pool.includes(type)) {
      return pool;
    }
  }
  return optionPools[0];
}
