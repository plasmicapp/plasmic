export default function importAndRetry<T>(
  doImport: () => Promise<T>,
  attemptsLeft = 3
): Promise<T> {
  return new Promise((resolve, reject) => {
    doImport()
      .then(resolve)
      .catch((error) => {
        if (attemptsLeft > 1) {
          setTimeout(() => {
            // Let us retry after 1500 ms
            importAndRetry(doImport, attemptsLeft - 1).then(resolve, reject);
          }, 1500);
        } else {
          // Rejects so we show the error, wait 3s and then refresh the page, as
          // it might be due to a new deploy.
          setTimeout(() => {
            window.location.reload();
          }, 3000);
          reject(error);
          return;
        }
      });
  });
}
