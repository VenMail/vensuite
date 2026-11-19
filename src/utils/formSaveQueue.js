export function createSaveQueue() {
  let tail = Promise.resolve();
  return (task) => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };
}
