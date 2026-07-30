export function reportFileName(orderId: string) {
  const safeOrderId = orderId.replace(/[^a-z0-9_-]+/gi, '-');
  return `Heritage-${safeOrderId || 'Report'}.pdf`;
}

// Cross-origin links often ignore the HTML `download` attribute. Fetching the PDF
// into a Blob first makes the browser save it instead of navigating away.
export async function downloadPdf(url: string, fileName: string, _description: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download_http_${response.status}`);
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
  return fileName;
}
