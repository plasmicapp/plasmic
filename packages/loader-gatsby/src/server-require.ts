let secretRequire: NodeRequire | undefined;
try {
  // Secretly use require without webpack knowing
  secretRequire = eval("require");
} catch (err) {
  secretRequire = undefined;
}

export default function serverRequire(module: string) {
  if (!secretRequire) {
    throw new Error(
      `Unexpected serverRequire() -- can only do this from a Node server!`
    );
  }
  return secretRequire(module);
}
