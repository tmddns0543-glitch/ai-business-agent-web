import SalesPlatformForm from "@/components/sales/sales-platform-form";
import { BAEMIN_CONFIG } from "@/data/sales-platforms";

export default function BaeminSalesPage() {
  return <SalesPlatformForm config={BAEMIN_CONFIG} />;
}