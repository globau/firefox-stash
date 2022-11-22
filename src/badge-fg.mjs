export async function notify() {
  await browser.runtime.sendMessage({ event: "update-badge" });
}
