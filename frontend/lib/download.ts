/**
 * lib/download.ts
 * ===============
 * Browser-only helper for saving generated text as a file. Client components
 * only: it is a no-op during SSR.
 */

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
