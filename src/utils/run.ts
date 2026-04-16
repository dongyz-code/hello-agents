export async function run(fn: () => any | Promise<any>) {
  try {
    await fn();
    process.exit(0);
  } catch (e) {
    throw e;
  }
}
