export function cleanMaterialVendorName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeMaterialVendorName(name: string): string {
  return cleanMaterialVendorName(name).toLocaleLowerCase("ko-KR");
}
